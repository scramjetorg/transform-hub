import { randomUUID } from "crypto";
import { Readable, Writable } from "stream";

import { ManifestDeclareResultSchema, snapshotManifestDeclaration } from "@scramjet/rest-api2";
import type { ManifestDeclaration, ManifestReceipt } from "@scramjet/runtime-types";
import type { StopSequenceMessageData } from "@scramjet/runtime-types";
import { RunnerMessageCode } from "@scramjet/symbols";

import { MessageUtils } from "./message-utils";
import type { ControlDispatch } from "./types";

type PendingDeclaration = {
    resolve(receipt: ManifestReceipt): void;
    reject(error: Error): void;
};

type ControlFrame = [number, unknown];

/** Run initialization until it completes or existing lifecycle shutdown wins. */
export async function awaitInitializerOrTerminal(
    initialize: () => unknown,
    terminal: Promise<unknown>,
    isTerminal: () => boolean
): Promise<boolean> {
    if (isTerminal()) return false;
    const initialization = Promise.resolve().then(() => {
        if (isTerminal()) return { terminal: true };
        return Promise.resolve(initialize()).then(() => ({ terminal: false }));
    });

    try {
        const completed = await Promise.race([initialization, terminal.then(() => ({ terminal: true }))]);
        return !completed.terminal && !isTerminal();
    } catch (error) {
        if (isTerminal()) return false;
        throw error;
    }
}

function errorFromResult(data: { error: { code: string; message: string; path?: string } }): Error {
    const error = new Error(data.error.message) as Error & { code?: string; path?: string };
    error.name = "ManifestDeclarationError";
    error.code = data.error.code;
    error.path = data.error.path;
    return error;
}

/**
 * Owns the single control-channel reader during initialization and later
 * declarations. Manifest replies settle immediately; ordinary controls are
 * retained in arrival order until the runtime's normal dispatcher is active.
 */
export class ManifestDeclarationSession {
    private buffer = "";
    private readonly pending = new Map<string, PendingDeclaration>();
    private readonly deferredControls: ControlFrame[] = [];
    private dispatch?: ControlDispatch;
    private earlyKillHandler?: () => void;
    private earlyStopHandler?: (data: StopSequenceMessageData) => Promise<boolean> | boolean;
    private terminalHandler?: () => void;
    private closed = false;
    private terminal = false;

    private readonly onData = (chunk: string | Buffer): void => {
        this.buffer += chunk.toString();
        let newline = this.buffer.indexOf("\n");

        while (newline !== -1) {
            const line = this.buffer.slice(0, newline).replace(/\r$/, "");
            this.buffer = this.buffer.slice(newline + 1);
            newline = this.buffer.indexOf("\n");
            if (line.length === 0) continue;

            let frame: unknown;
            try {
                frame = JSON.parse(line);
            } catch (error) {
                this.logger?.warn("control: invalid JSON frame", error);
                continue;
            }
            this.receiveFrame(frame);
        }
    };

    private readonly onEnd = (): void => this.terminate(new Error("Manifest declaration session ended"));
    private readonly onClose = (): void => this.terminate(new Error("Manifest declaration session closed"));
    private readonly onError = (error: Error): void => {
        this.logger?.warn("control: stream error", error);
        this.terminate(error);
    };

    constructor(
        private readonly controlIn: Readable,
        private readonly monitoringOut: Writable,
        private readonly logger?: { warn(message: string, ...args: unknown[]): void }
    ) {
        controlIn.setEncoding("utf8");
        controlIn.on("data", this.onData);
        controlIn.on("end", this.onEnd);
        controlIn.on("close", this.onClose);
        controlIn.on("error", this.onError);
    }

    declare(input: unknown): Promise<ManifestReceipt> {
        let declaration: ManifestDeclaration;
        try {
            declaration = snapshotManifestDeclaration(input);
        } catch (error) {
            return Promise.reject(error);
        }

        if (this.closed) return Promise.reject(new Error("Manifest declaration session is closed"));

        const requestId = randomUUID();
        return new Promise<ManifestReceipt>((resolve, reject) => {
            this.pending.set(requestId, { resolve, reject });
            try {
                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.MANIFEST_DECLARE, { requestId, declaration }],
                    this.monitoringOut
                );
            } catch (error) {
                this.pending.delete(requestId);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** Activate ordinary control handling and replay all deferred frames in order. */
    activate(dispatch: ControlDispatch): void {
        if (this.closed) return;
        this.dispatch = dispatch;
        while (this.deferredControls.length > 0) {
            const frame = this.deferredControls.shift();
            if (frame) this.dispatchControl(frame, dispatch);
        }
    }

    setEarlyKillHandler(handler: () => void): void {
        this.earlyKillHandler = handler;
    }

    setEarlyStopHandler(handler: (data: StopSequenceMessageData) => Promise<boolean> | boolean): void {
        this.earlyStopHandler = handler;
    }

    setTerminalHandler(handler: () => void): void {
        this.terminalHandler = handler;
        if (this.isTerminal) handler();
    }

    /** Reject pending declarations and detach every listener owned by this session. */
    close(reason: Error = new Error("Manifest declaration session closed")): void {
        if (this.closed) return;
        this.closed = true;
        for (const request of this.pending.values()) request.reject(reason);
        this.pending.clear();
        this.deferredControls.length = 0;
        this.dispatch = undefined;
        this.earlyKillHandler = undefined;
        this.earlyStopHandler = undefined;
        this.terminalHandler = undefined;
        this.controlIn.removeListener("data", this.onData);
        this.controlIn.removeListener("end", this.onEnd);
        this.controlIn.removeListener("close", this.onClose);
        this.controlIn.removeListener("error", this.onError);
    }

    terminate(reason: Error): void {
        if (this.closed) return;
        this.terminal = true;
        this.terminalHandler?.();
        this.close(reason);
    }

    get isTerminal(): boolean {
        return this.terminal || this.closed;
    }

    private receiveFrame(frame: unknown): void {
        if (!Array.isArray(frame) || frame.length !== 2 || typeof frame[0] !== "number") return;
        const [code, data] = frame as ControlFrame;

        if (code === RunnerMessageCode.MANIFEST_RESULT) {
            this.receiveResult(data);
            return;
        }

        if (code === RunnerMessageCode.KILL) {
            const wasDeferred = !this.dispatch;
            const killHandler = this.earlyKillHandler;
            const dispatch = this.dispatch;
            this.terminate(new Error("Manifest declaration cancelled by runtime KILL"));
            if (wasDeferred && killHandler) killHandler();
            else if (dispatch) this.dispatchControl([code, data], dispatch);
            return;
        }

        if (code === RunnerMessageCode.STOP && !this.dispatch && this.earlyStopHandler) {
            void Promise.resolve(this.earlyStopHandler(data as StopSequenceMessageData)).then((terminal) => {
                if (terminal) {
                    this.terminate(new Error("Manifest declaration cancelled by terminal runtime STOP"));
                }
            }).catch((error) => this.logger?.warn("control: early STOP handler failed", error));
            return;
        }

        if (this.dispatch) this.dispatchControl([code, data], this.dispatch);
        else this.deferredControls.push([code, data]);
    }

    private receiveResult(data: unknown): void {
        const requestId = data && typeof data === "object" ? (data as { requestId?: unknown }).requestId : undefined;
        if (typeof requestId !== "string") return;
        const pending = this.pending.get(requestId);
        if (!pending) return;
        this.pending.delete(requestId);

        const parsed = ManifestDeclareResultSchema.safeParse(data);
        if (!parsed.success) {
            pending.reject(new Error("Host returned an invalid manifest declaration result"));
        } else if (parsed.data.accepted) {
            pending.resolve(parsed.data.receipt);
        } else {
            pending.reject(errorFromResult(parsed.data));
        }
    }

    private dispatchControl([code, data]: ControlFrame, dispatch: ControlDispatch): void {
        switch (code) {
            case RunnerMessageCode.STOP:
                void dispatch.onStop(data as Parameters<ControlDispatch["onStop"]>[0]);
                break;
            case RunnerMessageCode.KILL:
                void dispatch.onKill();
                break;
            case RunnerMessageCode.EVENT:
                dispatch.onEvent(data as Parameters<ControlDispatch["onEvent"]>[0]);
                break;
            case RunnerMessageCode.SET:
                dispatch.onSet(data as Parameters<ControlDispatch["onSet"]>[0]);
                break;
            case RunnerMessageCode.STORAGE:
                dispatch.onStorage(data as Parameters<ControlDispatch["onStorage"]>[0]);
                break;
            case RunnerMessageCode.STORAGE_UPDATE:
                dispatch.onStorageUpdate(data as Parameters<ControlDispatch["onStorageUpdate"]>[0]);
                break;
            default:
                break;
        }
    }
}

import { closeSync, constants as fsConstants, openSync, writeSync } from "fs";
import { PassThrough, Readable, Writable } from "stream";

import type { ObjLogger } from "@scramjet/obj-logger";
import type {
    EncodedControlMessage,
    EncodedMonitoringMessage,
    EventMessageData,
    StopSequenceMessageData,
    StorageUpdateMessageData,
} from "@scramjet/runtime-types";
import { RunnerMessageCode, CommunicationChannel as CC } from "@scramjet/symbols";

import { MessageUtils } from "./message-utils";
import type { RunSequenceHostClient } from "./run-sequence";
import type { ControlDispatch, SequenceFunction, SequenceModule } from "./types";

let exitFileWritten = false;

export const RUNNER_NODE_CHANNELS: ReadonlySet<CC> = new Set<CC>([
    CC.IN, CC.OUT, CC.LOG, CC.REQUESTS,
]);

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function legacyExitFilePath(pid: number = process.pid): string {
    return `/tmp/runner-${pid.toString()}`;
}

export function writeLegacyExitFileSecure(
    path: string,
    code: number,
    logger?: { warn: (...args: unknown[]) => void }
): boolean {
    const noFollow = typeof (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW === "number"
        ? (fsConstants as { O_NOFOLLOW: number }).O_NOFOLLOW
        : 0;
    const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | noFollow;

    let fd: number | undefined;

    try {
        fd = openSync(path, flags, 0o600);
        writeSync(fd, code.toString());
        return true;
    } catch (err) {
        logger?.warn("runner-node: legacy exit-file write skipped", { path, err });
        return false;
    } finally {
        if (fd !== undefined) {
            try {
                closeSync(fd);
            } catch (err) {
                logger?.warn("runner-node: legacy exit-file close skipped", { path, err });
            }
        }
    }
}

export function writeProcessExitFile(code: number): void {
    if (exitFileWritten) return;
    exitFileWritten = true;
    writeLegacyExitFileSecure(legacyExitFilePath(), code);
}

export function resolveSequenceFunctions(mod: SequenceModule): SequenceFunction[] {
    let candidate: unknown = mod;

    if (isObject(candidate) && "default" in candidate) {
        const next = candidate.default;

        if (next !== undefined) candidate = next;
    }

    if (Array.isArray(candidate)) {
        return candidate.filter((fn): fn is SequenceFunction => typeof fn === "function");
    }

    if (typeof candidate === "function") {
        return [candidate as SequenceFunction];
    }

    return [];
}

export function loadSequenceModule(sequencePath: string): SequenceFunction[] {
    const loaded: SequenceModule = require(sequencePath);

    return resolveSequenceFunctions(loaded);
}

export function writeMonitoring(monitor: Writable, msg: EncodedMonitoringMessage): void {
    MessageUtils.writeMessageOnStream(msg, monitor);
}

export function wireControlStream(
    controlIn: Readable,
    dispatch: ControlDispatch,
    logger?: ObjLogger
): void {
    let buffer = "";

    controlIn.setEncoding("utf8");
    controlIn.on("data", chunk => {
        buffer += chunk;

        let nlIndex = buffer.indexOf("\n");

        while (nlIndex !== -1) {
            const line = buffer.slice(0, nlIndex).replace(/\r$/, "");

            buffer = buffer.slice(nlIndex + 1);
            nlIndex = buffer.indexOf("\n");

            if (line.length === 0) continue;

            let parsed: EncodedControlMessage;

            try {
                parsed = JSON.parse(line) as EncodedControlMessage;
            } catch (err) {
                logger?.warn("control: invalid JSON frame", err);
                continue;
            }

            const [code, data] = parsed;

            switch (code) {
                case RunnerMessageCode.STOP:
                    void dispatch.onStop(data as StopSequenceMessageData);
                    break;
                case RunnerMessageCode.KILL:
                    void dispatch.onKill();
                    break;
                case RunnerMessageCode.EVENT:
                    dispatch.onEvent(data as EventMessageData);
                    break;
                case RunnerMessageCode.STORAGE:
                    dispatch.onStorage(data as { values: Record<string, string> });
                    break;
                case RunnerMessageCode.STORAGE_UPDATE:
                    dispatch.onStorageUpdate(data as StorageUpdateMessageData);
                    break;
                default:
                    break;
            }
        }
    });
    controlIn.on("error", err => logger?.warn("control: stream error", err));
}

export function makeOutputDiscard(): RunSequenceHostClient["outputStream"] {
    const sink = new PassThrough();

    sink.resume();
    return sink as unknown as RunSequenceHostClient["outputStream"];
}

import { InstanceStatus, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { StopSequenceMessageData, WritableStream } from "@scramjet/types";

import { MessageUtils } from "./message-utils";

/**
 * Minimal context surface that {@link RunnerLifecycle} needs from the
 * sequence runtime. Mirrors the legacy `Runner.context.stopHandler` and
 * `Runner.context.killHandler` contract.
 */
export interface LifecycleContext {
    stopHandler(timeout: number, canCallKeepalive: boolean): Promise<void>;
    killHandler(): void;
}

/**
 * Dependencies injected into {@link RunnerLifecycle} so the helper stays
 * transport-agnostic and does not depend on the full HostClient.
 */
export interface LifecycleDeps {
    context: LifecycleContext;
    monitorStream: WritableStream<any>;
    logger?: {
        debug(msg: string, ...args: any[]): void;
        warn(msg: string, ...args: any[]): void;
        info(msg: string, ...args: any[]): void;
        error(msg: string, ...args: any[]): void;
    };
    onStatusChange?: (status: InstanceStatus) => void;
    onExit?: (exitCode: RunnerExitCode) => void;
}

/**
 * Focused lifecycle helper that ports the STOP / keepAlive / KILL behaviour
 * from the legacy `Runner` (packages/runner/src/runner.ts ~482-529).
 *
 * State rules (legacy parity):
 * - `handleStopRequest` resets `keepAliveRequested`, calls `context.stopHandler`,
 *   captures any error as `sequenceError`, emits `SEQUENCE_STOPPED` unless
 *   `canCallKeepalive && keepAliveRequested`, then marks `stopExpected = true`.
 * - `keepAliveIssued` sets `keepAliveRequested = true`.
 * - `handleKillRequest` invokes `context.killHandler()`. If `stopExpected` is false
 *   the runner is exiting unexpectedly (KILLING → KILLED); otherwise it is an
 *   expected exit (STOPPING → STOPPED).
 * - `cleanup` clears any timers that were registered.
 */
export class RunnerLifecycle {
    private keepAliveRequested = false;
    private stopExpected = false;
    private monitoringInterval?: NodeJS.Timeout;
    private monitoringMessageReplyTimeout?: NodeJS.Timeout;

    constructor(private deps: LifecycleDeps) {}

    keepAliveIssued(): void {
        this.keepAliveRequested = true;
    }

    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        this.keepAliveRequested = false;

        let sequenceError: Error | undefined;

        try {
            await this.deps.context.stopHandler(data.timeout, data.canCallKeepalive);
        } catch (err) {
            sequenceError = err as Error;
            this.deps.logger?.error("Error stopping Sequence", err);
        }

        if (!data.canCallKeepalive || !this.keepAliveRequested) {
            this.deps.onStatusChange?.(InstanceStatus.STOPPING);

            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }],
                this.deps.monitorStream
            );
        }

        this.stopExpected = true;
    }

    async handleKillRequest(): Promise<void> {
        this.deps.logger?.debug("Handling KILL request");

        this.deps.context.killHandler();

        if (!this.stopExpected) {
            this.deps.logger?.warn(`Exiting (unexpected, ${RunnerExitCode.KILLED})`);
            this.deps.onStatusChange?.(InstanceStatus.KILLING);
            this.deps.onExit?.(RunnerExitCode.KILLED);
            return;
        }

        this.deps.logger?.info("Exiting (expected)");
        this.deps.onStatusChange?.(InstanceStatus.STOPPING);
        this.deps.onExit?.(RunnerExitCode.STOPPED);
    }

    setMonitoringInterval(interval: NodeJS.Timeout): void {
        this.monitoringInterval = interval;
    }

    setMonitoringMessageReplyTimeout(timeout: NodeJS.Timeout): void {
        this.monitoringMessageReplyTimeout = timeout;
    }

    cleanup(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        if (this.monitoringMessageReplyTimeout) {
            clearTimeout(this.monitoringMessageReplyTimeout);
            this.monitoringMessageReplyTimeout = undefined;
        }
    }

    get isStopExpected(): boolean {
        return this.stopExpected;
    }

    get isKeepAliveRequested(): boolean {
        return this.keepAliveRequested;
    }
}

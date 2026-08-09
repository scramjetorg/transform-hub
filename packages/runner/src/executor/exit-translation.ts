import { Writable } from "stream";
import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";

/**
 * Result of translating a child process `close` event into runner-domain
 * lifecycle terms. Uses only existing {@link RunnerExitCode} and
 * {@link RunnerMessageCode} values - no new enum members are introduced.
 */
export interface TranslatedChildClose {
    /** Mapped {@link RunnerExitCode} the outer runner should report. */
    exitCode: RunnerExitCode;
    /**
     * Terminal monitoring frame code:
     *   - {@link RunnerMessageCode.SEQUENCE_COMPLETED} on a clean exit
     *   - {@link RunnerMessageCode.SEQUENCE_STOPPED} otherwise
     */
    messageCode: RunnerMessageCode;
    /** Set when the child closed abnormally; `undefined` on clean exit. */
    sequenceError?: {
        message: string;
        exitCode: number | null;
        signal: NodeJS.Signals | null;
    };
}

/**
 * Translate a Node `child.on("close", (code, signal) => ...)` payload into
 * a `RunnerExitCode` + `RunnerMessageCode` pair.
 *
 * `close` is the correct ordering barrier here, not `exit`: Node guarantees
 * `close` fires only after the process has ended **and** all stdio streams
 * have been closed, and always after `exit` / spawn-error. Callers should
 * await `close` so previously-piped stdout/stderr bytes are observed before
 * the resulting terminal monitoring frame is emitted.
 */
export function translateChildClose(
    code: number | null,
    signal: NodeJS.Signals | null
): TranslatedChildClose {
    if (signal !== null) {
        const exitCode =
            signal === "SIGKILL" ? RunnerExitCode.KILLED :
                signal === "SIGTERM" ? RunnerExitCode.STOPPED :
                    RunnerExitCode.DISCONNECTED;

        return {
            exitCode,
            messageCode: RunnerMessageCode.SEQUENCE_STOPPED,
            sequenceError: {
                message: `Child terminated by signal ${signal}`,
                exitCode: code,
                signal
            }
        };
    }

    if (code === 0) {
        return {
            exitCode: RunnerExitCode.SUCCESS,
            messageCode: RunnerMessageCode.SEQUENCE_COMPLETED
        };
    }

    const knownExitCodes = new Set<number>(
        Object.values(RunnerExitCode).filter(
            (v): v is number => typeof v === "number"
        )
    );
    const mapped: RunnerExitCode = code !== null && knownExitCodes.has(code)
        ? (code as RunnerExitCode)
        : RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;

    return {
        exitCode: mapped,
        messageCode: RunnerMessageCode.SEQUENCE_STOPPED,
        sequenceError: {
            message: `Child exited with code ${code ?? "null"}`,
            exitCode: code,
            signal: null
        }
    };
}

/**
 * Write a terminal lifecycle monitoring frame using the existing
 * `MessageUtils.writeMessageOnStream` wire format (`JSON.stringify([code,
 * payload]) + "\r\n"`). Scoped here to keep the executor slice additive and
 * free of any new framing protocol.
 *
 * Returns `true` if the frame was queued for write; `false` if the stream
 * was not writable (e.g. already destroyed).
 */
export function writeTerminalLifecycleFrame(
    monitoring: Writable,
    translated: TranslatedChildClose
): boolean {
    if (!monitoring.writable) return false;

    const payload = {
        exitCode: translated.exitCode,
        ...(translated.sequenceError ? { sequenceError: translated.sequenceError } : {})
    };
    const line = JSON.stringify([translated.messageCode, payload]) + "\r\n";

    return monitoring.write(line);
}

const { spawn } = require("child_process");

function spawnOwnedProcess(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = (options.spawnFactory || spawn)(command, args, { env: options.env, detached: true });
        const timeoutMs = options.timeoutMs ?? 30_000;
        const marker = options.successMarker;
        let output = "";
        let markerSeen = !marker;
        let termSent = false;
        let timedOut = false;
        let settled = false;
        let timeoutTimer;
        let killTimer;
        let markerTimer;
        let groupConfirmTimer;
        let groupDeadlineTimer;
        let closeInfo;
        let groupConfirmStarted;

        const append = value => {
            output = `${output}${String(value)}`.slice(-4096);
            if (marker && output.includes(marker)) markerSeen = true;
        };
        const signalGroup = signal => {
            if (!child.pid) return;
            try {
                process.kill(-child.pid, signal);
            } catch {
                child.kill(signal);
            }
        };
        const terminate = () => {
            if (termSent) return;
            termSent = true;
            signalGroup("SIGTERM");
            killTimer = setTimeout(() => signalGroup("SIGKILL"), 1000);
            groupDeadlineTimer = setTimeout(() => {
                finish(diagnostic(`owned process group did not close by the absolute TERM/KILL deadline (leader status=${closeInfo?.code ?? "null"}, signal=${closeInfo?.signal ?? "null"})`));
            }, 2_000);
        };
        const finish = error => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutTimer);
            if (killTimer) clearTimeout(killTimer);
            if (markerTimer) clearTimeout(markerTimer);
            if (groupConfirmTimer) clearTimeout(groupConfirmTimer);
            if (groupDeadlineTimer) clearTimeout(groupDeadlineTimer);
            error ? reject(error) : resolve();
        };
        const diagnostic = message => new Error(`${message}; output: ${output.slice(-4096)}`);

        timeoutTimer = setTimeout(() => {
            timedOut = true;
            terminate();
        }, timeoutMs);

        const groupGone = () => {
            if (!child.pid) return true;
            try {
                process.kill(-child.pid, 0);
                return false;
            } catch (error) {
                return error?.code === "ESRCH";
            }
        };
        const confirmGroupClose = () => {
            if (groupGone()) {
                const { code, signal } = closeInfo;
                if (timedOut) {
                    finish(diagnostic(`process timed out after ${timeoutMs}ms (status=${code ?? "null"}, signal=${signal ?? "null"})`));
                } else if (markerSeen && ((code === 0 && !signal) || (termSent && code === null && (signal === "SIGTERM" || signal === "SIGKILL")))) {
                    finish();
                } else {
                    finish(diagnostic(`process exited unsuccessfully (status=${code ?? "null"}, signal=${signal ?? "null"})`));
                }
                return;
            }
            if (!termSent) terminate();
            if (Date.now() - groupConfirmStarted >= 2_000) {
                finish(diagnostic(`owned process group remained alive after TERM/KILL (leader status=${closeInfo.code ?? "null"}, signal=${closeInfo.signal ?? "null"})`));
                return;
            }
            groupConfirmTimer = setTimeout(confirmGroupClose, 25);
        };

        child.stdout?.on("data", data => {
            append(data);
            options.onStdout?.(output, value => child.stdin?.write(value));
            if (markerSeen && !markerTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = undefined;
                markerTimer = setTimeout(terminate, 100);
            }
        });
        child.stderr?.on("data", append);
        child.on("error", error => finish(error));
        child.on("close", (code, signal) => {
            closeInfo = { code, signal };
            groupConfirmStarted = Date.now();
            confirmGroupClose();
        });
    });
}

module.exports = { spawnOwnedProcess };

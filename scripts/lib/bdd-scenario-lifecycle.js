/** Explicit owner for resources created by one BDD scenario. */
class ScenarioLifecycle {
    constructor(registry, options = {}) {
        this.registry = registry;
        this.graceMs = options.graceMs ?? 10000;
        this.resources = new Set();
    }

    ownChild(child, label, options = {}) {
        if (!child || !child.pid) return child;
        this.registry.trackChildProcess(child, label);
        this.resources.add({
            kind: "child",
            child,
            label,
            group: options.group === true,
            onStop: typeof options.onStop === "function" ? options.onStop : null
        });
        return child;
    }

    ownProcess(pid, label, options = {}) {
        if (!pid) return pid;
        this.registry.trackProcess(pid, label);
        this.resources.add({
            kind: "pid",
            pid,
            label,
            group: options.group === true,
            onStop: typeof options.onStop === "function" ? options.onStop : null
        });
        return pid;
    }

    ownContainer(containerId, label, stop) {
        if (!containerId) return containerId;
        this.registry.trackContainer(containerId, label);
        this.resources.add({ kind: "container", containerId, label, stop });
        return containerId;
    }

    async stop(target) {
        const resource = [...this.resources].find((candidate) => candidate.child === target || candidate.pid === target || candidate.containerId === target);
        if (!resource) return;
        await this.cleanupResource(resource);
        this.resources.delete(resource);
    }

    expect(target) {
        const resource = [...this.resources].find((candidate) => candidate.child === target || candidate.pid === target || candidate.containerId === target);
        if (!resource) return false;
        if (resource.kind === "container") this.registry.markContainersAsExpectedToExit([resource.containerId]);
        else {
            const pid = resource.pid || resource.child?.pid;
            if (pid) this.registry.markProcessesAsExpectedToExit([pid]);
        }
        return true;
    }

    ready(target) {
        const resource = [...this.resources].find((candidate) => candidate.child === target || candidate.pid === target);
        const pid = resource?.pid || resource?.child?.pid;
        if (pid) this.registry.recordProcessReady(pid);
        return target;
    }

    unexpectedExitRecords() {
        const pids = new Set([...this.resources].map((resource) => resource.pid || resource.child?.pid).filter(Boolean));
        return typeof this.registry.getUnexpectedExitRecords === "function" ? this.registry.getUnexpectedExitRecords().filter((record) => pids.has(record.pid)) : [];
    }

    async cleanup() {
        const errors = [];
        const owned = [...this.resources];
        await Promise.all(
            owned.map(async (resource) => {
                try {
                    await this.cleanupResource(resource);
                    this.resources.delete(resource);
                } catch (error) {
                    errors.push(error instanceof Error ? error : new Error(String(error)));
                }
            })
        );

        if (errors.length) {
            const aggregate = new Error(`Scenario lifecycle cleanup failed for ${errors.length} resource(s): ${errors.map((e) => e.message).join("; ")}`);
            aggregate.cleanupErrors = errors;
            throw aggregate;
        }
    }

    async cleanupResource(resource) {
        if (resource.kind === "container") {
            // Fire the pre-stop callback before the user-provided stop operation.
            if (typeof resource.onStop === "function") resource.onStop();
            // Mark immediately before invoking the owner-provided stop operation.
            this.registry.markContainersAsExpectedToExit([resource.containerId]);
            if (resource.stop) await resource.stop();
            return;
        }

        const child = resource.child;
        const pid = resource.pid || child?.pid;
        if (!pid || (child && child.exitCode !== null)) return;
        // A process which exits before this point remains visible as spontaneous.
        if (!isAlive(pid)) return;
        // Fire the resource-scoped pre-stop callback only now, after verifying
        // the process is still alive.  A process that crashed before cleanup
        // must NOT have onStop invoked: the exit-time assertion must still fire
        // for genuine startup failures.  Deliberate stops, on the other hand,
        // need onStop to suppress that assertion before the signal is sent.
        if (typeof resource.onStop === "function") resource.onStop();
        this.registry.markProcessesAsExpectedToExit([pid]);
        await stopProcess(resource, this.graceMs);
    }
}

function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error?.code === "EPERM";
    }
}

function signal(resource, signal) {
    const pid = resource.pid || resource.child?.pid;
    if (!pid) return false;
    try {
        process.kill(resource.group ? -pid : pid, signal);
        return true;
    } catch (error) {
        if (error?.code === "ESRCH") return true;
        try {
            return resource.child ? resource.child.kill(signal) : false;
        } catch {
            return false;
        }
    }
}

function stopProcess(resource, graceMs) {
    const child = resource.child;
    if ((child && child.exitCode !== null) || !isAlive(resource.pid || child?.pid)) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let settled = false;
        let timer;
        const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) reject(error);
            else resolve();
        };
        const onExit = () => finish();
        child?.once("exit", onExit);
        if (!signal(resource, "SIGTERM")) {
            return finish(isAlive(resource.pid || child?.pid) ? new Error(`Process ${resource.label} could not be signalled with SIGTERM`) : undefined);
        }
        timer = setTimeout(() => {
            if (!signal(resource, "SIGKILL")) {
                return finish(isAlive(resource.pid || child?.pid) ? new Error(`Process ${resource.label} could not be signalled with SIGKILL`) : undefined);
            }
            setTimeout(() => {
                if (isAlive(resource.pid || child?.pid)) finish(new Error(`Process ${resource.label} did not exit after SIGKILL`));
                else finish();
            }, 250);
        }, graceMs);
    });
}

module.exports = { ScenarioLifecycle, isAlive, stopProcess };

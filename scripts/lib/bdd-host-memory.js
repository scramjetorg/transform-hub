const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { requestDockerStats } = require("./docker-memory.js");

function readRssBytes(pid, procRoot = "/proc") {
    try {
        const status = fs.readFileSync(`${procRoot}/${pid}/status`, "utf8");
        const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
        return match ? Number(match[1]) * 1024 : null;
    } catch {
        return null;
    }
}

function findDockerDaemonRss(procRoot = "/proc") {
    let pids;
    try {
        pids = fs.readdirSync(procRoot).filter((entry) => /^\d+$/.test(entry));
    } catch {
        return { bytes: null, pids: [] };
    }

    const matches = [];
    for (const pid of pids) {
        try {
            const command = fs.readFileSync(`${procRoot}/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
            if (/\bdockerd(?:\s|$)/.test(command)) {
                const bytes = readRssBytes(pid, procRoot);
                if (bytes !== null) matches.push({ pid: Number(pid), bytes });
            }
        } catch {
            // Processes may disappear during the scan.
        }
    }

    return {
        bytes: matches.length ? matches.reduce((sum, item) => sum + item.bytes, 0) : null,
        pids: matches.map((item) => item.pid)
    };
}

function discoverActiveOwnedContainers(runId, options = {}) {
    if (!runId) return [];
    const exec = options.execFileSync || execFileSync;
    try {
        // Do not combine -q with --format: Docker ignores formatted output in
        // that mode, which loses the chunk identity required for ownership.
        const output = exec(
            "docker",
            ["ps", "--filter", `label=scramjet.bdd.run-id=${runId}`, "--format", '{{.ID}}\t{{.Label "scramjet.bdd.run-id"}}\t{{.Label "scramjet.bdd.chunk-id"}}'],
            { encoding: "utf8", timeout: 2000 }
        );
        const rows = String(output).split(/\r?\n/).filter(Boolean);
        const containers = [];
        for (const row of rows) {
            const [id, discoveredRunId, chunkId, ...extra] = row.split("\t");
            if (extra.length || !id || discoveredRunId !== runId || !chunkId) return null;
            containers.push({ id, runId: discoveredRunId, chunkId, owner: `${discoveredRunId}/${chunkId}` });
        }
        return containers;
    } catch {
        return null;
    }
}

async function sampleOwnedContainerWorkingSets(containers, options = {}) {
    const sample = options.requestStats || requestDockerStats;
    return Promise.all(
        (containers || []).map(async (container) => ({
            ...container,
            bytes: await sample(container.id, options.socketPath, options.statsTimeoutMs || 2000)
        }))
    );
}

function readParentPid(pid, procRoot = "/proc") {
    try {
        const status = fs.readFileSync(`${procRoot}/${pid}/status`, "utf8");
        const match = status.match(/^PPid:\s+(\d+)$/m);
        return match ? Number(match[1]) : null;
    } catch {
        return null;
    }
}

function normalizeRootPids(rootPids) {
    if (rootPids == null) return [];
    if (Array.isArray(rootPids)) return rootPids;
    if (typeof rootPids[Symbol.iterator] === "function") return [...rootPids];
    return [];
}

function isLiveProcess(pid, procRoot = "/proc") {
    try {
        process.kill(pid, 0);
    } catch (error) {
        return error.code !== "ESRCH";
    }

    try {
        const status = fs.readFileSync(`${procRoot}/${pid}/status`, "utf8");
        return !/^State:\s+Z(?:\s|$)/m.test(status);
    } catch {
        // A process that is still signal-visible but has unobservable status
        // must remain fail-closed rather than being silently discarded.
        return true;
    }
}

function reconcileActiveChildPids(rootPids, procRoot = "/proc") {
    const pids = normalizeRootPids(rootPids)
        .map(Number)
        .filter((pid) => Number.isInteger(pid) && pid > 0)
        .filter((pid) => isLiveProcess(pid, procRoot));

    if (rootPids instanceof Set) {
        rootPids.clear();
        pids.forEach((pid) => rootPids.add(pid));
        return [...rootPids];
    }
    return pids;
}

function discoverOwnedProcessTree(rootPids, procRoot = "/proc") {
    const pidsArray = normalizeRootPids(rootPids);
    const roots = [...new Set(pidsArray.map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
    let pids;
    try {
        pids = fs
            .readdirSync(procRoot)
            .filter((entry) => /^\d+$/.test(entry))
            .map(Number);
    } catch {
        return roots.map((pid) => ({ pid, bytes: readRssBytes(pid, procRoot), root: pid }));
    }
    const parent = new Map(pids.map((pid) => [pid, readParentPid(pid, procRoot)]));
    const owned = new Set(roots);
    let changed = true;
    while (changed) {
        changed = false;
        for (const [pid, ppid] of parent) {
            if (owned.has(ppid) && !owned.has(pid)) {
                owned.add(pid);
                changed = true;
            }
        }
    }
    return [...owned].map((pid) => ({ pid, bytes: readRssBytes(pid, procRoot), root: roots.find((root) => pid === root || parent.get(pid) === root) || roots[0] }));
}

function readProcessTelemetryState(pid, procRoot = "/proc") {
    try {
        process.kill(pid, 0);
    } catch (error) {
        if (error.code === "ESRCH") return { state: "dead", bytes: 0 };
        return { state: "live-unreadable", bytes: null };
    }
    try {
        const status = fs.readFileSync(`${procRoot}/${pid}/status`, "utf8");
        if (/^State:\s+Z(?:\s|$)/m.test(status)) return { state: "dead", bytes: 0 };
        const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
        return match ? { state: "live", bytes: Number(match[1]) * 1024 } : { state: "live-unreadable", bytes: null };
    } catch {
        return { state: "live-unreadable", bytes: null };
    }
}

function readProcessGroupId(pid, procRoot = "/proc") {
    try {
        const stat = fs.readFileSync(`${procRoot}/${pid}/stat`, "utf8");
        const endComm = stat.lastIndexOf(")");
        const fields = stat
            .slice(endComm + 1)
            .trim()
            .split(/\s+/);
        return Number(fields[2]);
    } catch {
        return null;
    }
}

function processGroupState(groupId) {
    try {
        process.kill(-groupId, 0);
        return "live";
    } catch (error) {
        if (error.code === "ESRCH") return "dead";
        return "unreadable";
    }
}

function discoverProcessGroup(rootPid, procRoot = "/proc") {
    const groupId = readProcessGroupId(rootPid, procRoot) || rootPid;
    let pids;
    try {
        pids = fs.readdirSync(procRoot).filter((entry) => /^\d+$/.test(entry));
    } catch {
        return { groupId, pids: [], state: processGroupState(groupId) };
    }
    const members = [];
    for (const value of pids) {
        try {
            const stat = fs.readFileSync(`${procRoot}/${value}/stat`, "utf8");
            const endComm = stat.lastIndexOf(")");
            const fields = stat
                .slice(endComm + 1)
                .trim()
                .split(/\s+/);
            if (Number(fields[2]) === groupId) members.push(Number(value));
        } catch {
            // Processes may disappear during the scan; group state below keeps
            // an unreadable live group fail-closed.
        }
    }
    return { groupId, pids: members, state: processGroupState(groupId) };
}

function resolveWorkerTelemetry(workers, containers, options = {}) {
    const wrapperHandoffs = [];
    const telemetryFailures = [];
    let wrapperBytes = 0;
    for (const worker of workers || []) {
        const group = discoverProcessGroup(worker.wrapperPid, options.procRoot);
        const memberStates = group.pids.map((pid) => ({ pid, ...readProcessTelemetryState(pid, options.procRoot) }));
        const unreadable =
            memberStates.find((member) => member.state === "live-unreadable") || (group.state === "unreadable" && !memberStates.length ? { pid: worker.wrapperPid } : null);
        const liveMembers = memberStates.filter((member) => member.state === "live");
        const container = (containers || []).find((item) => item.runId === options.runId && item.chunkId === worker.chunkId);
        if (unreadable) {
            telemetryFailures.push({ chunkId: worker.chunkId, wrapperPid: worker.wrapperPid, descendantPid: unreadable.pid, reason: "live wrapper/descendant RSS unavailable" });
            continue;
        }
        if (group.state === "unreadable" || (group.state === "live" && !liveMembers.length) || (group.state === "dead" && liveMembers.length)) {
            telemetryFailures.push({ chunkId: worker.chunkId, wrapperPid: worker.wrapperPid, reason: "wrapper process group state unavailable" });
            continue;
        }
        if (group.state === "live") {
            wrapperBytes += liveMembers.reduce((sum, member) => sum + member.bytes, 0);
            continue;
        }
        if (group.state === "dead" && container && Number.isFinite(container.bytes)) {
            wrapperHandoffs.push({ chunkId: worker.chunkId, wrapperPid: worker.wrapperPid, containerId: container.id, bytes: container.bytes });
            continue;
        }
        telemetryFailures.push({
            chunkId: worker.chunkId,
            wrapperPid: worker.wrapperPid,
            reason: group.state !== "dead" ? "wrapper process group state unavailable" : container ? "container working-set unavailable" : "exact run/chunk container missing"
        });
    }
    return { wrapperBytes, wrapperHandoffs, telemetryFailures };
}

async function resolveWorkerTelemetryWithRetry(workers, containers, options = {}) {
    const maxRetries = options.groupRetryCount || 3;
    const delayMs = options.groupRetryDelayMs || 5;
    let result = resolveWorkerTelemetry(workers, containers, options);
    for (let attempt = 1; attempt < maxRetries; attempt++) {
        const hasUnreadableRss = result.telemetryFailures.some((f) => f.reason === "live wrapper/descendant RSS unavailable");
        if (!hasUnreadableRss) break;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        result = resolveWorkerTelemetry(workers, containers, options);
    }
    return result;
}

function measureHostTotalMemory(options = {}) {
    const schedulerPid = options.schedulerPid ?? process.pid;
    const schedulerBytes = options.schedulerBytes ?? readRssBytes(schedulerPid, options.procRoot);
    const docker = options.dockerDaemon || findDockerDaemonRss(options.procRoot);
    const discovered = Object.hasOwn(options, "activeOwnedContainers") ? options.activeOwnedContainers : options.runId ? discoverActiveOwnedContainers(options.runId, options) : [];
    const containers = discovered === null ? [{ owner: options.runId || "owned container", bytes: null }] : discovered;
    const children = options.activeOwnedChildren || [];
    const workerTelemetry = Object.hasOwn(options, "_workerTelemetry") ? options._workerTelemetry : resolveWorkerTelemetry(options.activeOwnedWorkers || [], containers, options);
    const childBytes = workerTelemetry.wrapperBytes + children.reduce((sum, item) => sum + (Number.isFinite(item?.bytes) ? item.bytes : 0), 0);
    const missingChildren = children.filter((item) => !Number.isFinite(item?.bytes)).map((item) => item.pid || "scheduler child");
    const containerBytes = options.activeOwnedContainerBytes ?? containers.reduce((sum, item) => sum + (Number.isFinite(item?.bytes) ? item.bytes : 0), 0);
    const missingContainers = containers.filter((item) => !Number.isFinite(item?.bytes)).map((item) => item.owner || item.id || "owned container");
    const missing = [];

    if (!Number.isFinite(schedulerBytes)) missing.push("scheduler RSS");
    if (!Number.isFinite(docker.bytes)) missing.push("Docker daemon RSS");
    if (missingContainers.length) missing.push(`owned container telemetry: ${missingContainers.join(", ")}`);
    if (missingChildren.length) missing.push(`scheduler child telemetry: ${missingChildren.join(", ")}`);
    if (workerTelemetry.telemetryFailures.length)
        missing.push(`worker telemetry: ${workerTelemetry.telemetryFailures.map((item) => `${item.chunkId}: ${item.reason}`).join(", ")}`);

    return {
        schedulerBytes: Number.isFinite(schedulerBytes) ? schedulerBytes : null,
        dockerDaemonBytes: Number.isFinite(docker.bytes) ? docker.bytes : null,
        dockerDaemonPids: docker.pids || [],
        activeOwnedContainerBytes: Number.isFinite(containerBytes) ? containerBytes : null,
        // Includes live worker process-tree RSS plus scheduler-owned child RSS.
        activeOwnedProcessBytes: Number.isFinite(childBytes) ? childBytes : null,
        activeOwnedContainers: containers,
        wrapperHandoffs: workerTelemetry.wrapperHandoffs,
        telemetryFailures: workerTelemetry.telemetryFailures,
        totalBytes: missing.length ? null : schedulerBytes + docker.bytes + containerBytes + childBytes,
        missing
    };
}

async function measureHostTotalMemoryAsync(options = {}) {
    const discovered = Object.hasOwn(options, "activeOwnedContainers") ? options.activeOwnedContainers : options.runId ? discoverActiveOwnedContainers(options.runId, options) : [];
    const containers = discovered === null ? null : await sampleOwnedContainerWorkingSets(discovered, options);
    const activeChildPids = reconcileActiveChildPids(options.activeChildPids || [], options.procRoot);
    const children = options.activeOwnedChildren || (options.activeOwnedWorkers?.length ? [] : discoverOwnedProcessTree(activeChildPids, options.procRoot));
    // Retry transient live-worker RSS failures before committing to a fatal sample.
    const workerTelemetry = await resolveWorkerTelemetryWithRetry(options.activeOwnedWorkers || [], containers || [], options);
    return measureHostTotalMemory({ ...options, activeOwnedContainers: containers, activeOwnedChildren: children, _workerTelemetry: workerTelemetry });
}

module.exports = {
    discoverActiveOwnedContainers,
    discoverOwnedProcessTree,
    findDockerDaemonRss,
    normalizeRootPids,
    reconcileActiveChildPids,
    readProcessTelemetryState,
    readProcessGroupId,
    discoverProcessGroup,
    resolveWorkerTelemetry,
    resolveWorkerTelemetryWithRetry,
    measureHostTotalMemory,
    measureHostTotalMemoryAsync,
    readRssBytes,
    sampleOwnedContainerWorkingSets
};

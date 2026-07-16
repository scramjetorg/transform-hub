"use strict";

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
        const output = exec("docker", ["ps", "-q", "--filter", `label=scramjet.bdd.run-id=${runId}`, "--format", '{{.ID}}\t{{.Label "scramjet.bdd.chunk-id"}}'], {
            encoding: "utf8",
            timeout: 2000
        });
        return String(output)
            .split(/\r?\n/)
            .filter(Boolean)
            .map((value) => {
                const [id, chunkId] = value.split("\t");
                return { id, owner: chunkId ? `${runId}/${chunkId}` : runId, chunkId: chunkId || null };
            });
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

function discoverOwnedProcessTree(rootPids, procRoot = "/proc") {
    const roots = [...new Set((rootPids || []).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
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

function measureHostTotalMemory(options = {}) {
    const schedulerPid = options.schedulerPid ?? process.pid;
    const schedulerBytes = options.schedulerBytes ?? readRssBytes(schedulerPid, options.procRoot);
    const docker = options.dockerDaemon || findDockerDaemonRss(options.procRoot);
    const discovered = options.activeOwnedContainers || (options.runId ? discoverActiveOwnedContainers(options.runId, options) : []);
    const containers = discovered === null ? [{ owner: options.runId || "owned container", bytes: null }] : discovered;
    const children = options.activeOwnedChildren || [];
    const childBytes = children.reduce((sum, item) => sum + (Number.isFinite(item?.bytes) ? item.bytes : 0), 0);
    const missingChildren = children.filter((item) => !Number.isFinite(item?.bytes)).map((item) => item.pid || "scheduler child");
    const containerBytes = options.activeOwnedContainerBytes ?? containers.reduce((sum, item) => sum + (Number.isFinite(item?.bytes) ? item.bytes : 0), 0);
    const missingContainers = containers.filter((item) => !Number.isFinite(item?.bytes)).map((item) => item.owner || item.id || "owned container");
    const missing = [];

    if (!Number.isFinite(schedulerBytes)) missing.push("scheduler RSS");
    if (!Number.isFinite(docker.bytes)) missing.push("Docker daemon RSS");
    if (missingContainers.length) missing.push(`owned container telemetry: ${missingContainers.join(", ")}`);
    if (missingChildren.length) missing.push(`scheduler child telemetry: ${missingChildren.join(", ")}`);

    return {
        schedulerBytes: Number.isFinite(schedulerBytes) ? schedulerBytes : null,
        dockerDaemonBytes: Number.isFinite(docker.bytes) ? docker.bytes : null,
        dockerDaemonPids: docker.pids || [],
        activeOwnedContainerBytes: Number.isFinite(containerBytes) ? containerBytes : null,
        activeOwnedContainers: containers,
        totalBytes: missing.length ? null : schedulerBytes + docker.bytes + containerBytes + childBytes,
        missing
    };
}

async function measureHostTotalMemoryAsync(options = {}) {
    const discovered = options.activeOwnedContainers || (options.runId ? discoverActiveOwnedContainers(options.runId, options) : []);
    const containers = discovered === null ? null : await sampleOwnedContainerWorkingSets(discovered, options);
    const children = options.activeOwnedChildren || discoverOwnedProcessTree(options.activeChildPids || [], options.procRoot);
    return measureHostTotalMemory({ ...options, activeOwnedContainers: containers, activeOwnedChildren: children });
}

module.exports = {
    discoverActiveOwnedContainers,
    discoverOwnedProcessTree,
    findDockerDaemonRss,
    measureHostTotalMemory,
    measureHostTotalMemoryAsync,
    readRssBytes,
    sampleOwnedContainerWorkingSets
};

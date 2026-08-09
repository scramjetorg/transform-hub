"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { execFileSync } = require("node:child_process");

const SAFE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/;

function safePart(value, name) {
    const result = String(value || "").trim();
    if (!SAFE.test(result)) throw new Error(`${name} must contain only [a-zA-Z0-9_.-] and be at most 64 characters.`);
    return result;
}

function newId(prefix) {
    return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function encodePart(value) {
    return Buffer.from(String(value), "utf8").toString("base64url");
}

let singleton;

function createOwnership(env = process.env, overrides = {}) {
    const runId = safePart(overrides.runId || env.SCRAMJET_BDD_RUN_ID || newId("run"), "runId");
    const chunkId = safePart(overrides.chunkId || env.SCRAMJET_BDD_CHUNK_ID || env.BDD_CHUNK || "adhoc", "chunkId");
    const baseRoot = path.resolve(overrides.artifactRoot || env.SCRAMJET_BDD_ARTIFACT_ROOT || path.join(os.tmpdir(), "scramjet-bdd"));
    const root = path.join(baseRoot, "runs", encodePart(runId), "chunks", encodePart(chunkId));
    const ownership = Object.freeze({
        runId,
        chunkId,
        owner: `${runId}/${chunkId}`,
        baseRoot,
        root,
        configPath: path.join(root, "config.json"),
        tempPath: path.join(root, "tmp"),
        logPath: path.join(root, "logs"),
        labels: Object.freeze({
            "scramjet.bdd.run-id": runId,
            "scramjet.bdd.chunk-id": chunkId,
            "scramjet.bdd.owner": `${runId}/${chunkId}`,
        }),
    });
    return ownership;
}

function getOwnership(env = process.env) {
    if (env === process.env && !singleton) singleton = createOwnership(env);
    return env === process.env ? singleton : createOwnership(env);
}

function ownershipEnv(ownership, env = process.env) {
    return {
        ...env,
        SCRAMJET_BDD_RUN_ID: ownership.runId,
        SCRAMJET_BDD_CHUNK_ID: ownership.chunkId,
        SCRAMJET_BDD_OWNER: ownership.owner,
        SCRAMJET_BDD_ARTIFACT_ROOT: ownership.baseRoot,
        SCRAMJET_BDD_CONFIG_PATH: ownership.configPath,
    };
}

function ensureOwnershipPaths(ownership) {
    for (const dir of [ownership.root, ownership.tempPath, ownership.logPath]) fs.mkdirSync(dir, { recursive: true });
    return ownership;
}

function ownershipTempPrefix(ownership, suffix = "") {
    return path.join(ownership.tempPath, suffix || "");
}

async function allocateOwnedPort(ownership, options = {}) {
    const base = Number(options.base || 24000);
    const width = Number(options.width || 1000);
    const hash = [...ownership.chunkId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
    const start = base + (hash % Math.max(1, width - 50));
    const reservations = path.resolve(options.reservationRoot || path.join(os.tmpdir(), "scramjet-bdd-port-reservations"));
    fs.mkdirSync(reservations, { recursive: true });

    for (let offset = 0; offset < width; offset++) {
        const port = start + offset;
        const marker = path.join(reservations, `${port}.lock`);
        try {
            const fd = fs.openSync(marker, "wx");
            const token = crypto.randomBytes(16).toString("hex");
            const server = net.createServer();
            try {
                await new Promise((resolve, reject) => {
                    server.once("error", reject);
                    server.listen(port, "127.0.0.1", resolve);
                });
                fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, runId: ownership.runId, chunkId: ownership.chunkId, token }));
                fs.closeSync(fd);
                await new Promise(resolve => server.close(() => resolve()));
                return {
                    port,
                    token,
                    release: async () => {
                        try {
                            const current = JSON.parse(fs.readFileSync(marker, "utf8"));
                            if (current.token === token) fs.rmSync(marker, { force: true });
                        } catch {
                            // The reservation was already reclaimed or removed.
                        }
                    }
                };
            } catch (error) {
                server.close();
                fs.closeSync(fd);
                fs.rmSync(marker, { force: true });
                if (error.code !== "EADDRINUSE") throw error;
            }
        } catch (error) {
            if (error.code !== "EEXIST") throw error;
            try {
                const metadata = JSON.parse(fs.readFileSync(marker, "utf8"));
                const pidGone = !metadata.pid || !isProcessAlive(metadata.pid);
                if (pidGone) {
                    fs.rmSync(marker, { force: true });
                    offset -= 1;
                }
            } catch {
                // A concurrent owner may have removed or replaced the marker.
            }
        }
    }
    throw new Error(`No free owned port available for ${ownership.owner}.`);
}

function isProcessAlive(pid) {
    try {
        process.kill(Number(pid), 0);
        return true;
    } catch (error) {
        return error?.code === "EPERM";
    }
}

function acquireRunLock(ownership, options = {}) {
    // Parallel scheduling reserves host-wide resources, not run-id resources.
    // Never accept a caller-provided environment path: that would permit a
    // second BDD invocation to bypass the host-wide exclusion.
    const lockPath = path.join(os.tmpdir(), "scramjet-bdd-parallel.lock");
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    const token = crypto.randomBytes(16).toString("hex");
    const write = () => {
        const fd = fs.openSync(lockPath, "wx");
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, runId: ownership.runId, token, createdAt: Date.now() }));
        fs.closeSync(fd);
    };
    try {
        write();
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
        let stale = true;
        try {
            const current = JSON.parse(fs.readFileSync(lockPath, "utf8"));
            stale = !current.pid || !isProcessAlive(current.pid);
        } catch {
            stale = true;
        }
        if (!stale) throw new Error(`BDD parallel scheduler is already owned by a live process.`);
        fs.rmSync(lockPath, { force: true });
        write();
    }
    return {
        path: lockPath,
        release: () => {
            try {
                const current = JSON.parse(fs.readFileSync(lockPath, "utf8"));
                if (current.token === token && current.pid === process.pid) fs.rmSync(lockPath, { force: true });
            } catch { /* already released */ }
        }
    };
}

function findLiveBddContainers(runId, options = {}) {
    const exec = options.execFileSync || execFileSync;
    try {
        const output = exec("docker", ["ps", "--filter", "label=scramjet.bdd.run-id", "--format", "{{.ID}}\t{{.Label \"scramjet.bdd.run-id\"}}\t{{.Label \"scramjet.bdd.chunk-id\"}}"], { encoding: "utf8", timeout: 2000 });
        return String(output).split(/\r?\n/).filter(Boolean).map((line) => {
            const [id, owner, chunkId] = line.split("\t");
            return { id, runId: owner || null, chunkId: chunkId || null, foreign: owner !== runId };
        }).filter((container) => !options.chunkId || container.chunkId === options.chunkId);
    } catch {
        return null;
    }
}

function assertNoForeignBddContainers(runId, options = {}) {
    const containers = findLiveBddContainers(runId, options);
    const foreign = containers?.filter((container) => container.foreign) || [];
    if (foreign.length) throw new Error(`live foreign BDD container(s) block scheduler: ${foreign.map((container) => container.id).join(", ")}`);
    return { checked: containers !== null, containers: containers || [], foreign };
}

module.exports = { createOwnership, getOwnership, ownershipEnv, ensureOwnershipPaths, ownershipTempPrefix, allocateOwnedPort, acquireRunLock, assertNoForeignBddContainers, findLiveBddContainers, safePart, encodePart, isProcessAlive };

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

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

module.exports = { createOwnership, getOwnership, ownershipEnv, ensureOwnershipPaths, ownershipTempPrefix, allocateOwnedPort, safePart, encodePart, isProcessAlive };

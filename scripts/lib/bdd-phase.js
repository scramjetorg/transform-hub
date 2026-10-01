const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const [, , name, separator, ...command] = process.argv;
if (!name || separator !== "--" || command.length === 0) throw new Error("Usage: bdd-phase.js <phase> -- <command> [args...]");
const start = process.hrtime.bigint();
const invocationStartedAtEpochMs = Number(process.env.SCRAMJET_BDD_INVOCATION_STARTED_AT_EPOCH_MS) || Date.now();
const startOffsetMs = Math.max(0, Date.now() - invocationStartedAtEpochMs);
const result = spawnSync(command[0], command.slice(1), { stdio: "inherit", env: process.env });
const endOffsetMs = Math.max(0, Date.now() - invocationStartedAtEpochMs);
const record = {
    kind: "phase", name, durationMs: Number(process.hrtime.bigint() - start) / 1e6,
    startOffsetMs, endOffsetMs,
    status: result.status === 0 ? "PASS" : "FAIL", runId: process.env.SCRAMJET_BDD_RUN_ID || "unknown",
    chunkId: process.env.SCRAMJET_BDD_CHUNK_ID || "unknown", owner: process.env.SCRAMJET_BDD_OWNER || "unknown"
};
if (process.env.BDD_CHUNK_TIMING_EVENTS_FILE) fs.appendFileSync(process.env.BDD_CHUNK_TIMING_EVENTS_FILE, `${JSON.stringify(record)}\n`);
if (result.error) throw result.error;
process.exit(typeof result.status === "number" ? result.status : 1);

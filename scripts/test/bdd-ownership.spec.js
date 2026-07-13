"use strict";

const test = require("ava");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createOwnership, getOwnership, ownershipEnv, ensureOwnershipPaths, allocateOwnedPort, encodePart } = require("../../bdd/lib/ownership.js");
const { cleanupTempDirs } = require("../lib/bdd-cleanup.js");

test("ownership is immutable and produces chunk-specific paths and labels", t => {
    const ownership = createOwnership({}, { runId: "run-test", chunkId: "verser2", artifactRoot: path.join(os.tmpdir(), "bdd-ownership-test") });
    t.is(ownership.owner, "run-test/verser2");
    t.deepEqual(ownership.labels, {
        "scramjet.bdd.run-id": "run-test",
        "scramjet.bdd.chunk-id": "verser2",
        "scramjet.bdd.owner": "run-test/verser2",
    });
    t.not(ownership.root, createOwnership({}, { runId: "run-test", chunkId: "cli", artifactRoot: path.join(os.tmpdir(), "bdd-ownership-test") }).root);
    t.throws(() => { ownership.chunkId = "other"; }, { instanceOf: TypeError });
});

test("ownership environment propagates IDs and artifact root", t => {
    const ownership = createOwnership({}, { runId: "run-a", chunkId: "chunk-a", artifactRoot: "/tmp/owned" });
    const env = ownershipEnv(ownership, { EXISTING: "yes" });
    t.like(env, { EXISTING: "yes", SCRAMJET_BDD_RUN_ID: "run-a", SCRAMJET_BDD_CHUNK_ID: "chunk-a", SCRAMJET_BDD_OWNER: "run-a/chunk-a" });
    t.is(env.SCRAMJET_BDD_CONFIG_PATH, ownership.configPath);
    const roundTrip = createOwnership(env);
    t.is(roundTrip.root, ownership.root);
    t.is(roundTrip.baseRoot, ownership.baseRoot);
});

test("structured ownership paths cannot collide on hyphen placement", t => {
    const root = path.join(os.tmpdir(), "bdd-structured-collision");
    const first = createOwnership({}, { runId: "run-a-b", chunkId: "c", artifactRoot: root });
    const second = createOwnership({}, { runId: "run-a", chunkId: "b-c", artifactRoot: root });
    t.not(first.root, second.root);
    t.true(first.root.includes(path.join("runs", encodePart("run-a-b"), "chunks", encodePart("c"))));
    t.true(second.root.includes(path.join("runs", encodePart("run-a"), "chunks", encodePart("b-c"))));
});

test("direct local modules share one stable process ownership", t => {
    const first = getOwnership(process.env);
    const second = getOwnership(process.env);
    t.is(first, second);
    t.is(first.owner, `${first.runId}/${first.chunkId}`);
});

test("owned paths are isolated and can be created independently", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-owned-paths-"));
    const a = createOwnership({}, { runId: "run-a", chunkId: "a", artifactRoot: root });
    const b = createOwnership({}, { runId: "run-a", chunkId: "b", artifactRoot: root });
    ensureOwnershipPaths(a); ensureOwnershipPaths(b);
    t.true(fs.existsSync(a.logPath)); t.true(fs.existsSync(b.tempPath)); t.not(a.configPath, b.configPath);
    fs.rmSync(root, { recursive: true, force: true });
});

test("owned port reservations do not overlap", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-owned-port-"));
    const a = createOwnership({}, { runId: "run-a", chunkId: "a", artifactRoot: root });
    const b = createOwnership({}, { runId: "run-a", chunkId: "b", artifactRoot: root });
    const first = await allocateOwnedPort(a, { base: 30000, width: 100 });
    const second = await allocateOwnedPort(b, { base: 30000, width: 100 });
    t.not(first.port, second.port);
    await first.release(); await second.release();
    fs.rmSync(root, { recursive: true, force: true });
});

test("stale owned port reservations are reclaimed", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-stale-port-"));
    const reservationRoot = path.join(root, "reservations");
    const ownership = createOwnership({}, { runId: "run-stale", chunkId: "stale", artifactRoot: root });
    const base = 31000;
    const width = 100;
    const hash = [...ownership.chunkId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
    const port = base + (hash % (width - 50));
    fs.mkdirSync(reservationRoot, { recursive: true });
    fs.writeFileSync(path.join(reservationRoot, `${port}.lock`), JSON.stringify({ pid: 999999999, runId: "foreign", chunkId: "foreign" }));
    const reservation = await allocateOwnedPort(ownership, { base, width, reservationRoot });
    t.is(reservation.port, port);
    await reservation.release();
    fs.rmSync(root, { recursive: true, force: true });
});

test("live old port reservations are not stolen", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-live-port-"));
    const reservationRoot = path.join(root, "reservations");
    const firstOwner = createOwnership({}, { runId: "run-live-a", chunkId: "same", artifactRoot: root });
    const secondOwner = createOwnership({}, { runId: "run-live-b", chunkId: "same", artifactRoot: root });
    const base = 32000;
    const width = 100;
    const hash = [...firstOwner.chunkId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
    const firstPort = base + (hash % (width - 50));
    fs.mkdirSync(reservationRoot, { recursive: true });
    fs.writeFileSync(path.join(reservationRoot, `${firstPort}.lock`), JSON.stringify({ pid: process.pid, runId: firstOwner.runId, chunkId: firstOwner.chunkId, token: "live-foreign" }));
    const reservation = await allocateOwnedPort(secondOwner, { base, width, reservationRoot });
    t.not(reservation.port, firstPort);
    await reservation.release();
    fs.rmSync(root, { recursive: true, force: true });
});

test("foreign port owners cannot be released by another owner", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-foreign-port-"));
    const reservationRoot = path.join(root, "reservations");
    const owner = createOwnership({}, { runId: "run-owner", chunkId: "foreign", artifactRoot: root });
    const reservation = await allocateOwnedPort(owner, { base: 33000, width: 100, reservationRoot });
    const marker = path.join(reservationRoot, `${reservation.port}.lock`);
    fs.writeFileSync(marker, JSON.stringify({ pid: process.pid, runId: "foreign-run", chunkId: "foreign", token: "foreign-token" }));
    await reservation.release();
    t.true(fs.existsSync(marker));
    fs.rmSync(root, { recursive: true, force: true });
});

test("owned cleanup removes only exact owned path prefixes", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-cleanup-scope-"));
    // Good — matches ownership run-a/chunk-a via structured path.
    const good = path.join(root, "scramjet-bdd-runs", encodePart("run-a"), "chunks", encodePart("chunk-a"), "runner-good");
    // Foreign — different chunk (chunk-ab, not chunk-a).
    const foreign1 = path.join(root, "scramjet-bdd-runs", encodePart("run-a"), "chunks", encodePart("chunk-ab"), "runner-x");
    // Foreign — different run (run-ab, not run-a).
    const foreign2 = path.join(root, "scramjet-bdd-runs", encodePart("run-ab"), "chunks", encodePart("chunk-a"), "runner-x");
    for (const dir of [good, foreign1, foreign2]) fs.mkdirSync(dir, { recursive: true });
    cleanupTempDirs(root, "", { runId: "run-a", chunkId: "chunk-a" });
    t.false(fs.existsSync(good), "owned path must be removed");
    t.true(fs.existsSync(foreign1), "different chunk must survive");
    t.true(fs.existsSync(foreign2), "different run must survive");
    fs.rmSync(root, { recursive: true, force: true });
});

test("structured ownership cleanup never cross-deletes ambiguous run/chunk combos", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-cleanup-structured-"));
    // These would both match the flat prefix "run-a-b-c" but are distinct
    // runs/chunks.  The structured encoded path must distinguish them.
    const aPath = path.join(root, "scramjet-bdd-runs", encodePart("run-a-b"), "chunks", encodePart("c"), "runner-a");
    const bPath = path.join(root, "scramjet-bdd-runs", encodePart("run-a"), "chunks", encodePart("b-c"), "runner-b");
    fs.mkdirSync(aPath, { recursive: true });
    fs.mkdirSync(bPath, { recursive: true });
    cleanupTempDirs(root, "", { runId: "run-a-b", chunkId: "c" });
    t.false(fs.existsSync(aPath), "run-a-b/chunk-c must be removed");
    t.true(fs.existsSync(bPath), "run-a/chunk-b-c must NOT be removed");
    fs.rmSync(root, { recursive: true, force: true });
});

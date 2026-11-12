"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const STREAMS_MODULE = path.resolve(PACKAGE_ROOT, "src/fd-streams.ts");

function childSource(mode) {
    return `
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { fstatSync } = require("node:fs");
const fd3Before = fstatSync(3);
const { createBunFdStreams } = require(${JSON.stringify(STREAMS_MODULE)});
const streams = createBunFdStreams();
const fd3After = fstatSync(3);
assert.deepEqual([fd3After.dev, fd3After.ino, fd3After.mode, fd3After.rdev], [fd3Before.dev, fd3Before.ino, fd3Before.mode, fd3Before.rdev], "fd3 reserved descriptor was modified");
assert.equal(streams.stdin, process.stdin);
assert.equal(streams.stdout, process.stdout);
assert.equal(streams.stderr, process.stderr);
assert.ok(streams.controlIn && typeof streams.controlIn.on === "function", "fd4 must be a Readable");
assert.ok(streams.monitoringOut && typeof streams.monitoringOut.write === "function", "fd5 must be a Writable");
assert.equal(Object.values(streams).some(stream => stream && stream.fd === 3), false, "fd3 is reserved for process IPC");
const notify = (type, fields = {}) => process.stdout.write("__BUN_FD_EVENT__" + JSON.stringify({ type, ...fields }) + "\\n");
const fd3Identity = [fd3After.dev, fd3After.ino, fd3After.mode, fd3After.rdev];
process.once("SIGUSR1", () => { if (${JSON.stringify(mode)} === "cancel") void cancelRead(); });
process.once("SIGUSR2", () => {
  if (${JSON.stringify(mode)} === "burst") void writeBurst();
  if (${JSON.stringify(mode)} === "closed-reader") writeAgainstClosedReader();
  if (${JSON.stringify(mode)} === "final-flush") finishWithOpenControlWriter();
});
let readError;
streams.controlIn.on("error", error => { readError = error; });
if (!["framing", "cancel"].includes(${JSON.stringify(mode)})) streams.controlIn.on("data", () => { /* keep fd4 live until the parent signals the mode */ });
streams.monitoringOut.on("error", error => {
  if (${JSON.stringify(mode)} !== "closed-reader") return;
  failClosedReader(error);
});
if (${JSON.stringify(mode)} === "framing") {
  const chunks = [];
  streams.controlIn.on("data", chunk => chunks.push(Buffer.from(chunk)));
  streams.controlIn.once("end", () => {
    const bytes = Buffer.concat(chunks);
    streams.monitoringOut.end(bytes, () => notify("input-eof", { bytes: bytes.length }));
  });
}
let pendingRead;
async function cancelRead() {
  streams.controlIn.destroy(new Error("test cancellation"));
  try {
    const outcome = await pendingRead;
    streams.monitoringOut.end(Buffer.from("pending-read-settled\\n"), () => {
      notify("pending-read-settled", { done: outcome.done, readError: readError?.code || null });
      streams.controlIn.destroy();
    });
  } catch (error) {
    streams.monitoringOut.end(Buffer.from("pending-read-settled\\n"), () => {
      notify("pending-read-settled", { rejected: true, error: error.code || error.message });
      streams.controlIn.destroy();
    });
  }
}
const burstParts = 8;
const burstChunkBytes = 256 * 1024;
async function writeBurst() {
  let sawBackpressure = false;
  for (let index = 0; index < burstParts; index++) {
    const prefix = Buffer.from(String(index).padStart(3, "0") + ":");
    const frame = Buffer.concat([prefix, Buffer.alloc(burstChunkBytes - prefix.length - 1, index), Buffer.from("\\n")]);
    if (!streams.monitoringOut.write(frame)) {
      if (!sawBackpressure) notify("write-backpressure", { index });
      sawBackpressure = true;
      await once(streams.monitoringOut, "drain");
    }
  }
  streams.monitoringOut.end(() => {
    notify("burst-finished", { sawBackpressure, count: burstParts });
    streams.controlIn.destroy();
  });
}
let closedReaderFailed = false;
function failClosedReader(error) {
  if (closedReaderFailed) return;
  closedReaderFailed = true;
  process.exitCode = 23;
  notify("write-error", { code: error.code || error.message });
  setImmediate(() => {
    streams.controlIn.destroy();
  });
}
function writeAgainstClosedReader() {
  const frame = Buffer.alloc(1024 * 1024, 0x5a);
  streams.monitoringOut.write(frame, error => {
    if (error) failClosedReader(error);
    else {
      notify("write-completed-with-reader-closed");
      streams.controlIn.destroy();
    }
  });
}
function finishWithOpenControlWriter() {
  const finalFrame = Buffer.from("final-monitor-frame\\n");
  streams.monitoringOut.end(finalFrame, () => {
    notify("final-flush-complete");
    streams.controlIn.destroy();
  });
}
if (${JSON.stringify(mode)} === "cancel") pendingRead = streams.controlIn[Symbol.asyncIterator]().next();
process.stdout.write("__BUN_FD_READY__" + JSON.stringify({
  pid: process.pid,
  execPath: process.execPath,
  bunVersion: process.versions.bun || null,
  mode: ${JSON.stringify(mode)},
  nodeChannelFd: process.env.NODE_CHANNEL_FD || null,
  fd3Identity
}) + "\\n");
`;
}

function waitForMessage(messages, predicate, timeoutMs = 2500) {
    const prior = messages.find(predicate);
    if (prior) return Promise.resolve(prior);
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for child IPC message; received ${JSON.stringify(messages)}`));
        }, timeoutMs);
        const check = message => {
            if (!predicate(message)) return;
            cleanup();
            resolve(message);
        };
        const cleanup = () => {
            clearTimeout(timer);
            const index = messages.listeners.indexOf(check);
            if (index !== -1) messages.listeners.splice(index, 1);
        };
        messages.listeners.push(check);
    });
}

async function runMode(mode) {
    assert.ok(["framing", "burst", "cancel", "closed-reader", "final-flush"].includes(mode), `Unknown fd stream test mode: ${mode}`);
    const bunExecutable = fs.realpathSync(process.argv[3] || "");
    const child = spawn(bunExecutable, ["-e", childSource(mode)], {
        cwd: PACKAGE_ROOT,
        stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]
    });
    const messages = [];
    messages.listeners = [];
    let stdout = "";
    let stderr = "";
    const outputChunks = [];
    let outputEnded = false;
    let forced = false;
    child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    if (mode === "burst") child.stdio[5].pause();
    child.stdio[5].on("data", chunk => outputChunks.push(Buffer.from(chunk)));
    child.stdio[5].once("end", () => { outputEnded = true; });
    child.on("message", message => {
        messages.push(message);
        for (const listener of [...messages.listeners]) listener(message);
    });
    let stdoutRemainder = "";
    child.stdout.on("data", chunk => {
        stdoutRemainder += chunk;
        const lines = stdoutRemainder.split("\n");
        stdoutRemainder = lines.pop();
        for (const line of lines) {
            if (line.startsWith("__BUN_FD_READY__")) {
                const ready = JSON.parse(line.slice("__BUN_FD_READY__".length));
                messages.push({ type: "ready", ...ready });
                for (const listener of [...messages.listeners]) listener({ type: "ready", ...ready });
            } else if (line.startsWith("__BUN_FD_EVENT__")) {
                const event = JSON.parse(line.slice("__BUN_FD_EVENT__".length));
                messages.push(event);
                for (const listener of [...messages.listeners]) listener(event);
            }
        }
    });
    const closed = new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
    let deadline;
    try {
        const ready = await waitForMessage(messages, message => message.type === "ready");
        assert.ok(typeof ready.bunVersion === "string" && ready.bunVersion.length > 0, "child identity handshake must prove this child runs under Bun");
        assert.equal(ready.pid, child.pid, "identity handshake PID must match the process launched by the Node parent");
        assert.equal(fs.realpathSync(ready.execPath), bunExecutable, "identity handshake executable must match the supplied Bun executable");
        assert.ok(Array.isArray(ready.fd3Identity) && ready.fd3Identity.length === 4, "Bun child must report the unchanged reserved fd3 identity");

        if (mode === "framing") {
            const all = Buffer.from('{"event":"hé🌍"}\n{"next":2}\n');
            const emojiSplit = all.indexOf(Buffer.from("🌍")) + 2;
            child.stdio[4].write(all.subarray(0, emojiSplit));
            child.stdio[4].write(all.subarray(emojiSplit));
            child.stdio[4].end();
        } else if (mode === "burst") {
            child.kill("SIGUSR2");
            const backpressure = await waitForMessage(messages, message => message.type === "write-backpressure");
            child.stdio[5].resume();
            assert.ok(Number.isInteger(backpressure.index));
        } else if (mode === "cancel") {
            child.kill("SIGUSR1");
        } else if (mode === "closed-reader") {
            child.stdio[5].destroy();
            child.kill("SIGUSR2");
        } else {
            child.kill("SIGUSR2");
            assert.equal(child.stdio[4].writableEnded, false, "parent must leave fd4 writer open during final flush");
        }

        deadline = setTimeout(() => {
            forced = true;
            try { child.kill("SIGKILL"); } catch { /* already closed */ }
        }, mode === "burst" ? 10000 : 5000);
        const outcome = await closed;
        clearTimeout(deadline);
        deadline = undefined;
        child.stdio[4].end();
        const transcript = Buffer.concat(outputChunks);
        const received = messages.filter(message => message.type !== "ready");
        return { mode, bunExecutable, childPid: ready.pid, bunVersion: ready.bunVersion, fd3Identity: ready.fd3Identity, outcome, forced, outputEnded, outputHex: transcript.toString("hex"), outputLength: transcript.length, stdout, stderr, messages: received };
    } catch (error) {
        if (deadline) clearTimeout(deadline);
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await closed;
        throw new Error(`${mode} fd stream child failed: ${error.stack || error}; stdout=${stdout}; stderr=${stderr}`);
    }
}

runMode(process.argv[2]).then(result => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
}).catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});

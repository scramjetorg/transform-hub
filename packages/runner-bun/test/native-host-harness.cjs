"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const NODE_RUNNER = path.resolve(PACKAGE_ROOT, "../runner-node/src/bin/runner-node.ts");
const BUN_FD_STREAMS = path.resolve(PACKAGE_ROOT, "src/fd-streams.ts");
const CODE = { READY: 3014, DECLARE: 3015, MANIFEST_RESULT: 4006, STOP: 4001, KILL: 4002, EVENT: 5001 };

function findScramjetPackageRoot() {
    const entry = fs.realpathSync(require.resolve("scramjet", { paths: [PACKAGE_ROOT] }));
    let current = path.dirname(entry);
    while (current !== path.dirname(current)) {
        const manifestPath = path.join(current, "package.json");
        if (fs.existsSync(manifestPath) && JSON.parse(fs.readFileSync(manifestPath, "utf8")).name === "scramjet") {
            const realRoot = fs.realpathSync(current);
            const relative = path.relative(WORKSPACE_ROOT, realRoot);
            assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `scramjet must resolve inside this worktree, got ${realRoot}`);
            return realRoot;
        }
        current = path.dirname(current);
    }
    throw new Error(`Could not find the local scramjet package root for ${entry}`);
}

const SCRAMJET_PACKAGE_ROOT = findScramjetPackageRoot();

function parseOptions(args) {
    return Object.fromEntries(args.filter(arg => arg.startsWith("--") && arg.includes("="))
        .map(arg => arg.slice(2).split(/=(.*)/s).slice(0, 2)));
}

function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function identityAssertions(records, runtime, expectedPid) {
    assert.ok(records.length, "sequence author did not record execution");
    for (const record of records) {
        assert.equal(record.pid, records[0].pid, `author process changed at ${record.stage}`);
        if (runtime === "bun") {
            assert.equal(record.pid, expectedPid, `author ${record.stage} ran in a child process`);
            assert.ok(record.bunVersion, `author ${record.stage} did not run in Bun`);
            assert.match(path.basename(record.execPath), /^bun(?:\.exe)?$/i);
        } else {
            assert.equal(record.bunVersion, null, `Node baseline unexpectedly ran ${record.stage} in Bun`);
            assert.match(path.basename(record.execPath), /^node(?:\.exe)?$/i);
        }
    }
}

function sequenceSource({ markerPath, exportForm, behavior, output, chainType }) {
    const chainImports = chainType ? 'const { DataStream, StringStream, BufferStream } = require("scramjet");' : "";
    const moduleRecord = chainType ? 'record("module", { scramjetPath: require.resolve("scramjet") });' : 'record("module");';
    const chainFunctions = chainType ? `
function first(input, ...args) {
  record("chain-first", { args, inputIsStream: !!input && typeof input.on === "function" });
  return DataStream.from([{ step: "first", argument: args[0] }]);
}
async function main(input, ...args) {
  const chainValues = [];
  for await (const value of input) chainValues.push(value);
  record("main", { args, chainValues, sameContext: true });
  if (${JSON.stringify(chainType)} === "generic") return DataStream.from([{ step: "second", argument: args[0], chainValues }]);
  if (${JSON.stringify(chainType)} === "string") return StringStream.from(["chain:", args[0], ":done"]);
  return BufferStream.from([Buffer.from([0, 255, 1])]);
}
` : `
function main(input, ...args) {
  if (!initializedContext) initializedContext = this;
  if (!callbackRegistered) { this.on("native-bun-probe", onProbe); callbackRegistered = true; }
  record("main", { args, inputIsStream: !!input && typeof input.on === "function", sameContext: this === initializedContext });
  ${behavior === "main-sync-throw" ? 'throw new Error("fixture-main-sync");' : ""}
  ${behavior === "main-async-reject" ? 'return Promise.reject(new Error("fixture-main-async"));' : ""}
  if (${JSON.stringify(behavior)} === "declaration") return "declared";
  if (["init-block-stop", "init-block-kill", "init-block-eof"].includes(${JSON.stringify(behavior)})) return new Promise(() => {});
  return new Promise(resolve => { finish = resolve; });
}
`;
    const arrayValue = chainType ? "[first, main]" : "[main]";
    return `
const fs = require("node:fs");
const { Readable } = require("node:stream");
${chainImports}
const marker = ${JSON.stringify(markerPath)};
const identity = () => ({ pid: process.pid, execPath: process.execPath, bunVersion: process.versions.bun || null });
const record = (stage, extra = {}) => {
  const prior = fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, "utf8")) : [];
  prior.push({ stage, ...identity(), ...extra });
  fs.writeFileSync(marker, JSON.stringify(prior));
};
${moduleRecord}
let finish;
let initializedContext;
let callbackRegistered = false;
function onProbe(message) {
  record("callback", { message });
  ${output === "primitive" ? 'finish("primitive-output");' : output === "text" ? 'finish(Readable.from(["plain-text"]));' : 'finish(Readable.from([Buffer.from("text-"), Buffer.from([0, 255, 1])]));'}
}
function initialize(context) {
  initializedContext = context;
  record("initialize", { sameContext: this === context });
  ${behavior === "init-sync-throw" ? 'throw new Error("fixture-init-sync");' : ""}
  ${behavior === "init-async-reject" ? 'return Promise.reject(new Error("fixture-init-async"));' : ""}
  ${behavior === "init-block-keepalive" ? 'context.addStopHandler(() => context.keepAlive(1000)); return new Promise(() => {});' : ""}
  ${behavior === "init-block-stop" || behavior === "init-block-kill" || behavior === "init-block-eof" ? "return new Promise(() => {});" : ""}
  if (${JSON.stringify(behavior)} === "declaration") {
    context.on("native-bun-probe", message => record("callback", { message }));
    callbackRegistered = true;
    return context.api.declare({ input: { schema: { type: "string" } } }).then(receipt => {
      record("declaration", { revision: receipt.revision });
    });
  }
  context.on("native-bun-probe", onProbe);
  callbackRegistered = true;
}
${chainFunctions}
switch (${JSON.stringify(exportForm)}) {
  case "function": main.initialize = initialize; module.exports = main; break;
  case "array": module.exports = ${arrayValue}; module.exports.initialize = initialize; break;
  case "default-function": module.exports = { default: main, initialize }; break;
  case "default-array": module.exports = { default: ${arrayValue}, initialize }; break;
  default: throw new Error("unknown export form");
}
`;
}

async function runHosted(options) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "runner-bun-native-host-"));
    const sequencePath = path.join(temp, "sequence");
    const markerPath = path.join(temp, "author.json");
    fs.mkdirSync(sequencePath);
    if (options.chainType) {
        fs.mkdirSync(path.join(sequencePath, "node_modules"), { recursive: true });
        fs.symlinkSync(SCRAMJET_PACKAGE_ROOT, path.join(sequencePath, "node_modules", "scramjet"), process.platform === "win32" ? "junction" : "dir");
    }
    fs.writeFileSync(path.join(sequencePath, "package.json"), JSON.stringify({ main: "index.js" }));
    if (options.behavior === "missing-import") {
        fs.writeFileSync(path.join(sequencePath, "index.js"), 'require("./missing-module");');
    } else {
        fs.writeFileSync(path.join(sequencePath, "index.js"), sequenceSource({
            markerPath,
            exportForm: options.export || "default-function",
            behavior: options.behavior || "success",
            output: options.output || "binary",
            chainType: options.chainType
        }));
    }

    let server;
    const sockets = new Set();
    const channels = new Map();
    const output = [];
    let outputEnded = false;
    let child;
    let timer;
    let pidFile;
    const ownedExitArtifacts = new Set();
    let controlActionSent = false;
    let controlActionStage = 0;
    let monitorBuffer = "";
    const monitorFrames = [];
    let stderr = "";
    const runtime = options.runner === "node" ? "node" : "bun";
    const behavior = options.behavior || "success";

    try {
        server = net.createServer(socket => {
            sockets.add(socket);
            socket.on("close", () => sockets.delete(socket));
            socket.on("error", () => undefined);
            let handshake = Buffer.alloc(0);
            const onHandshake = chunk => {
                handshake = Buffer.concat([handshake, chunk]);
                if (handshake.length < 37) return;
                const channel = Number.parseInt(handshake.subarray(36, 37).toString("ascii"), 10);
                channels.set(channel, socket);
                socket.off("data", onHandshake);
                if (channel === 5) socket.write("content-type: text/plain\r\n\r\n");
                if (channel === 6) {
                    if (handshake.length > 37) output.push(handshake.subarray(37));
                    socket.on("data", chunk => output.push(Buffer.from(chunk)));
                    socket.once("end", () => { outputEnded = true; });
                }
            };
            socket.on("data", onHandshake);
        });
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });

        const sequenceId = "native-bun-sequence";
        const sequenceInfo = {
            id: sequenceId,
            config: {
                type: "process", engines: { bun: "1" }, id: sequenceId,
                entrypointPath: "index.js", name: sequenceId, version: "1.0.0",
                sequenceDir: sequencePath, language: "js"
            },
            instances: [], location: "STH"
        };
        const bootPath = path.join(temp, "boot.json");
        fs.writeFileSync(bootPath, JSON.stringify({
            sequencePath,
            instanceId: "00000000-0000-0000-0000-00000000beef",
            sequenceArgs: ["expected-arg"],
            instancesServerHost: "127.0.0.1",
            instancesServerPort: server.address().port,
            sequenceInfo,
            appConfig: {},
            exitTimeout: 50,
            requestsUnsupported: "requests omitted by local channel harness"
        }));

        const command = runtime === "node"
            ? [process.execPath, ["-r", require.resolve("tsx/cjs"), NODE_RUNNER, bootPath]]
            : [process.env.BUN_BIN || "bun", ["src/bin/runner-bun.ts", bootPath]];
        let nodeBin = process.execPath;
        if (options.nodeBin === "invalid") nodeBin = path.join(temp, "must-not-spawn-node");
        if (options.nodeBin === "shim") {
            pidFile = path.join(temp, "delegated-node.json");
            nodeBin = path.join(temp, "recording-node");
            const shell = [
                "#!/bin/sh",
                `artifact=/tmp/runner-$$; if [ -e "$artifact" ]; then absent=false; else absent=true; fi`,
                `printf '{"pid":%s,"artifactAbsent":%s}\\n' "$$" "$absent" > ${shellQuote(pidFile)}`,
                `exec ${shellQuote(process.execPath)} "$@"`,
                "",
            ].join("\n");
            fs.writeFileSync(nodeBin, shell, { mode: 0o700 });
        }
        child = spawn(command[0], command[1], {
            cwd: PACKAGE_ROOT,
            env: { ...process.env, NODE_BIN: nodeBin },
            detached: true,
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]
        });
        const outerExitPath = `/tmp/runner-${child.pid}`;
        const outerArtifactAbsent = !fs.existsSync(outerExitPath);
        child.stdout.resume();
        child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
        const closed = new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
        let monitorEnded = false;
        child.stdio[5].once("end", () => { monitorEnded = true; });
        child.stdio[5].setEncoding("utf8").on("data", chunk => {
            monitorBuffer += chunk;
            const lines = monitorBuffer.split("\n");
            monitorBuffer = lines.pop();
            for (const line of lines) {
                if (!line) continue;
                let frame;
                try { frame = JSON.parse(line.replace(/\r$/, "")); } catch { continue; }
                const [code, data] = frame;
                monitorFrames.push(frame);
                if (code === CODE.DECLARE && behavior === "declaration") {
                    sendControl([
                        [CODE.EVENT, { eventName: "native-bun-probe", message: "during-init" }],
                        [CODE.MANIFEST_RESULT, {
                            requestId: data.requestId,
                            accepted: true,
                            receipt: { instanceId: "00000000-0000-0000-0000-00000000beef", sequenceId, revision: "rev-native" }
                        }]
                    ]);
                }
            }
        });
        function sendControl(frames) {
            const bytes = Buffer.from(`${frames.map(frame => JSON.stringify(frame)).join("\n")}\n`);
            if (behavior === "success") {
                const split = bytes.indexOf(Buffer.from("é")) + 1;
                child.stdio[4].write(bytes.subarray(0, split));
                child.stdio[4].write(bytes.subarray(split));
            } else {
                child.stdio[4].write(bytes);
            }
        }

        child.stdio[4].on("error", () => undefined);
        child.stdio[4].write("");
        const expectedCode = behavior === "init-block-stop" ? 0
            : behavior === "init-block-kill" ? 137
            : behavior === "init-sync-throw" || behavior === "init-async-reject" || behavior === "missing-import"
                || behavior === "main-sync-throw" || behavior === "main-async-reject" ? 23 : 0;
        const timeoutMs = behavior === "init-block-eof" ? 2500 : 8000;
        timer = setInterval(() => {
            if (!fs.existsSync(markerPath)) return;
            let records;
            try { records = JSON.parse(fs.readFileSync(markerPath, "utf8")); } catch { return; }
            if (!controlActionSent && behavior === "success" && records.some(record => record.stage === "main")) {
                controlActionSent = true;
                sendControl([[CODE.EVENT, { eventName: "native-bun-probe", message: "héllo" }]]);
                return;
            }
            if (behavior === "init-block-keepalive" && records.some(record => record.stage === "initialize")) {
                if (controlActionStage === 0) {
                    controlActionStage = 1;
                    sendControl([[CODE.STOP, { timeout: 0, canCallKeepalive: true }]]);
                } else if (controlActionStage === 1 && monitorFrames.some(([code]) => code === 3010)) {
                    controlActionStage = 2;
                    sendControl([[CODE.STOP, { timeout: 0, canCallKeepalive: false }]]);
                }
                return;
            }
            if (controlActionSent) return;
            if (!records.some(record => record.stage === "initialize")) return;
            if (!["init-block-stop", "init-block-kill", "init-block-eof"].includes(behavior)) return;
            controlActionSent = true;
            if (behavior === "init-block-eof") child.stdio[4].end();
            else sendControl([[behavior === "init-block-stop" ? CODE.STOP : CODE.KILL, { timeout: 0, canCallKeepalive: false }]]);
        }, 10);
        const timeout = setTimeout(() => {
            try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
        }, timeoutMs);

        const outcome = await closed;
        clearTimeout(timeout);
        clearInterval(timer);
        timer = undefined;
        const expectedSignal = null;
        assert.equal(outcome.signal, expectedSignal, `unexpected signal ${outcome.signal}; stderr=${stderr}`);
        assert.equal(outcome.code, expectedCode, `unexpected exit ${outcome.code}; stderr=${stderr}`);
        assert.equal(monitorEnded, true, "fd5 monitoring stream did not close naturally");

        const records = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, "utf8")) : [];
        if (options.nodeBin === "invalid") {
            assert.deepEqual(records.map(record => record.stage), ["module", "initialize", "main", "callback"], "native Bun must run the author sequence without NODE_BIN");
            identityAssertions(records, "bun", child.pid);
        }
        const shimRecord = pidFile && fs.existsSync(pidFile) ? JSON.parse(fs.readFileSync(pidFile, "utf8")) : undefined;
        const runtimePid = records[0]?.pid ?? shimRecord?.pid ?? child.pid;
        const artifactAbsent = runtimePid === child.pid ? outerArtifactAbsent : shimRecord?.pid === runtimePid && shimRecord.artifactAbsent;
        assert.equal(artifactAbsent, true, `exit artifact for runtime PID ${runtimePid} existed before this test launched it`);
        const exitPath = `/tmp/runner-${runtimePid}`;
        ownedExitArtifacts.add(exitPath);
        assert.equal(fs.readFileSync(exitPath, "utf8"), String(outcome.code), `exit artifact ${exitPath} did not match observed exit`);
        if (["success", "declaration", "chain"].includes(behavior)) {
            const hasInitializer = !["function", "array"].includes(options.export || "default-function");
            const expectedStages = behavior === "chain"
                ? options.export === "array"
                    ? ["module", "chain-first", "main"]
                    : ["module", "initialize", "chain-first", "main"]
                : behavior === "declaration"
                ? ["module", "initialize", "declaration", "callback", "main"]
                : hasInitializer ? ["module", "initialize", "main", "callback"] : ["module", "main", "callback"];
            assert.deepEqual(records.map(record => record.stage), expectedStages);
            if (options.identity) identityAssertions(records, options.identity, child.pid);
            else assert.equal(records.every(record => record.pid === records[0].pid), true, "author callbacks changed process");
            const mainRecord = records.find(record => record.stage === "main");
            if (behavior === "chain") {
                const firstRecord = records.find(record => record.stage === "chain-first");
                assert.deepEqual(firstRecord.args, ["expected-arg"]);
                assert.equal(firstRecord.inputIsStream, true);
                assert.deepEqual(mainRecord.args, ["expected-arg"]);
                assert.deepEqual(mainRecord.chainValues, [{ step: "first", argument: "expected-arg" }]);
                const scramjetPath = fs.realpathSync(records[0].scramjetPath);
                const localPath = path.relative(WORKSPACE_ROOT, scramjetPath);
                assert.ok(localPath && !localPath.startsWith("..") && !path.isAbsolute(localPath), `sequence resolved scramjet outside this worktree: ${scramjetPath}`);
                if (options.chainType === "generic") {
                    const lines = Buffer.concat(output).toString("utf8").trim().split(/\r?\n/);
                    assert.deepEqual(lines.map(line => JSON.parse(line)), [{ step: "second", argument: "expected-arg", chainValues: [{ step: "first", argument: "expected-arg" }] }]);
                } else if (options.chainType === "string") {
                    assert.deepEqual(Buffer.concat(output), Buffer.from("chain:expected-arg:done"));
                } else {
                    assert.deepEqual(Buffer.concat(output), Buffer.from([0, 255, 1]));
                }
                assert.equal(outputEnded, true, "chained stream output did not flush and close before child exit");
            } else {
                assert.equal(mainRecord.sameContext, true);
            }
            if (behavior === "success") {
                assert.deepEqual(mainRecord.args, ["expected-arg"]);
                assert.equal(mainRecord.inputIsStream, true);
                const expectedOutput = options.output === "primitive" ? Buffer.from("primitive-output")
                    : options.output === "text" ? Buffer.from("plain-text")
                    : Buffer.from([0x74,0x65,0x78,0x74,0x2d,0,255,1]);
                assert.deepEqual(Buffer.concat(output), expectedOutput);
                assert.equal(outputEnded, true, "OUT channel did not flush and close before child exit");
                assert.equal(records.find(record => record.stage === "callback").message, "héllo");
                const monitorCodes = monitorFrames.map(([code]) => code);
                assert.ok(monitorCodes.indexOf(CODE.READY) >= 0);
                assert.ok(monitorCodes.indexOf(3012) > monitorCodes.indexOf(CODE.READY), "PANG must follow READY");
                assert.equal(monitorCodes.at(-1), 3011, "SEQUENCE_COMPLETED must be the terminal monitor frame");
            } else if (behavior === "declaration") {
                assert.equal(records.find(record => record.stage === "declaration").revision, "rev-native");
            }
        } else if (behavior === "init-sync-throw" || behavior === "init-async-reject") {
            assert.deepEqual(records.map(record => record.stage), ["module", "initialize"]);
            assert.ok(monitorFrames.some(([code, data]) => code === CODE.READY && data.state === "errored"));
        } else if (behavior === "missing-import") {
            assert.deepEqual(records, []);
            assert.match(stderr, /missing-module/);
            assert.ok(monitorFrames.some(([code, data]) => code === CODE.READY && data.state === "errored"));
        } else if (behavior === "main-sync-throw" || behavior === "main-async-reject") {
            assert.deepEqual(records.map(record => record.stage), ["module", "initialize", "main"]);
            assert.ok(monitorFrames.some(([code]) => code === 3006), "runtime error must emit SEQUENCE_STOPPED");
        } else if (behavior.startsWith("init-block-")) {
            assert.deepEqual(records.map(record => record.stage), ["module", "initialize"]);
            assert.equal(monitorFrames.some(([code, data]) => code === CODE.READY && data.state === "ready"), false,
                "terminal initialization control must not report ready");
            if (behavior === "init-block-stop") assert.ok(monitorFrames.some(([code]) => code === 3006), "STOP must emit SEQUENCE_STOPPED");
            if (behavior === "init-block-keepalive") {
                assert.ok(monitorFrames.some(([code]) => code === 3010), "keepalive handler must emit ALIVE");
                const aliveIndex = monitorFrames.findIndex(([code]) => code === 3010);
                const stoppedIndex = monitorFrames.findIndex(([code]) => code === 3006);
                assert.ok(aliveIndex >= 0, "permitted first STOP must emit ALIVE");
                assert.ok(stoppedIndex > aliveIndex, "SEQUENCE_STOPPED must follow keepalive only after terminal STOP");
            }
        }
        return { code: outcome.code, signal: outcome.signal, records, stderr, output: Buffer.concat(output).toString("hex"), outputEnded, monitorCodes: monitorFrames.map(([code]) => code) };
    } finally {
        if (timer) clearInterval(timer);
        if (child && child.exitCode === null && child.signalCode === null) {
            try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
            await new Promise(resolve => child.once("close", resolve));
        }
        for (const socket of sockets) socket.destroy();
        if (server?.listening) await new Promise(resolve => server.close(resolve));
        for (const exitPath of ownedExitArtifacts) fs.rmSync(exitPath, { force: true });
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

async function fdProbe() {
    const source = `
const { createReadStream, createWriteStream } = require("node:fs");
const input = createReadStream(null, { fd: 4, autoClose: false });
const output = createWriteStream(null, { fd: 5, autoClose: false });
let buffer = Buffer.alloc(0);
let count = 0;
process.stdout.write("ready\\n");
input.on("data", chunk => {
  buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
  if (!buffer.includes(0x0a)) process.stdout.write("fragment\\n");
  let index;
  while ((index = buffer.indexOf(0x0a)) !== -1) {
    const line = buffer.subarray(0, index).toString("utf8");
    buffer = buffer.subarray(index + 1);
    output.write(JSON.stringify(JSON.parse(line)) + "\\n");
    count += 1;
    if (count === 2) output.end(() => process.exit(0));
  }
});
`;
    const child = spawn(process.env.BUN_BIN || "bun", ["-e", source], { stdio: ["ignore", "pipe", "pipe", "ipc", "pipe", "pipe"] });
    let stdout = "";
    let response = "";
    let stderr = "";
    let outputEnded = false;
    child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    child.stdio[5].setEncoding("utf8").on("data", chunk => { response += chunk; });
    child.stdio[5].once("end", () => { outputEnded = true; });
    const closed = new Promise(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
    const deadline = Date.now() + 5000;
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    const waitMarker = async marker => {
        while (!stdout.includes(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
        assert.ok(stdout.includes(marker), `Bun fd child did not report ${marker}; stderr=${stderr}`);
    };
    try {
        await waitMarker("ready\n");
        const first = Buffer.from(`${JSON.stringify([5001, { message: "hé🌍llo" }])}\n`);
        const split = first.indexOf(Buffer.from("🌍")) + 2;
        child.stdio[4].write(first.subarray(0, split));
        await waitMarker("fragment\n");
        child.stdio[4].write(Buffer.concat([first.subarray(split), Buffer.from(`${JSON.stringify([5002, { order: 2 }])}\n`)]));
        const outcome = await closed;
        clearTimeout(timeout);
        child.stdio[4].end();
        assert.equal(outcome.signal, null, "timeout-killed Bun fd probe is a failure");
        assert.equal(outcome.code, 0);
        assert.equal(outputEnded, true, "fd5 output must reach EOF while the parent control writer remains open");
        assert.deepEqual(response.split("\n").filter(Boolean).map(line => JSON.parse(line)), [
            [5001, { message: "hé🌍llo" }], [5002, { order: 2 }]
        ]);
        return { code: outcome.code, outputEnded };
    } finally {
        clearTimeout(timeout);
        child.stdio[4].end();
        if (child.exitCode === null && child.signalCode === null) {
            child.kill("SIGKILL");
            await closed;
        }
    }
}

async function main() {
    const options = parseOptions(process.argv.slice(2));
    const result = options.probe === "fd" ? await fdProbe() : await runHosted(options);
    process.stdout.write(JSON.stringify(result));
}

main().catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});

"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Worker } = require("node:worker_threads");

const repoRoot = path.resolve(__dirname, "../..");
const cliRoot = path.join(repoRoot, "packages/cli");
const workerPreload = path.join(repoRoot, "scripts/lib/ava-cli-test-isolation.cjs");
const cliPathsModule = path.join(cliRoot, "src/lib/paths.ts");
const cliConfigModule = path.join(cliRoot, "src/lib/config/index.ts");
const tsxCjsRegister = require.resolve("tsx/cjs", { paths: [repoRoot] });

const workerSource = `
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parentPort, workerData } = require("node:worker_threads");

function waitForAcknowledgement(type) {
    return new Promise(resolve => {
        const onMessage = message => {
            if (message.type !== type) return;
            parentPort.off("message", onMessage);
            resolve();
        };
        parentPort.on("message", onMessage);
    });
}

(async () => {
    const setupCliTestIsolation = require(workerData.preload);
    if (typeof setupCliTestIsolation !== "function") throw new Error("CLI isolation preload must export a setup function");
    setupCliTestIsolation();
    require(workerData.tsxCjsRegister);

    const paths = require(workerData.cliPathsModule);
    const config = require(workerData.cliConfigModule);
    config.siConfig.setProfile("default");
    config.sessionConfig.setLastHubId("worker-" + workerData.name);

    const home = os.homedir();
    const temp = os.tmpdir();
    const childEnvironment = JSON.parse(execFileSync(process.execPath, ["-e", [
        "const os = require('node:os');",
        "process.stdout.write(JSON.stringify({ home: os.homedir(), temp: os.tmpdir(), homeEnv: process.env.HOME, tempEnv: process.env.TMPDIR }));"
    ].join(" ")], { encoding: "utf8" }));
    const state = {
        name: workerData.name,
        ownedRoot: path.dirname(home),
        home,
        temp,
        homeEnv: process.env.HOME,
        tempEnv: process.env.TMPDIR,
        siConfigFile: paths.siConfigFile,
        sessionConfigFile: paths.sessionConfigFile,
        childEnvironment,
        storedProfile: JSON.parse(fs.readFileSync(paths.siConfigFile, "utf8")).profile
    };

    if (workerData.truncateConfig) {
        const descriptor = fs.openSync(paths.siConfigFile, "w");
        fs.writeFileSync(descriptor, "{", "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        parentPort.postMessage({ type: "truncated", state });
        await waitForAcknowledgement("restore");
        fs.writeFileSync(paths.siConfigFile, JSON.stringify({ profile: "default" }, null, 2) + "\\n", "utf8");
        parentPort.postMessage({ type: "restored", state });
        await waitForAcknowledgement("acknowledge-restored");
    } else {
        parentPort.postMessage({ type: "ready", state });
        await waitForAcknowledgement("acknowledge-ready");
    }

    if (workerData.failAfterSetup) throw new Error("intentional worker test failure");
    parentPort.close();
})().catch(error => {
    setImmediate(() => { throw error; });
});
`;

function startCliWorker(options) {
    const worker = new Worker(workerSource, {
        eval: true,
        workerData: {
            preload: workerPreload,
            tsxCjsRegister,
            cliPathsModule,
            cliConfigModule,
            ...options
        }
    });
    const messages = [];
    const waiters = [];
    let workerError;

    worker.on("message", message => {
        const index = waiters.findIndex(waiter => waiter.type === message.type);
        if (index === -1) messages.push(message);
        else waiters.splice(index, 1)[0].resolve(message.state);
    });
    worker.on("error", error => {
        workerError = error;
        for (const waiter of waiters.splice(0)) waiter.reject(error);
    });
    const error = new Promise(resolve => {
        worker.once("error", resolve);
        worker.once("exit", code => { if (code === 0) resolve(null); });
    });

    return {
        worker,
        error,
        exit: new Promise(resolve => worker.once("exit", resolve)),
        waitFor(type) {
            const index = messages.findIndex(message => message.type === type);
            if (index !== -1) return Promise.resolve(messages.splice(index, 1)[0].state);
            if (workerError) return Promise.reject(workerError);
            return new Promise((resolve, reject) => waiters.push({ type, resolve, reject }));
        }
    };
}

function assertWorkerPaths(t, state) {
    const root = state.ownedRoot;
    t.is(state.home, path.join(root, "home"));
    t.is(state.temp, path.join(root, "tmp"));
    t.is(state.homeEnv, state.home);
    t.is(state.tempEnv, state.temp);
    t.is(path.dirname(state.siConfigFile), path.join(state.home, ".si"));
    t.true(state.sessionConfigFile.startsWith(path.join(state.temp, ".si-tmp")));
    t.is(state.storedProfile, "default");
    t.deepEqual(state.childEnvironment, {
        home: state.home,
        temp: state.temp,
        homeEnv: state.home,
        tempEnv: state.temp
    }, "CLI child processes must inherit the worker's private paths");
}

test.serial("CLI workers isolate config imports while another worker has a truncated config", async t => {
    const parentPaths = {
        home: os.homedir(),
        temp: os.tmpdir(),
        homeEnv: process.env.HOME,
        tempEnv: process.env.TMPDIR
    };
    const writer = startCliWorker({ name: "writer", truncateConfig: true });
    let reader;
    let writerRoot;
    let readerRoot;
    let readerReady = false;
    let writerExited = false;
    let writerRestoreRequested = false;
    let writerRestored = false;
    let writerAcknowledged = false;
    let readerAcknowledged = false;

    try {
        const truncated = await writer.waitFor("truncated");
        writerRoot = truncated.ownedRoot;
        assertWorkerPaths(t, truncated);
        t.is(fs.readFileSync(truncated.siConfigFile, "utf8"), "{", "the writer must be held at the vulnerable truncate-before-write point");

        reader = startCliWorker({ name: "reader" });
        const ready = await reader.waitFor("ready");
        readerReady = true;
        readerRoot = ready.ownedRoot;
        assertWorkerPaths(t, ready);
        t.not(ready.siConfigFile, truncated.siConfigFile);
        t.not(ready.sessionConfigFile, truncated.sessionConfigFile);
        t.not(ready.home, truncated.home);
        t.not(ready.temp, truncated.temp);
        t.is(JSON.parse(fs.readFileSync(ready.siConfigFile, "utf8")).profile, "default");

        reader.worker.postMessage({ type: "acknowledge-ready" });
        readerAcknowledged = true;
        t.is(await reader.exit, 0, "the second worker must finish its real CLI configuration import");
        reader = undefined;

        writer.worker.postMessage({ type: "restore" });
        writerRestoreRequested = true;
        await writer.waitFor("restored");
        writerRestored = true;
        t.is(JSON.parse(fs.readFileSync(truncated.siConfigFile, "utf8")).profile, "default");
        writer.worker.postMessage({ type: "acknowledge-restored" });
        writerAcknowledged = true;
        t.is(await writer.exit, 0);
        writerExited = true;
        t.false(fs.existsSync(readerRoot), "a successful worker removes only its owned temporary root");
        t.false(fs.existsSync(writerRoot), "the writer removes its owned root after completing");
        t.is(os.homedir(), parentPaths.home);
        t.is(os.tmpdir(), parentPaths.temp);
        t.is(process.env.HOME, parentPaths.homeEnv);
        t.is(process.env.TMPDIR, parentPaths.tempEnv);
    } finally {
        if (reader && !readerAcknowledged) {
            try {
                if (!readerReady) await reader.waitFor("ready");
                reader.worker.postMessage({ type: "acknowledge-ready" });
            } catch {
                // The reader may already have failed before posting its ready state.
            }
        }
        if (reader) await reader.exit;
        if (!writerExited && !writerAcknowledged) {
            try {
                if (!writerRestored) {
                    if (!writerRestoreRequested) writer.worker.postMessage({ type: "restore" });
                    await writer.waitFor("restored");
                    writerRestored = true;
                }
                writer.worker.postMessage({ type: "acknowledge-restored" });
            } catch {
                // The writer may already have failed before reaching the restore handshake.
            }
        }
        if (!writerExited) await writer.exit;
    }
});

test.serial("CLI isolation removes its owned root after an ordinary worker test failure", async t => {
    const parentPaths = { home: os.homedir(), temp: os.tmpdir(), homeEnv: process.env.HOME, tempEnv: process.env.TMPDIR };
    const failedWorker = startCliWorker({ name: "failure", failAfterSetup: true });
    let ready;
    let acknowledged = false;
    try {
        ready = await failedWorker.waitFor("ready");
        assertWorkerPaths(t, ready);

        failedWorker.worker.postMessage({ type: "acknowledge-ready" });
        acknowledged = true;
        const error = await failedWorker.error;
        t.truthy(error, "a worker failure must emit an error");
        t.regex(error.message, /intentional worker test failure/);
        t.is(await failedWorker.exit, 1);
        t.false(fs.existsSync(ready.ownedRoot), "failure cleanup removes the worker-owned root");
        t.true(fs.existsSync(path.dirname(ready.ownedRoot)), "failure cleanup leaves the containing temp directory alone");
        t.is(os.homedir(), parentPaths.home);
        t.is(os.tmpdir(), parentPaths.temp);
        t.is(process.env.HOME, parentPaths.homeEnv);
        t.is(process.env.TMPDIR, parentPaths.tempEnv);
    } finally {
        if (ready && !acknowledged) failedWorker.worker.postMessage({ type: "acknowledge-ready" });
        await failedWorker.exit;
    }
});

test("CLI AVA require hooks install path isolation before TypeScript registration", t => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(cliRoot, "package.json"), "utf8"));
    const hooks = packageJson.ava.require;
    const isolationIndex = hooks.indexOf("../../scripts/lib/ava-cli-test-isolation.cjs");
    const tsxIndex = hooks.indexOf("../../scripts/lib/tsx-cjs-register.cjs");
    t.true(isolationIndex >= 0);
    t.true(tsxIndex > isolationIndex);
    t.is(typeof require(workerPreload), "function");
});

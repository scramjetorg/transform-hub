import baseTest from "ava";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { profileConfigDefault } from "../src/lib/config/commonProfileConfig";
import { writeCliConfigAtomically } from "../src/lib/config/writeCliConfigAtomically";

const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
const stagedCli = require.resolve("../src/bin/index");
const stagedPackageDir = path.resolve(__dirname, "..");
const tsxRegister = path.resolve(__dirname, "../../../scripts/lib/tsx-cjs-register.cjs");

const waitForFile = (filename: string, timeout = 10000) => {
    let timer: NodeJS.Timeout | undefined;
    let cancel = () => {};
    const promise = new Promise<void>((resolve, reject) => {
        cancel = () => {
            if (timer) clearTimeout(timer);
            resolve();
        };
        const deadline = Date.now() + timeout;
        const poll = () => {
            if (fs.existsSync(filename)) return resolve();
            if (Date.now() >= deadline) return reject(new Error(`Timed out waiting for ${filename}`));
            timer = setTimeout(poll, 10);
        };
        poll();
    });
    return { promise, cancel: () => cancel() };
};

type ChildResult = { code: number | null; signal: NodeJS.Signals | null; output: string; launchError?: Error };
type ChildRun = { child?: ReturnType<typeof spawn>; completion: Promise<ChildResult>; role: string; executable: string; cwd: string };

const startCli = (role: string, executable: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ChildRun => {
    let child: ReturnType<typeof spawn> | undefined;
    let launchError: Error | undefined;
    let output = "";
    let timeout: NodeJS.Timeout | undefined;
    const completion = new Promise<ChildResult>(resolve => {
        const settle = (code: number | null, signal: NodeJS.Signals | null) => {
            if (timeout) clearTimeout(timeout);
            resolve({ code, signal, output, launchError });
        };
        try {
            child = spawn(executable, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
            child.stdout?.on("data", chunk => output += chunk);
            child.stderr?.on("data", chunk => output += chunk);
            child.on("error", error => { launchError = error; });
            child.once("close", settle);
            timeout = setTimeout(() => child?.kill(), 30000);
        } catch (error) {
            launchError = error as Error;
            settle(null, null);
        }
    });
    return { child, completion, role, executable, cwd };
};

const requireSuccessfulExit = (result: ChildResult, run: ChildRun) => {
    if (result.launchError || result.code !== 0) {
        throw new Error(`${run.role} failed (executable=${run.executable}, cwd=${run.cwd}, code=${result.code}, signal=${result.signal}): ${result.launchError ?? result.output}`);
    }
};

const stopCli = async (run: ChildRun, timeoutMs = 3000) => {
    if (!run.child || run.child.exitCode !== null || run.child.signalCode !== null) return run.completion;
    run.child.kill();
    let timeout: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            run.completion,
            new Promise<ChildResult>(resolve => {
                timeout = setTimeout(() => {
                    run.child?.kill("SIGKILL");
                    resolve({ code: null, signal: "SIGKILL", output: "child did not close after termination request" });
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeout) clearTimeout(timeout);
    }
};

test("two initialized CLI processes never observe a partial config during persistence", async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-process-race-"));
    const home = path.join(directory, "home");
    const selected = path.join(directory, "selected.json");
    const profileDir = path.join(home, ".si", "profiles");
    const defaultProfile = path.join(profileDir, "default.json");
    const alternateProfile = path.join(profileDir, "alternate.json");
    const siConfig = path.join(home, ".si", "si-config.json");
    const profile = { ...profileConfigDefault, log: { ...profileConfigDefault.log } };
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(defaultProfile, JSON.stringify(profile, null, 2));
    fs.writeFileSync(alternateProfile, JSON.stringify(profile, null, 2));
    fs.writeFileSync(siConfig, JSON.stringify({ profile: "default" }, null, 2));
    fs.writeFileSync(selected, JSON.stringify(profile, null, 2));

    const preload = path.join(directory, "pause-rename.cjs");
    fs.writeFileSync(preload, `
const fs = require("fs");
const originalRename = fs.renameSync;
fs.renameSync = function(from, to) {
  if (String(to) === process.env.CLI_ATOMIC_TARGET && String(from).includes(".tmp-")) {
    fs.writeFileSync(process.env.CLI_ATOMIC_PAUSED, "paused");
    const deadline = Date.now() + 20000;
    while (!fs.existsSync(process.env.CLI_ATOMIC_RELEASE) && Date.now() < deadline) {}
  }
  return originalRename.call(this, from, to);
};
`);
    const noBuiltCliPreload = path.join(directory, "forbid-built-cli.cjs");
    fs.writeFileSync(noBuiltCliPreload, `
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  const resolved = originalResolveFilename.call(this, request, parent, isMain, options);
  if (String(resolved).includes("/dist/cli/") || String(resolved).includes("/packages/cli/dist/")) {
    throw new Error("CLI child unexpectedly resolved a built CLI artifact: " + resolved);
  }
  return resolved;
};
`);
    t.true(stagedCli.includes(`${path.sep}.ava-cli${path.sep}src${path.sep}bin${path.sep}index`), `CLI entry must resolve from AVA's staged package: ${stagedCli}`);

    const scenarios = [
        { name: "default profile", target: defaultProfile, command: ["config", "set", "apiUrl", "http://127.0.0.1:8123/api/v1"], readArgs: ["-c", selected, "config", "print"], expected: { apiUrl: "http://127.0.0.1:8123/api/v1" } },
        { name: "selected mutable config", target: selected, command: ["-c", selected, "config", "set", "apiUrl", "http://127.0.0.1:8124/api/v1"], readArgs: ["-c", selected, "config", "print"], expected: { apiUrl: "http://127.0.0.1:8124/api/v1" } },
        { name: "si config", target: siConfig, command: ["config", "profile", "use", "alternate"], readArgs: ["-c", selected, "config", "print"], expected: { profile: "alternate" } },
    ];

    try {
      for (const scenario of scenarios) {
        const before = fs.readFileSync(scenario.target, "utf8");
        const paused = path.join(directory, `${scenario.name.replaceAll(" ", "-")}.paused`);
        const release = path.join(directory, `${scenario.name.replaceAll(" ", "-")}.release`);
        const env = { ...process.env, SCRAMJET_HOME: home, CLI_ATOMIC_TARGET: scenario.target, CLI_ATOMIC_PAUSED: paused, CLI_ATOMIC_RELEASE: release };
        const writer = startCli("writer", process.execPath,
            ["--require", tsxRegister, "--require", noBuiltCliPreload, "--require", preload, stagedCli, ...scenario.command],
            stagedPackageDir, { ...env, NODE_OPTIONS: "" });
        let didPause = false;
        let scenarioFailure: unknown;
        let writerResult: ChildResult | undefined;
        const markerWait = waitForFile(paused);
        try {
            await Promise.race([markerWait.promise, writer.completion.then(result => {
                throw new Error(`${scenario.name} writer for ${scenario.target} exited before pausing (code=${result.code}, signal=${result.signal}, executable=${writer.executable}, cwd=${writer.cwd}): ${result.launchError ?? result.output}`);
            })]);
            didPause = true;
            t.is(fs.readFileSync(scenario.target, "utf8"), before, `${scenario.name}: destination remains the complete old JSON while rename is paused`);
            const reader = startCli("reader", process.execPath, ["--require", tsxRegister, "--require", noBuiltCliPreload, stagedCli, ...scenario.readArgs],
                stagedPackageDir, { ...env, NODE_OPTIONS: "" });
            const second = await reader.completion;
            requireSuccessfulExit(second, reader);
            t.notThrows(() => JSON.parse(fs.readFileSync(scenario.target, "utf8")), `${scenario.name}: old destination remains parseable`);
        } catch (error) {
            scenarioFailure = error;
        } finally {
            markerWait.cancel();
            fs.writeFileSync(release, "release");
            writerResult = didPause ? await writer.completion : await stopCli(writer);
        }
        if (scenarioFailure) throw scenarioFailure;
        if (didPause && writerResult) requireSuccessfulExit(writerResult, writer);
        t.deepEqual(fs.readdirSync(path.dirname(scenario.target)).filter(name => name.includes(".tmp-")), [], `${scenario.name}: no temporary files remain`);
        t.deepEqual(JSON.parse(fs.readFileSync(scenario.target, "utf8")), { ...JSON.parse(before), ...scenario.expected }, `${scenario.name}: intended mutation is persisted`);
      }
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI child launcher settles for missing cwd, executable, and script", async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-child-launch-"));
    try {
        const missingCwd = startCli("missing-cwd", process.execPath, ["--version"], path.join(directory, "missing-cwd"), { ...process.env, NODE_OPTIONS: "" });
        const cwdResult = await missingCwd.completion;
        t.truthy(cwdResult.launchError);
        t.regex(String(cwdResult.launchError), /ENOENT/);

        const missingExecutable = startCli("missing-executable", path.join(directory, "no-node"), [], directory, process.env);
        const executableResult = await missingExecutable.completion;
        t.truthy(executableResult.launchError);
        t.regex(String(executableResult.launchError), /ENOENT/);

        const missingScript = path.join(directory, "missing-script.js");
        const missingScriptRun = startCli("missing-script", process.execPath, [missingScript], directory, { ...process.env, NODE_OPTIONS: "" });
        const scriptResult = await missingScriptRun.completion;
        t.falsy(scriptResult.launchError);
        t.not(isNaN(scriptResult.code as number));
        t.not(scriptResult.code, 0);
        t.is(missingCwd.child?.exitCode, -2);
        t.is(missingExecutable.child?.exitCode, -2);
        t.not(missingScriptRun.child?.exitCode, null);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("atomic CLI config writes retain permissions/ownership and create missing parents", t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-atomic-"));
    const target = path.join(directory, "nested", "config.json");
    t.true(writeCliConfigAtomically(target, { profile: "before" }));
    t.is(fs.statSync(target).mode & 0o777, 0o600);

    fs.chmodSync(target, 0o640);
    const owner = fs.statSync(target);
    t.true(writeCliConfigAtomically(target, { profile: "after" }));
    const written = fs.statSync(target);
    t.is(written.mode & 0o777, 0o640);
    t.is(written.uid, owner.uid);
    t.is(written.gid, owner.gid);
    t.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { profile: "after" });
    t.deepEqual(fs.readdirSync(path.dirname(target)), ["config.json"]);
    fs.rmSync(directory, { recursive: true, force: true });
});

test("atomic CLI config write reports failure and removes its temporary file", t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-atomic-failure-"));
    const target = path.join(directory, "config.json");
    fs.mkdirSync(target);
    t.false(writeCliConfigAtomically(target, { profile: "after" }));
    t.true(fs.statSync(target).isDirectory());
    t.deepEqual(fs.readdirSync(directory), ["config.json"]);
    fs.rmSync(directory, { recursive: true, force: true });
});

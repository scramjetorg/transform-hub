import baseTest from "ava";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { profileConfigDefault } from "../src/lib/config/commonProfileConfig";
import { writeCliConfigAtomically } from "../src/lib/config/writeCliConfigAtomically";

const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
const cliArtifact = path.resolve(__dirname, "../../../dist/cli/bin/index.js");

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

const runCli = (args: string[], env: NodeJS.ProcessEnv) => new Promise<{ code: number | null; output: string }>(resolve => {
    const child = spawn(process.execPath, [cliArtifact, ...args], { cwd: path.dirname(cliArtifact), env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => output += chunk);
    child.stderr.on("data", chunk => output += chunk);
    child.once("exit", code => resolve({ code, output }));
});

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
        const first = spawn(process.execPath, ["--require", preload, cliArtifact, ...scenario.command], { cwd: path.dirname(cliArtifact), env, stdio: ["ignore", "pipe", "pipe"] });
        let firstOutput = "";
        let firstError: Error | undefined;
        first.on("error", error => firstError = error);
        first.stdout.on("data", chunk => firstOutput += chunk);
        first.stderr.on("data", chunk => firstOutput += chunk);
        const firstExit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => first.once("exit", (code, signal) => resolve({ code, signal })));
        let didPause = false;
        const markerWait = waitForFile(paused);
        try {
            await Promise.race([markerWait.promise, firstExit.then(exit => { throw new Error(`${scenario.name} writer for ${scenario.target} exited before pausing (${exit.code ?? exit.signal}): ${firstError ?? firstOutput}`); })]);
            didPause = true;
            t.is(fs.readFileSync(scenario.target, "utf8"), before, `${scenario.name}: destination remains the complete old JSON while rename is paused`);
            const second = await runCli(scenario.readArgs, { ...env, NODE_OPTIONS: "" });
            t.is(second.code, 0, `${scenario.name}: concurrent CLI startup/read succeeds: ${second.output}`);
            t.notThrows(() => JSON.parse(fs.readFileSync(scenario.target, "utf8")), `${scenario.name}: old destination remains parseable`);
        } finally {
            markerWait.cancel();
            fs.writeFileSync(release, "release");
            if (!didPause && first.exitCode === null) first.kill();
            const exit = await firstExit;
            if (didPause) t.is(exit.code, 0, `${scenario.name}: writer exits successfully (${exit.signal ?? "no signal"}): ${firstOutput}`);
        }
        t.deepEqual(fs.readdirSync(path.dirname(scenario.target)).filter(name => name.includes(".tmp-")), [], `${scenario.name}: no temporary files remain`);
        t.deepEqual(JSON.parse(fs.readFileSync(scenario.target, "utf8")), { ...JSON.parse(before), ...scenario.expected }, `${scenario.name}: intended mutation is persisted`);
      }
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

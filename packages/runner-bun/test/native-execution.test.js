import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const HARNESS = resolve(import.meta.dir, "native-host-harness.cjs");

function runHarness(options = {}) {
    const args = Object.entries(options).map(([key, value]) => `--${key}=${value}`);
    return new Promise((resolveResult, reject) => {
        const child = spawn("node", [HARNESS, ...args], {
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 20000,
            env: { ...process.env, BUN_BIN: process.execPath },
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
        child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
        child.once("error", reject);
        child.once("close", code => resolveResult({ code, stdout, stderr }));
    });
}

async function expectHarnessSuccess(options) {
    const result = await runHarness(options);
    expect(result.code, `hosted harness failed:\n${result.stderr}`).toBe(0);
    return JSON.parse(result.stdout);
}

test("Bun wrapper must run author callbacks under Bun even when NODE_BIN launches real Node", { timeout: 20000 }, async () => {
    const result = await runHarness({ runner: "bun", nodeBin: "shim", identity: "bun" });
    expect(result.code, `native Bun identity assertion failed:\n${result.stderr}`).toBe(0);
    const evidence = JSON.parse(result.stdout);
    expect(evidence.records.map(record => record.stage)).toEqual(["module", "initialize", "main", "callback"]);
});

test("native Bun execution must not depend on a usable NODE_BIN", { timeout: 20000 }, async () => {
    const result = await runHarness({ runner: "bun", nodeBin: "invalid" });
    expect(result.code, `runner still attempted Node delegation:\n${result.stderr}`).toBe(0);
});

for (const exportForm of ["function", "array", "default-function", "default-array"]) {
    for (const runner of ["node", "bun"]) {
        test(`${runner} hosted baseline supports ${exportForm} sequence exports`, { timeout: 20000 }, async () => {
            const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", export: exportForm });
            const expectedStages = ["function", "array"].includes(exportForm)
                ? ["module", "main", "callback"]
                : ["module", "initialize", "main", "callback"];
            expect(evidence.records.map(record => record.stage)).toEqual(expectedStages);
            const mainRecord = evidence.records.find(record => record.stage === "main");
            expect(mainRecord.args).toEqual(["expected-arg"]);
            expect(mainRecord.sameContext).toBe(true);
        });
    }
}

for (const [label, options] of [
    ["binary readable output", { output: "binary" }],
    ["text readable output", { output: "text" }],
    ["primitive output", { output: "primitive" }],
]) {
    for (const runner of ["node", "bun"]) {
        test(`${runner} hosted sequence baseline preserves ${label}`, { timeout: 20000 }, async () => {
            const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", ...options });
            expect(evidence.records.map(record => record.stage)).toEqual(["module", "initialize", "main", "callback"]);
        });
    }
}

for (const exportForm of ["array", "default-array"]) {
    for (const chainType of ["generic", "string", "buffer"]) {
        for (const runner of ["node", "bun"]) {
            test(`${runner} hosted ${exportForm} chains multiple functions with ${chainType} Scramjet stream semantics`, { timeout: 20000 }, async () => {
                const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", export: exportForm, behavior: "chain", chainType, identity: runner });
                const expectedStages = exportForm === "array"
                    ? ["module", "chain-first", "main"]
                    : ["module", "initialize", "chain-first", "main"];
                expect(evidence.records.map(record => record.stage)).toEqual(expectedStages);
                expect(evidence.records.find(record => record.stage === "chain-first").args).toEqual(["expected-arg"]);
                expect(evidence.records.find(record => record.stage === "main").chainValues).toEqual([{ step: "first", argument: "expected-arg" }]);
                expect(evidence.outputEnded).toBe(true);
            });
        }
    }
}

for (const behavior of ["init-sync-throw", "init-async-reject", "missing-import", "main-sync-throw", "main-async-reject"]) {
    for (const runner of ["node", "bun"]) {
        test(`${runner} hosted sequence reports ${behavior} through terminal exit`, { timeout: 20000 }, async () => {
            const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", behavior });
            expect(evidence.code).toBe(23);
            expect(evidence.signal, "a harness-forced signal is not a valid runtime failure result").toBe(null);
        });
    }
}

for (const behavior of ["init-block-stop", "init-block-kill", "init-block-keepalive"]) {
    for (const runner of ["node", "bun"]) {
        test(`${runner} hosted initialization handles ${behavior}`, { timeout: 20000 }, async () => {
            const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", behavior });
            expect(evidence.signal, "lifecycle control must terminate cleanly without harness kill").toBe(null);
            expect(evidence.code).toBe(behavior === "init-block-kill" ? 137 : 0);
        });
    }
}

test("runner-node and Bun hosted initialization accept manifest receipt plus ordinary event", { timeout: 20000 }, async () => {
    for (const runner of ["node", "bun"]) {
        const evidence = await expectHarnessSuccess({ runner, nodeBin: "shim", behavior: "declaration" });
        expect(evidence.records.map(record => record.stage)).toEqual(["module", "initialize", "declaration", "callback", "main"]);
        expect(evidence.records.find(record => record.stage === "declaration").revision).toBe("rev-native");
    }
});

for (const runner of ["node", "bun"]) {
    test(`${runner} hosted initialization control EOF closes without a harness-forced kill`, { timeout: 10000 }, async () => {
        const result = await runHarness({ runner, nodeBin: "shim", behavior: "init-block-eof" });
        expect(result.code, `control EOF did not settle naturally (forced shutdown is failure):\n${result.stderr}`).toBe(0);
    });
}

test("Bun fd4/fd5 compatibility probe preserves fragmented UTF-8, frame order, and output EOF", { timeout: 12000 }, async () => {
    const evidence = await expectHarnessSuccess({ probe: "fd" });
    expect(evidence.outputEnded).toBe(true);
});

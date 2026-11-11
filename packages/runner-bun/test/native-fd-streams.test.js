import { expect, test } from "bun:test";
import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const HARNESS = resolve(import.meta.dir, "native-fd-streams-harness.cjs");
const NODE = execFileSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).trim();
const BUN = process.execPath;

function run(mode) {
    return new Promise((resolveResult, reject) => {
        const child = spawn(NODE, [HARNESS, mode, BUN], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
        child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
        child.once("error", reject);
        child.once("close", code => {
            if (code !== 0) {
                reject(new Error(`Node-parent fd harness (${mode}) exited ${code}: ${stderr}`));
                return;
            }
            try {
                resolveResult(JSON.parse(stdout));
            } catch (error) {
                reject(new Error(`Could not parse Node-parent fd harness output: ${stdout}; stderr=${stderr}; ${error}`));
            }
        });
    });
}

test("Bun fd adapter uses the real Node-parent six-descriptor map and preserves fragmented/coalesced UTF-8 through EOF", { timeout: 15000 }, async () => {
    const evidence = await run("framing");
    const expected = Buffer.from('{"event":"hé🌍"}\n{"next":2}\n');
    expect(evidence.outcome).toEqual({ code: 0, signal: null });
    expect(evidence.forced).toBe(false);
    expect(typeof evidence.bunVersion).toBe("string");
    expect(evidence.childPid).toBeGreaterThan(0);
    expect(evidence.bunExecutable).toBe(BUN);
    expect(evidence.outputEnded).toBe(true);
    expect(Buffer.from(evidence.outputHex, "hex")).toEqual(expected);
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "input-eof", bytes: expected.length }));
});

test("Bun fd5 honors Writable backpressure and preserves a finite ordered burst", { timeout: 20000 }, async () => {
    const evidence = await run("burst");
    const chunks = Array.from({ length: 8 }, (_, index) => {
        const prefix = Buffer.from(String(index).padStart(3, "0") + ":");
        return Buffer.concat([prefix, Buffer.alloc(256 * 1024 - prefix.length - 1, index), Buffer.from("\n")]);
    });
    expect(evidence.outcome).toEqual({ code: 0, signal: null });
    expect(evidence.forced).toBe(false);
    expect(typeof evidence.bunVersion).toBe("string");
    expect(evidence.outputEnded).toBe(true);
    expect(Buffer.from(evidence.outputHex, "hex")).toEqual(Buffer.concat(chunks));
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "write-backpressure" }));
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "burst-finished", sawBackpressure: true, count: 8 }));
});

test("destroying fd4 settles an outstanding control read without requiring parent EOF", { timeout: 15000 }, async () => {
    const evidence = await run("cancel");
    expect(evidence.outcome).toEqual({ code: 0, signal: null });
    expect(evidence.forced).toBe(false);
    expect(typeof evidence.bunVersion).toBe("string");
    expect(evidence.outputEnded).toBe(true);
    expect(Buffer.from(evidence.outputHex, "hex").toString("utf8")).toBe("pending-read-settled\n");
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "pending-read-settled" }));
});

test("fd5 closed by its parent produces a bounded handled write failure, not false success or forced kill", { timeout: 15000 }, async () => {
    const evidence = await run("closed-reader");
    expect(evidence.outcome.signal).toBe(null);
    expect(evidence.outcome.code).toBe(23);
    expect(evidence.forced).toBe(false);
    expect(typeof evidence.bunVersion).toBe("string");
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "write-error" }));
    expect(evidence.messages.some(message => message.type === "write-completed-with-reader-closed")).toBe(false);
});

test("fd5 final frame flushes and child exits while the parent leaves fd4 open", { timeout: 15000 }, async () => {
    const evidence = await run("final-flush");
    expect(evidence.outcome).toEqual({ code: 0, signal: null });
    expect(evidence.forced).toBe(false);
    expect(typeof evidence.bunVersion).toBe("string");
    expect(evidence.outputEnded).toBe(true);
    expect(Buffer.from(evidence.outputHex, "hex").toString("utf8")).toBe("final-monitor-frame\n");
    expect(evidence.messages).toContainEqual(expect.objectContaining({ type: "final-flush-complete" }));
});

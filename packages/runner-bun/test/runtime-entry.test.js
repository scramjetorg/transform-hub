import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { expect, test } from "bun:test";

const PKG_DIR = resolve(import.meta.dir, "..");
const FIXTURE = resolve(import.meta.dir, "fixtures/direct-marker");

function runRunnerBun(bootPath) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn("bun", ["src/bin/runner-bun.ts", bootPath], {
            cwd: PKG_DIR,
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stderr = "";
        child.stderr.on("data", chunk => { stderr += chunk.toString("utf8"); });
        child.once("error", rejectPromise);
        child.once("exit", code => resolvePromise({ code: code ?? -1, stderr }));
    });
}

test("headless Bun invocation is rejected before author code is loaded", async () => {
    const dir = mkdtempSync(join(tmpdir(), "runner-bun-headless-"));
    const marker = join(dir, "marker.out");
    const bootPath = join(dir, "boot.json");

    writeFileSync(bootPath, JSON.stringify({
        sequencePath: FIXTURE,
        instanceId: "headless",
        sequenceArgs: [marker]
    }));

    try {
        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(1);
        expect(result.stderr).toMatch(/host channels are required|hosted runner path/i);
        expect(() => readFileSync(marker, "utf8")).toThrow();
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

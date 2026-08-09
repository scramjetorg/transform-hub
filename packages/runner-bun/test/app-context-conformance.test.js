import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { validateBootConfig } from "../src/boot-config";

const hostedRuntime = {
    hostUrl: "https://verser2.example",
    runnerGuestId: "runner.inst.guest",
    runnerRouteDomain: "runner.inst.scramjet.internal",
    hubBrokerId: "runner.inst.hub.broker",
    hubTargetDomain: "hub.scramjet.internal",
    spaceTargetDomain: "manager.scramjet.internal",
};

describe("Bun AppContext conformance", () => {
    test("hosted boot propagation preserves spaceTargetDomain for Node delegation", () => {
        const config = validateBootConfig({
            sequencePath: "/tmp/sequence",
            instanceId: "inst",
            instancesServerHost: "127.0.0.1",
            instancesServerPort: 9000,
            verser2Runtime: hostedRuntime,
        });

        expect(config.verser2Runtime.spaceTargetDomain).toBe("manager.scramjet.internal");
    });

    test("headless Bun execution is rejected; hosted Bun delegates only", async () => {
        // The wrapper must not expose a second author/runtime contract without
        // host transport. Hosted Bun remains the Node-equivalent AppContext path.
        const dir = mkdtempSync(join(tmpdir(), "runner-bun-conformance-"));
        const bootPath = join(dir, "boot.json");
        await Bun.write(bootPath, JSON.stringify({
            sequencePath: resolve(import.meta.dir, "fixtures/direct-marker"),
            instanceId: "direct",
            appConfig: { requiresAppContext: true },
            sequenceArgs: [join(dir, "marker.out")],
        }));

        try {
            const result = await new Promise(resolvePromise => {
                const child = spawn("bun", ["src/bin/runner-bun.ts", bootPath], {
                    cwd: resolve(import.meta.dir, ".."),
                    stdio: ["ignore", "ignore", "pipe"],
                });
                let stderr = "";
                child.stderr.on("data", chunk => { stderr += chunk.toString(); });
                child.once("exit", code => resolvePromise({ code, stderr }));
            });

            expect(result.code).not.toBe(0);
            expect(result.stderr).toMatch(/host channels are required|hosted Bun|delegat|unsupported/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { defaultConfig } from "@scramjet/config";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { startHost } from "../src/lib/start-host";

let identityDir: string;
let host: Awaited<ReturnType<typeof startHost>>;

test.before(async () => {
    identityDir = mkdtempSync(join(tmpdir(), "host-legacy-runner-"));
    host = await startHost({}, {
        ...defaultConfig,
        runtimeAdapter: "process",
        adapters: { ...defaultConfig.adapters, process: {} },
        localStorageAdapter: "memory",
        sequencesRoot: join(identityDir, "sequences"),
        host: { ...defaultConfig.host, id: "legacy-runner-test", hostname: "127.0.0.1", port: 0 },
        verser2: {
            ...defaultConfig.verser2,
            runnerHost: {
                ...defaultConfig.verser2.runnerHost!,
                identityDir: join(identityDir, "runner"),
                host: { ...defaultConfig.verser2.runnerHost!.host, bindPort: 2444, publicUrl: "https://127.0.0.1:2444" }
            },
            controlIngress: {
                ...defaultConfig.verser2.controlIngress!,
                identityDir: join(identityDir, "control")
            }
        }
    } as any);
});

test.after(async () => {
    await host?.stop();
    rmSync(identityDir, { recursive: true, force: true });
});

test("Host starts and cleans up with an explicit legacy 2444 runner Host", t => {
    t.is((host as any).runnerVerser2Host.address.port, 2444);
    t.is((host as any).controlIngressHost.address.port, 2446);
});

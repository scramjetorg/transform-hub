import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, test } from "bun:test";
import { parseBootConfigPathFromArgv, validateBootConfig } from "../src/boot-config";

describe("runner-bun boot config", () => {
    test("reads boot config from argv[2]", () => {
        expect(parseBootConfigPathFromArgv(["bun", "runner-bun.ts", "/tmp/boot.json"])).toBe("/tmp/boot.json");
    });

    test("validates required fields", () => {
        expect(validateBootConfig({ sequencePath: "/tmp/seq.ts", instanceId: "inst" })).toEqual({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
        });
    });

    test("rejects invalid sequenceArgs and parity fields", () => {
        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            sequenceArgs: "nope",
        })).toThrow(/sequenceArgs/);

        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            appConfig: null,
        })).toThrow(/appConfig/);

        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            sequenceInfo: { id: "" },
        })).toThrow(/sequenceInfo\.id/);

        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            exposePath: "",
        })).toThrow(/exposePath/);

        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            exposeHost: "",
        })).toThrow(/exposeHost/);
    });

    test("preserves node delegation and api parity fields", () => {
        expect(validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
            appConfig: { foo: "bar" },
            sequenceInfo: { id: "seq-1" },
            exposePath: "/api",
            exposeHost: "0.0.0.0",
        })).toEqual({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
            appConfig: { foo: "bar" },
            sequenceInfo: { id: "seq-1" },
            exposePath: "/api",
            exposeHost: "0.0.0.0",
        });
    });

    test("rejects incomplete host channel config", () => {
        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            instancesServerPort: 9000,
        })).toThrow(/must be set together/);

        expect(() => validateBootConfig({
            sequencePath: "/tmp/seq.ts",
            instanceId: "inst",
            instancesServerHost: "127.0.0.1",
        })).toThrow(/must be set together/);
    });

    test("ignores legacy env vars and uses the provided object", () => {
        const oldEnv = {
            sequencePath: process.env.SEQUENCE_PATH,
            sequenceInfo: process.env.SEQUENCE_INFO,
            runnerConnectInfo: process.env.RUNNER_CONNECT_INFO,
        };

        try {
            process.env.SEQUENCE_PATH = "/legacy/path";
            process.env.SEQUENCE_INFO = JSON.stringify({ id: "legacy" });
            process.env.RUNNER_CONNECT_INFO = JSON.stringify({ appConfig: { legacy: true } });

            expect(validateBootConfig({
                sequencePath: "/tmp/seq.ts",
                instanceId: "inst",
                instancesServerPort: 9000,
                instancesServerHost: "127.0.0.1",
                appConfig: { from: "input" },
                sequenceInfo: { id: "seq-1" },
                exposePath: "/api",
                exposeHost: "0.0.0.0",
            })).toEqual({
                sequencePath: "/tmp/seq.ts",
                instanceId: "inst",
                instancesServerPort: 9000,
                instancesServerHost: "127.0.0.1",
                appConfig: { from: "input" },
                sequenceInfo: { id: "seq-1" },
                exposePath: "/api",
                exposeHost: "0.0.0.0",
            });
        } finally {
            if (oldEnv.sequencePath === undefined) delete process.env.SEQUENCE_PATH; else process.env.SEQUENCE_PATH = oldEnv.sequencePath;
            if (oldEnv.sequenceInfo === undefined) delete process.env.SEQUENCE_INFO; else process.env.SEQUENCE_INFO = oldEnv.sequenceInfo;
            if (oldEnv.runnerConnectInfo === undefined) delete process.env.RUNNER_CONNECT_INFO; else process.env.RUNNER_CONNECT_INFO = oldEnv.runnerConnectInfo;
        }
    });

    test("package build docker guard targets runner-bun", () => {
        const packageJsonPath = resolve(import.meta.dir, "../package.json");
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

        expect(packageJson.scripts.build).toContain("-d .");
        expect(packageJson.scripts["prebuild:docker"]).toContain("packages/runner-bun");
        expect(packageJson.scripts["prebuild:docker"]).not.toContain("-d packages/runner ");
    });
});

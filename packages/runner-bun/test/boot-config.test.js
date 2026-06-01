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
});

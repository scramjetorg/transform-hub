import test from "ava";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readStartupConfig } from "../src/lib/startup-config";

test("loads JSON and preserves stable startup identifiers and restart policy", t => {
    const dir = mkdtempSync(join(tmpdir(), "sth-startup-"));
    const path = join(dir, "startup.json");
    writeFileSync(path, JSON.stringify({ sequences: [{ id: "seq", sequenceName: "seq", instanceName: "seq-prod", required: true, restartLimit: 2 }] }));

    t.deepEqual(readStartupConfig(path), [{ id: "seq", sequenceName: "seq", instanceName: "seq-prod", required: true, restartLimit: 2 }]);
});

test("rejects malformed startup files without logging or exposing their values", t => {
    const dir = mkdtempSync(join(tmpdir(), "sth-startup-"));
    const path = join(dir, "startup.yaml");
    writeFileSync(path, "sequences:\n  - id: seq\n    restartLimit: -1\n    apiKey: secret-value\n");

    const error = t.throws(() => readStartupConfig(path));
    t.regex((error as Error).message, /restartLimit/);
    t.false((error as Error).message.includes("secret-value"));
});

test("reports missing startup files as configuration errors", t => {
    const error = t.throws(() => readStartupConfig("/tmp/does-not-exist/startup.yaml"));
    t.is((error as any).code, "SEQUENCE_STARTUP_CONFIG_READ_ERROR");
});

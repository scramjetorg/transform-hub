import test from "ava";
import { join } from "path";
import { selectExecutor } from "../../src/executor/select";

const PRINTENV = join(__dirname, "../fixtures/python/printenv.py");
const STRIPPED_KEYS = ["SEQUENCE_PATH", "SEQUENCE_INFO", "RUNNER_CONNECT_INFO"] as const;

/**
 * Outer runner must NOT inject SEQUENCE_PATH, SEQUENCE_INFO, or
 * RUNNER_CONNECT_INFO into the runner-python child env. The Python runner
 * reads everything it needs from the boot-config file, so these runner-owned
 * env vars must be stripped before spawn.
 *
 * Note: this stripping is python-specific. The Node runner intentionally
 * receives these vars and routes them through boot-config; this test does
 * NOT make any claim about the runner-node child.
 */
test("outer runner strips SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO from python child env", async (t) => {
    process.env.SEQUENCE_PATH = "/test/sequence/path";
    process.env.SEQUENCE_INFO = '{"id":"test-seq"}';
    process.env.RUNNER_CONNECT_INFO = '{"args":["test"]}';

    try {
        // Positive (sanity) assertion: keys ARE present in the parent before spawn.
        for (const key of STRIPPED_KEYS) {
            t.truthy(process.env[key], `parent env should contain ${key}`);
        }

        const executor = selectExecutor({ engines: { python3: "3.9" } });

        t.is(executor.kind, "python3");

        const handles = executor.spawn({
            runtimeEntry: PRINTENV,
            bootConfigPath: "/tmp/dummy.json",
        });
        let stdout = "";

        handles.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        await new Promise((resolve) => handles.child.on("close", resolve));

        // printenv.py prints one env key per line - match on full lines to avoid
        // partial-name false positives (e.g. SEQUENCE_PATH_OTHER).
        const childEnvKeys = new Set(stdout.split("\n").map((l) => l.trim()).filter(Boolean));

        // Negative assertions: stripped keys must NOT be in the child env.
        for (const key of STRIPPED_KEYS) {
            t.false(childEnvKeys.has(key), `child env should NOT contain ${key}`);
        }
    } finally {
        for (const key of STRIPPED_KEYS) delete process.env[key];
    }
});

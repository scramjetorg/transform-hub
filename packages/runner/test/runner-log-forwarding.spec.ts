import test from "ava";
import { copyRunnerLogForwarding, shouldForwardRunnerLogs } from "../src/runner-log-forwarding";

test("runner log forwarding defaults to enabled", t => {
    t.true(shouldForwardRunnerLogs({}));
    t.true(shouldForwardRunnerLogs({ forwardRunnerLogs: true }));
});

test("runner log forwarding can be disabled", t => {
    t.false(shouldForwardRunnerLogs({ forwardRunnerLogs: false }));
});

test("outer runner boot contract copies absent, true, and false values", t => {
    t.deepEqual(copyRunnerLogForwarding({}, {}), {});
    t.deepEqual(copyRunnerLogForwarding({}, { forwardRunnerLogs: true }), { forwardRunnerLogs: true });
    t.deepEqual(copyRunnerLogForwarding({}, { forwardRunnerLogs: false }), { forwardRunnerLogs: false });
});

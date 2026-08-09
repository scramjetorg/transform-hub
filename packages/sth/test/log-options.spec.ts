import test from "ava";
import { parseCliOptions } from "@scramjet/config";
import { runnerLogConfig, runnerLogForwardingOption } from "../src/log-options";

test("actual STH runner-log CLI option preserves absent config", t => {
    const parsed = parseCliOptions({ argv: ["node", "sth"], options: [runnerLogForwardingOption] });
    t.is(parsed.logForwardRunner, undefined);
    t.is(runnerLogConfig(parsed.logForwardRunner), undefined);
});

test("actual STH runner-log CLI option maps true and false", t => {
    const enabled = parseCliOptions({ argv: ["node", "sth", "--log-forward-runner"], options: [runnerLogForwardingOption] });
    const disabled = parseCliOptions({ argv: ["node", "sth", "--no-log-forward-runner"], options: [runnerLogForwardingOption] });

    t.deepEqual(runnerLogConfig(enabled.logForwardRunner), { log: { forwardRunner: true } });
    t.deepEqual(runnerLogConfig(disabled.logForwardRunner), { log: { forwardRunner: false } });
});

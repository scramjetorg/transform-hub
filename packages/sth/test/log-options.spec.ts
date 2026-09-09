import test from "ava";
import { defaultConfig, parseCliOptions } from "@scramjet/config";
import { logColorsConfig, logColorsOption, runnerLogConfig, runnerLogForwardingOption } from "../src/log-options";

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

test("STH log colors default off and explicit CLI opt-in preserves config-file colors", t => {
    const absent = parseCliOptions({ argv: ["node", "sth"], options: [logColorsOption] });
    const enabled = parseCliOptions({ argv: ["node", "sth", "--colors"], options: [logColorsOption] });
    const disabled = parseCliOptions({ argv: ["node", "sth", "--no-colors"], options: [logColorsOption] });

    t.false(defaultConfig.logColors);
    t.is(logColorsConfig(absent.colors), undefined);
    t.deepEqual(logColorsConfig(enabled.colors), { logColors: true });
    t.deepEqual(logColorsConfig(disabled.colors), { logColors: false });
    t.deepEqual({ ...defaultConfig, logColors: true, ...(logColorsConfig(absent.colors) || {}) }, { ...defaultConfig, logColors: true });
});

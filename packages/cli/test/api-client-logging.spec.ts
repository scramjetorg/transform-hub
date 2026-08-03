import test from "ava";
import { parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { apiClientLoggingOption, setApiClientLoggingOverride, shouldAttachApiClientLogger } from "../src/lib/api-client-logging";

test.afterEach.always(() => setApiClientLoggingOverride(undefined));

test("actual standalone CLI API-client option supports absent, enabled, and disabled values", t => {
    const command = { name: "si", options: [apiClientLoggingOption] } as any;
    const absent = parseCommandContext(resolveCommandPath([], command), command.options);
    const enabled = parseCommandContext(resolveCommandPath(["--log-api-clients"], command), command.options);
    const disabled = parseCommandContext(resolveCommandPath(["--no-log-api-clients"], command), command.options);

    t.is(absent.options.logApiClients, undefined);
    t.is(enabled.options.logApiClients, true);
    t.is(disabled.options.logApiClients, false);
});

test("API-client lifecycle logger is suppressed independently of debug mode", t => {
    t.true(shouldAttachApiClientLogger(true, true));
    t.false(shouldAttachApiClientLogger(true, false));
    t.false(shouldAttachApiClientLogger(false, true));

    setApiClientLoggingOverride(false);
    t.false(shouldAttachApiClientLogger(true, true));
    setApiClientLoggingOverride(true);
    t.true(shouldAttachApiClientLogger(true, false));
});

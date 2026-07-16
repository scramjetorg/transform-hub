import test from "ava";

import { resolveCompletionExitTimeout } from "../src/bin/runner-node";

test("completion path retains the default when context.exitTimeout is unset", t => {
    t.is(resolveCompletionExitTimeout({}, {}), 5_000);
    t.is(resolveCompletionExitTimeout({}, { verser2Runtime: { hubTargetDomain: "hub.internal" } }), 10_000);
});

test("completion path honors a 50ms context.exitTimeout", t => {
    t.is(resolveCompletionExitTimeout({ exitTimeout: 50 }, {}), 50);
});

test("completion path honors a 500ms context.exitTimeout", t => {
    t.is(resolveCompletionExitTimeout({ exitTimeout: 500 }, {}), 500);
});

test("hubTargetDomain does not override an explicit context.exitTimeout", t => {
    t.is(
        resolveCompletionExitTimeout({ exitTimeout: 50 }, { verser2Runtime: { hubTargetDomain: "hub.internal" } }),
        50
    );
    t.is(
        resolveCompletionExitTimeout({ exitTimeout: 500 }, { verser2Runtime: { hubTargetDomain: "hub.internal" } }),
        500
    );
});

test("BDD-owned boot config resolves the runner context exitTimeout to exactly 1000ms", t => {
    t.is(resolveCompletionExitTimeout({ exitTimeout: 1000 }, {}), 1000);
});

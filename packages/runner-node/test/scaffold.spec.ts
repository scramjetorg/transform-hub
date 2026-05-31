import test from "ava";

import { runnerNodeRuntime } from "../src";

test("runner-node package scaffold exports runtime marker", t => {
    t.is(runnerNodeRuntime, "runner-node");
});

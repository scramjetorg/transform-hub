import test from "ava";
import { bddBootExitTimeout } from "../src/bin/bdd-boot-timeout";

test.beforeEach(() => {
    delete process.env.SCRAMJET_BDD_RUN_ID;
});

test.afterEach(() => {
    delete process.env.SCRAMJET_BDD_RUN_ID;
});

test("runner boot serialization timeout is exactly 1000 only for BDD runs", t => {
    t.is(bddBootExitTimeout(), undefined);
    process.env.SCRAMJET_BDD_RUN_ID = "oracle-regression";
    t.is(bddBootExitTimeout(), 1000);
});

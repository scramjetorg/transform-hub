import test from "ava";
import { Verser, VerserClient, VerserConnection } from "../src";

test("exports legacy verser public classes", t => {
    t.is(typeof Verser, "function");
    t.is(typeof VerserClient, "function");
    t.is(typeof VerserConnection, "function");
});

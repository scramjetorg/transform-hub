import test from "ava";
import { createVerser2HostOptions } from "../src";

test("exports the MultiManager Host options factory", t => {
    t.is(typeof createVerser2HostOptions, "function");
});

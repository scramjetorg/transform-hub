import test from "ava";
import { RunnerVerser2Transport } from "@scramjet/runner";

test("exports the Runner verser2 transport and public transport types", t => {
    t.is(typeof RunnerVerser2Transport, "function");
});

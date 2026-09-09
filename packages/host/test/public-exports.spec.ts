import test from "ava";
import {
    S3Client,
    createHostControlIngressOptions,
    startHostControlIngress,
    stopHostControlIngress
} from "../src";

test("exports the Host APIs used by published BDD steps", t => {
    t.is(typeof S3Client, "function");
    t.is(typeof createHostControlIngressOptions, "function");
    t.is(typeof startHostControlIngress, "function");
    t.is(typeof stopHostControlIngress, "function");
});

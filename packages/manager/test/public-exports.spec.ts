import test from "ava";
import {
    CsrEnrollmentAuthority,
    Manager,
    S3Proxy,
    createCsrEnrollmentHttpsServer,
    createManagerControlIngressOptions,
    createManagerCsrEnrollmentCommand,
    runManagerCsrEnrollmentCli,
    startManagerControlIngress,
    stopManagerControlIngress
} from "../src";

test("exports the Manager APIs used by published BDD steps", t => {
    t.is(typeof Manager, "function");
    t.is(typeof S3Proxy, "function");
    t.is(typeof createManagerControlIngressOptions, "function");
    t.is(typeof startManagerControlIngress, "function");
    t.is(typeof stopManagerControlIngress, "function");
    t.is(typeof CsrEnrollmentAuthority, "function");
    t.is(typeof createCsrEnrollmentHttpsServer, "function");
    t.is(typeof createManagerCsrEnrollmentCommand, "function");
    t.is(typeof runManagerCsrEnrollmentCli, "function");
});

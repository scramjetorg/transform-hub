import { addLoggerOutput, getLogger, removeLoggerOutput } from "@scramjet/logger";
import test from "ava";
import { randomBytes } from "crypto";
import { StringStream } from "scramjet";

const randomId = () => randomBytes(8).toString("hex");

test("error", async (t) => {
    const name = randomId();
    const out = new StringStream();
    const err = new StringStream();

    addLoggerOutput(out, err);

    const log = getLogger(name);
    const [whenOutEnd, whenErrEnd] = [out.toArray(), err.toArray()];

    log.error("a");
    log.warn("b");
    log.trace("c");

    removeLoggerOutput(out, err);

    log.error("d");

    out.end();
    err.end();

    const [outArr, errArr]: [string[], string[]] = await Promise.all([whenOutEnd, whenErrEnd]);

    t.is(outArr.length, 0, "Does not log to out when output is removed");
    t.is(errArr.length, 3, "Logs the data");

    t.regex(errArr[0], /^[-\d]{10}T[:\.\d]{12}Z/, "Should have date formatted");

    t.is(errArr[0].substr(25), `error (${name}) a\n`, "Should pushed the message");
    t.is(errArr[1].substr(25), `warn (${name}) b\n`, "Should pushed the message");
    t.is(errArr[2].substr(25, 40), `error (${name}) Trace: c\n    at`, "Should pushed the message");

});

test.skip("test derived methods", () => {
    // TODO: check
    // console.assert(value[, ...message])
    // console.count([label])
    // console.countReset([label])
    // console.dir(obj[, options])
    // console.group([...label])
    // console.groupCollapsed()
    // console.groupEnd()
    // console.table(tabularData[, properties])
    // console.time([label])
    // console.timeEnd([label])
    // console.timeLog([label][, ...data])
});

test.skip("nameid", () => {
    // TODO: check name resolution
});

test("out", async (t) => {
    const name = randomId();
    const out = new StringStream();
    const err = new StringStream();
    const log = getLogger({ name });
    const [whenOutEnd, whenErrEnd] = [out.toArray(), err.toArray()];

    addLoggerOutput(out, err);

    log.log("a");
    log.info("b");
    log.debug("c");

    removeLoggerOutput(out, err);

    log.log("d");

    out.end();
    err.end();

    const [outArr, errArr]: [string[], string[]] = await Promise.all([whenOutEnd, whenErrEnd]);

    t.is(errArr.length, 0, "Does not log to error");
    t.is(outArr.length, 3, "Logs the data");

    t.regex(outArr[0], /^[-\d]{10}T[:\.\d]{12}Z/, "Should have date formatted");

    t.is(outArr[0].substr(25), `log (object:${name}) a\n`, "Should push the message");
    t.is(outArr[1].substr(25), `info (object:${name}) b\n`, "Should push the message");
    t.is(outArr[2].substr(25), `debug (object:${name}) c\n`, "Should push the message");
});


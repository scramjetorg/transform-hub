import test from "ava";
import { InvalidOptionArgumentError } from "commander";
import { portsParser } from "../../src/lib/ports-parser";

test("portsParser parses valid range 8000-8010", (t) => {
    const result = portsParser("8000-8010");

    t.true(Array.isArray(result));
    t.is(result.length, 2);
    t.is(result[0], 8000);
    t.is(result[1], 8010);
});

test("portsParser parses single port range 8000-8000", (t) => {
    const result = portsParser("8000-8000");

    t.is(result[0], 8000);
    t.is(result[1], 8000);
});

test("portsParser returns tuple type", (t) => {
    const result = portsParser("3000-4000");

    t.is(typeof result[0], "number");
    t.is(typeof result[1], "number");
});

test("portsParser throws on reversed range where left > right", (t) => {
    const err = t.throws(() => portsParser("8010-8000"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("lower than right"));
});

test("portsParser throws on non-numeric range 'abc-def'", (t) => {
    const err = t.throws(() => portsParser("abc-def"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("range"));
});

test("portsParser throws on mixed format '8000-abc'", (t) => {
    const err = t.throws(() => portsParser("8000-abc"), { instanceOf: InvalidOptionArgumentError });

    // Regex fails to match entirely -> format error
    t.true(err!.message.includes("format"));
});

test("portsParser throws on single value without range '8000'", (t) => {
    const err = t.throws(() => portsParser("8000"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("range"));
});

test("portsParser throws on empty string", (t) => {
    const err = t.throws(() => portsParser(""), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("range"));
});

test("portsParser rejects negative-adjacent range '-100-50' as invalid format", (t) => {
    const err = t.throws(() => portsParser("-100-50"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("format"));
});

test("portsParser rejects input with leading text", (t) => {
    const err = t.throws(() => portsParser("x8000-8010"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("format"));
});

test("portsParser rejects input with trailing text", (t) => {
    const err = t.throws(() => portsParser("8000-8010x"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("format"));
});

test("portsParser rejects port 0", (t) => {
    const err = t.throws(() => portsParser("0-100"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("1-65535"));
});

test("portsParser rejects ports above 65535", (t) => {
    const err = t.throws(() => portsParser("65535-65536"), { instanceOf: InvalidOptionArgumentError });

    t.true(err!.message.includes("1-65535"));
});

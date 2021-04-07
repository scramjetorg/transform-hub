import test from "ava";

test.before(async (t) => {
    const ctx = t.context as any;

    ctx.letter = "g";
});

test("passing test", t => {
    t.pass();
});

test("context test", (t) => {
    const ctx = t.context as any;

    t.is(ctx.letter, "g");
});

test("async test", async t => {
    const bar = Promise.resolve("bar");

    t.is(await bar, "bar");
});

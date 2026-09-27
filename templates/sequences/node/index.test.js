const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const sequence = require("./index.js");

test("produces the native Node template output", async () => {
    const output = await sequence(Readable.from(["hello", "world"]));
    assert.equal(output, "native-template-node: hello world");
});

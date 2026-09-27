import { test, expect } from "bun:test";
import { Readable } from "node:stream";
import sequence from "./index.js";

test("produces the native Bun template output", async () => {
    const output = await sequence(Readable.from(["hello", "world"]));
    expect(output).toBe("native-template-bun: hello world");
});

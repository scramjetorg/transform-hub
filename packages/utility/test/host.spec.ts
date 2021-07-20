import test from "ava";

import { merge } from "../src/merge";

test("merge() should overwrite primitive values", t => {
    const source = { url: "http://example.com", name: "Johnny" };

    merge(source, { name: "Bobby" });

    t.deepEqual(source, { url: "http://example.com", name: "Bobby" });
});

test("merge() should deeply merge object values", t => {
    const source = { url: "http://example.com", settings: { audio: true, video: false } };

    merge(source, { settings: { video: true } });

    t.deepEqual(source, { url: "http://example.com", settings: { audio: true, video: true } });
});

test("merge() objFrom argument type should only allow deep partial", (t) => {
    //@ts-expect-error
    merge({ name: "Johnny" }, { name: 1 });

    //@ts-expect-error
    merge({ settings: { audio: true } }, { settings: { foo: 2 } });

    merge({ settings: { audio: true } }, { settings: { audio: false } });

    t.assert(true);
});

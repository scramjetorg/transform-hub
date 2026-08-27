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

test("merge() ignores unsafe top-level property names", t => {
    const target = { enabled: true };
    const payload = JSON.parse(
        '{"__proto__":{"pollutedByProto":true},"constructor":{"prototype":{"pollutedByConstructor":true}},"prototype":{"pollutedByPrototype":true}}'
    );

    merge(target, payload);

    t.deepEqual(target, { enabled: true });
    t.is(({} as Record<string, unknown>).pollutedByProto, undefined);
    t.is(({} as Record<string, unknown>).pollutedByConstructor, undefined);
    t.is(({} as Record<string, unknown>).pollutedByPrototype, undefined);
});

test("merge() ignores unsafe nested property names while merging ordinary options", t => {
    const target = { settings: { enabled: true, retries: 1 } };
    const payload = JSON.parse(
        '{"settings":{"enabled":false,"__proto__":{"nestedProtoPolluted":true},"constructor":{"prototype":{"nestedConstructorPolluted":true}},"prototype":{"nestedPrototypePolluted":true}}}'
    );

    merge(target, payload);

    t.deepEqual(target, { settings: { enabled: false, retries: 1 } });
    t.is(({} as Record<string, unknown>).nestedProtoPolluted, undefined);
    t.is(({} as Record<string, unknown>).nestedConstructorPolluted, undefined);
    t.is(({} as Record<string, unknown>).nestedPrototypePolluted, undefined);
});

test("merge() strict mode rejects unknown own source options", t => {
    const target = { enabled: true };

    const error = t.throws(() => merge(target, { unknown: false } as never, true));
    const unsafeError = t.throws(() => merge(
        target,
        JSON.parse('{"__proto__":{"strictProtoPolluted":true}}'),
        true
    ));

    t.is(error?.message, "Unknown option unknown in config");
    t.is(unsafeError?.message, "Unknown option __proto__ in config");
    t.deepEqual(target, { enabled: true });
    t.is(({} as Record<string, unknown>).strictProtoPolluted, undefined);
});

test("merge() does not merge inherited source properties", t => {
    const target = { enabled: false };
    const source = Object.create({ inherited: true });
    source.enabled = true;

    merge(target, source, true);

    t.deepEqual(target, { enabled: true });
});

test("merge() objFrom argument type should only allow deep partial", (t) => {
    //@ts-expect-error
    merge({ name: "Johnny" }, { name: 1 });

    //@ts-expect-error
    merge({ settings: { audio: true } }, { settings: { foo: 2 } });

    merge({ settings: { audio: true } }, { settings: { audio: false } });

    t.assert(true);
});

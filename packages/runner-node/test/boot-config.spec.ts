import test from "ava";
import { validateBootConfig } from "../src/boot-config";

const base = { sequencePath: "/tmp/sequence.js", instanceId: "instance" };

test("boot config preserves exactly 1000 through JSON validation", t => {
    const serialized = JSON.stringify({ ...base, exitTimeout: 1000 });
    t.is(validateBootConfig(JSON.parse(serialized)).exitTimeout, 1000);
});

test("boot config rejects non-positive and non-finite exitTimeout values", t => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        t.throws(() => validateBootConfig({ ...base, exitTimeout: value }), { message: /positive finite number/ });
    }
});

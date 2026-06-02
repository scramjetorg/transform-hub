import path from "node:path";

import test from "ava";

import { runSequence } from "../src/index";

test("runSequence executes a simple Node fixture and captures NDJSON output", async t => {
    const sequencePath = path.resolve(__dirname, "fixtures/map-ndjson/index.js");
    const result = await runSequence({
        runtime: "node",
        sequencePath,
        input: {
            contentType: "application/x-ndjson",
            body: [
                { id: 1, value: 2 },
                { id: 2, value: 3 }
            ]
        }
    });

    t.deepEqual(result.output.ndjson(), [
        { id: 1, value: 4 },
        { id: 2, value: 6 }
    ]);
    t.notThrows(() => result.assert.completed());
    t.notThrows(() => result.assert.noRuntimeErrors());
});

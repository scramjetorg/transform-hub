# Testing Input And Output

Use `runSequence()` for simple Node sequence fixtures that transform input records into output records.

```ts
import path from "node:path";
import test from "ava";
import { runSequence } from "@scramjet/sequence-test";

test("maps NDJSON input", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/map-ndjson/index.js"),
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
```

Keep assertions focused on sequence behavior: input shape, output records, completion, and runtime errors.

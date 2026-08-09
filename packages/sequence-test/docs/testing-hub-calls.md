# Testing Hub Calls

Test Hub calls as sequence behavior: run the sequence with `createHubHarness().context`, then assert that the expected calls happened.

Do not test the Hub mock itself in sequence-level docs. The mock is supporting infrastructure.

```ts
import { createHubHarness } from "@scramjet/sequence-test";

test("reports progress to the Hub", async t => {
  const harness = createHubHarness();

  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/hub-calls/index.js"),
    context: harness.context,
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "job-1" }]
    }
  });

  const calls = harness.calls().map((entry) => ({ method: entry.method, path: entry.path, body: entry.body }));

  t.deepEqual(calls, [
    { method: "GET", path: "/api/v1/version" },
    { method: "POST", path: "/api/v1/events", body: { type: "item.processed", id: "job-1" } }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

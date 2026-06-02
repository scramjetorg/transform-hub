# Testing Hub Calls

Test Hub calls as sequence behavior: register the specific endpoints the sequence should call, run the sequence, then assert that those calls happened.

Do not test the Hub mock itself in sequence-level docs. The mock is supporting infrastructure.

```ts
test("reports progress to the Hub", async t => {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/hub-calls/index.js"),
    context: {
      hub: {
        get: async (route: string) => calls.push({ method: "GET", path: route }),
        post: async (route: string, body: unknown) => calls.push({ method: "POST", path: route, body })
      }
    },
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "job-1" }]
    }
  });

  t.deepEqual(calls, [
    { method: "GET", path: "/api/v1/version" },
    { method: "POST", path: "/api/v1/events", body: { type: "item.processed", id: "job-1" } }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

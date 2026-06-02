# Testing Hub Calls

Test Hub calls as sequence behavior: register the specific endpoints the sequence should call, run the sequence, then assert that those calls happened.

Do not test the Hub mock itself in sequence-level docs. The mock is supporting infrastructure.

Planned Phase 8 fixture:

```ts
test("reports progress to the Hub", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/hub-calls/index.js"),
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "job-1" }]
    }
  });

  await result.hub.assert.called("POST", "/api/v1/events");
  t.notThrows(() => result.assert.completed());
});
```

The fixture and executable support for this scenario are tracked in Phase 8.

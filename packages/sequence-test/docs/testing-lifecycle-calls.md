# Testing Lifecycle Calls

Use lifecycle-call fixtures when a sequence should call operations such as stop/start or otherwise interact with instance lifecycle behavior.

Planned Phase 8 fixture:

```ts
test("requests lifecycle transition", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/lifecycle-calls/index.js"),
    input: {
      contentType: "application/x-ndjson",
      body: [{ command: "stop" }]
    }
  });

  await result.hub.assert.called("POST", "/api/v1/instances/self/stop");
  t.notThrows(() => result.assert.completed());
});
```

The fixture and executable support for this scenario are tracked in Phase 8.

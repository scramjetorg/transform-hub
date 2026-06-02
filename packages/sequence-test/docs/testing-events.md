# Testing Events

Use event fixtures when a sequence should emit or react to Scramjet events.

Planned Phase 8 fixture:

```ts
test("emits domain events", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/events/index.js"),
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "order-1" }]
    }
  });

  t.deepEqual(result.events.records(), [{ type: "order.received", id: "order-1" }]);
  t.notThrows(() => result.assert.completed());
});
```

The fixture and executable support for this scenario are tracked in Phase 8.

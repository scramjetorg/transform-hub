# Testing Events

Use event fixtures when a sequence should emit or react to Scramjet events.

```ts
test("emits domain events", async t => {
  const harness = createHubHarness();

  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/events/index.js"),
    context: harness.context,
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "order-1" }]
    }
  });

  const events = harness.events().map((entry) => ({
    scope: entry.scope,
    name: entry.name,
    message: entry.message
  }));

  t.deepEqual(events, [
    { scope: "host", name: "item.received", message: { id: "order-1" } },
    { scope: "space", name: "item.received", message: { id: "order-1", scope: "space" } }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

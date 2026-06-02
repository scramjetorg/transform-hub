# Testing Events

Use event fixtures when a sequence should emit or react to Scramjet events.

```ts
test("emits domain events", async t => {
  const events: Array<{ scope: string; name: string; message: unknown }> = [];
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/events/index.js"),
    context: {
      emit: (name: string, message: unknown) => events.push({ scope: "host", name, message }),
      emitToSpace: (name: string, message: unknown) => events.push({ scope: "space", name, message })
    },
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "order-1" }]
    }
  });

  t.deepEqual(events, [
    { scope: "host", name: "item.received", message: { id: "order-1" } },
    { scope: "space", name: "item.received", message: { id: "order-1", scope: "space" } }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

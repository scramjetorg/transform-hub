# Testing Lifecycle Calls

Use lifecycle-call fixtures when a sequence should call operations such as stop/start or otherwise interact with instance lifecycle behavior.

```ts
test("requests lifecycle transition", async t => {
  const lifecycle: Array<{ name: string; value?: unknown }> = [];
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/lifecycle-calls/index.js"),
    context: {
      keepAlive: (milliseconds: number) => lifecycle.push({ name: "keepAlive", value: milliseconds }),
      end: () => lifecycle.push({ name: "end" })
    },
    input: {
      contentType: "application/x-ndjson",
      body: [{ command: "stop" }]
    }
  });

  t.deepEqual(lifecycle, [
    { name: "keepAlive", value: 250 },
    { name: "end" }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

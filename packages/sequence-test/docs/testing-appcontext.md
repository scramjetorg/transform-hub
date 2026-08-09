# Testing App Context

Use an appcontext fixture when a sequence should read configuration, state, or service handles from its Scramjet context.

```ts
test("uses appcontext configuration", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/appcontext/index.js"),
    context: {
      config: { multiplier: 3 },
      instanceId: "instance-1"
    },
    input: {
      contentType: "application/x-ndjson",
      body: [{ value: 2 }]
    }
  });

  t.deepEqual(result.output.ndjson(), [{ value: 6, instanceId: "instance-1" }]);
});
```

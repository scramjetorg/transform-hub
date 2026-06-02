# Testing App Context

Use an appcontext fixture when a sequence should read configuration, state, or service handles from its Scramjet context.

Planned Phase 8 fixture:

```ts
test("uses appcontext configuration", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/appcontext/index.js"),
    input: {
      contentType: "application/x-ndjson",
      body: [{ value: 2 }]
    }
  });

  t.deepEqual(result.output.ndjson(), [{ value: 2, configured: true }]);
});
```

The fixture and executable support for this scenario are tracked in Phase 8.

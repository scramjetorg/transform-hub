# Testing Exposed APIs

Use exposed-API fixtures when a sequence registers HTTP endpoints that should be callable during a test.

Planned Phase 8 fixture:

```ts
test("serves health endpoint", async t => {
  const harness = await createSequenceTest({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/exposed-api/index.js")
  });

  try {
    await harness.start();

    const response = await harness.request.get("/health");

    t.is(response.status, 200);
    t.deepEqual(await response.json(), { status: "ok" });
  } finally {
    await harness.close();
  }
});
```

The fixture and executable support for this scenario are tracked in Phase 8.

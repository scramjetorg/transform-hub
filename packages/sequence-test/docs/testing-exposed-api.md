# Testing Exposed APIs

Use exposed-API fixtures when a sequence registers HTTP endpoints that should be callable during a test.

```ts
test("registers health endpoint", async t => {
  const routes: Array<{ path: string; handler: unknown }> = [];
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/exposed-api/index.js"),
    context: {
      api: {
        use: (route: string, handler: unknown) => routes.push({ path: route, handler })
      }
    },
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "api-1" }]
    }
  });

  t.deepEqual(result.output.ndjson(), [{ id: "api-1", apiRegistered: true }]);
  t.is(routes[0].path, "/health");
  t.is(typeof routes[0].handler, "function");
});
```

Full HTTP request testing for exposed APIs will use runner-backed execution when `createSequenceTest()` grows real process launching.

# Testing Exposed APIs

Use exposed-API fixtures when a sequence registers HTTP endpoints that should be callable during a test.

```ts
import { createHubHarness } from "@scramjet/sequence-test";

test("registers health endpoint", async t => {
  const harness = createHubHarness();

  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/exposed-api/index.js"),
    context: harness.context,
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "api-1" }]
    }
  });

  t.deepEqual(result.output.ndjson(), [{ id: "api-1", apiRegistered: true }]);
  t.is(harness.apiRoutes()[0].path, "/health");
  t.is(typeof harness.apiRoutes()[0].handler, "function");
});
```

Full HTTP request testing for exposed APIs will use runner-backed execution when `createSequenceTest()` grows real process launching.

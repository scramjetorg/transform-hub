# Testing Lifecycle Calls

Use lifecycle-call fixtures when a sequence should call operations such as stop/start or otherwise interact with instance lifecycle behavior.

```ts
import { createHubHarness } from "@scramjet/sequence-test";

test("requests lifecycle transition", async t => {
  const harness = createHubHarness();

  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/lifecycle-calls/index.js"),
    context: harness.context,
    input: {
      contentType: "application/x-ndjson",
      body: [{ command: "stop" }]
    }
  });

  t.deepEqual(harness.lifecycle().map((entry) => ({ name: entry.action, value: entry.keepAlive })), [
    { name: "keepAlive", value: 250 },
    { name: "end", value: undefined }
  ]);
  t.notThrows(() => result.assert.completed());
});
```

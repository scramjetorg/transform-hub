---
id: example-lifecycle-local-validation-service
slug: /examples/lifecycle-local-validation-service
title: Start a local validation service safely
---

# Start a local validation service safely

This walkthrough is motivated by the public [Server Fault diagnostics question](https://serverfault.com/questions/412134/server-unreachable-best-way-to-find-out-the-cause): before a service answers traffic, validate its local prerequisites.

Read [sequence lifecycle and readiness](../sequences/sequence-lifecycle.md) first.

## Validation-first sequence

Prerequisites: Node.js 18+, a packaged sequence, and a Hub using the process adapter. Docker and Kubernetes can run the same sequence, but filesystem visibility and startup timeouts are adapter-specific. The example treats `DATA_FILE` as a packaged or explicitly mounted resource, not as an arbitrary host path.

```typescript
import { access } from "node:fs/promises";
import type { SequenceAppContext } from "@scramjet/sequence-types";

export async function initialize(this: SequenceAppContext) {
  const file = this.config.dataFile as string;
  try {
    await access(file);
  } catch (error) {
    this.logger.error("validation failed", { code: "RESOURCE_UNAVAILABLE", error: String(error) });
    this.destroy(new this.AppError("GENERAL_ERROR", String(error)));
    throw error;
  }

  this.api.use("/status", () => ({ ready: true, instanceId: this.instanceId }));
  this.logger.info("validation passed");
}

export default async function (this: SequenceAppContext) {
  await new Promise(() => {});
}
```

In a complete application, the validation phase is explicit and route registration follows it. Until validation succeeds, no exposed listener is active. A failure produces structured logs/events and an errored instance; callers start a new instance instead of retrying inside the failed one. The pending promise only represents the long-running phase after readiness and is not a retry mechanism.

The trust boundary is the packaged resource, configuration, and adapter mount. Validate paths and permissions without returning file contents. The sequence does not own Hub authentication, public ingress, or secret storage. A dropped client connection does not replay prior requests.

Run `cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/phase6-guide-contracts.spec.ts` to validate the lifecycle contract. For a deployed setup, start the Hub from the file-loaded configuration and poll readiness rather than sleeping. Run `npm run docs:check` to validate this source page and its links.

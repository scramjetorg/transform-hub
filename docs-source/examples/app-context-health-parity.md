---
id: example-app-context-health-parity
slug: /examples/app-context-health-parity
title: AppContext health parity across runtimes
---

# AppContext health parity across runtimes

This walkthrough is motivated by the public [Server Fault remote-site monitoring question](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet): one operational idea should remain understandable when the probe is moved between runtimes. It compares the contract; it does not claim identical syntax or direct Bun host support.

Read [SequenceAppContext and runtime parity](../sequences/sequence-app-context.md) first.

Prerequisites: a packaged Node or Python sequence and a Hub with the matching runner. Hosted Bun requires the Bun wrapper and delegates to Node for host-connected channels. Direct headless Bun is not a valid AppContext parity test. Use test credentials and non-sensitive details.

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

export default function (this: SequenceAppContext) {
  let ok = true;
  this.addMonitoringHandler(() => ({
    healthy: ok,
    details: { probe: { runtime: "node", ok } }
  }));
  this.addStopHandler(async () => { ok = false; });
  this.logger.info("probe ready");
  this.emit("probe.ready", { ok: true });
}
```

The Python equivalent uses `add_monitoring_handler`, `add_stop_handler`, `context.logger`, and the same health/details and event meaning. Compare monitoring frames, lifecycle outcome, logs, event scope, Hub/Space requests, and API response—not source spelling. The smallest validation is `npm run test:bdd-appcontext` for hosted runtime conformance; direct Bun and a generic Python REST client are intentionally not covered. Also run `npm run docs:check` after editing.

The trust boundary is the runtime wrapper and its configured Hub connection. AppContext does not grant filesystem, network, or secret access, does not provide durable event delivery, and does not turn health into authorization. A failed or disconnected runtime must be observed through lifecycle status and restarted according to deployment policy.

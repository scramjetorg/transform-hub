---
id: example-customer-site-health-control
slug: /examples/customer-site-health-control
title: Customer-site health and control
---

# Customer-site health and control

This walkthrough is motivated by the public [Server Fault remote-site monitoring question](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet). A site probe needs to report its state, drain cleanly, and stop quickly when an operator takes it out of service.

Start with the [health and control guide](../sequences/sequence-control.md).

## Sequence implementation

Prerequisites: a packaged Node sequence, Node.js 18 or newer, and a running Hub. This uses the process adapter. Docker and Kubernetes can supervise the same lifecycle, but their image, network, and shutdown limits are deployment-specific.

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

let lastProbe = { ok: false, latencyMs: 0 };
let draining = false;

export default async function (this: SequenceAppContext) {
  this.addMonitoringHandler(() => ({
    healthy: lastProbe.ok && !draining,
    details: { customerSite: { ...lastProbe, draining } }
  }));

  this.addStopHandler(async () => {
    draining = true;
    this.logger.info("site probe draining");
  });

  while (!draining) {
    const started = Date.now();
    try {
      const response = await fetch(this.config.siteUrl as string);
      lastProbe = { ok: response.ok, latencyMs: Date.now() - started };
    } catch (error) {
      lastProbe = { ok: false, latencyMs: Date.now() - started };
      this.logger.warn("site probe failed", { error: String(error) });
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

The trust boundary is explicit: `siteUrl` and the remote response are external inputs; health details are operator-visible and must be sanitized. The sequence does not own Hub or Manager authentication, TLS, ingress, or site credentials.

Validate the control flow with `cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/phase6-guide-contracts.spec.ts --match="*direct Hub and Manager-routed control flow*"`. The evidence test checks the architecture description and the real Manager-routed conformance test (`packages/manager/test/manager-api-v2-hotwire.spec.ts`), which exercises `stopping`, `killing`, `completed`, `errored`, and `gone` InstanceStatus transitions through the Hub. Test `stop` with a bounded timeout and `kill` separately. A disconnected control path is an error, not proof of successful cleanup.

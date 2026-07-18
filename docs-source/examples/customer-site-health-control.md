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

Maintainers may use the sequence-test and Manager conformance tests as optional evidence. Authors should verify the installed artifact and live lifecycle below; a disconnected control path is not proof of successful cleanup.

## Install and exercise the deliverable with the Process Adapter

Use the canonical [installed Sequence setup and run guide](../sequences/setup-and-run.md), then build the package with its configured `siteUrl`, install runtime dependencies, and pack it:

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o site-health.tar.gz
```

### Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 --sequences-root "$PWD/sequence-store"
```

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

Deploy with the actual startup configuration and observe the probe:

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./site-health.tar.gz --config-string '{"siteUrl":"https://example.com/health"}'
# Or separate upload and start:
si sequence send ./site-health.tar.gz
si sequence start <sequence-id> --config-string '{"siteUrl":"https://example.com/health"}'
si instance info <instance-id>
si instance log <instance-id>
# stop uses a bounded timeout (10000ms) — the instance drains then stops
si instance stop <instance-id> 10000
si instance info <instance-id>
```

Success is a running instance whose monitoring output reports `healthy: true` after a successful probe, followed by the `site probe draining` log and a stopped/completed lifecycle after the `stop` bounded timeout. Use `si instance kill <instance-id>` only to verify forced termination separately (not part of the graceful-stop workflow). The Process Adapter provides no container CPU/memory or filesystem isolation and child lifecycles are tied to the Hub. A Manager does not run the process itself: after the Hub is connected with the deployment's Manager configuration, set `si config set apiUrl http://manager-host:8200`; the Manager routes upload/control requests to that Hub. Configure TLS, authentication, and remote-site access outside this sequence.

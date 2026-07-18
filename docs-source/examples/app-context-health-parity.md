---
id: example-app-context-health-parity
slug: /examples/app-context-health-parity
title: AppContext health parity across runtimes
---

# AppContext health parity across runtimes

Use this example when you want the same sequence health and lifecycle behavior on a supported runtime. The runtime wrapper connects your sequence to the Hub instance channels, so monitoring, logs, instance-scoped events, and stop handling have a shared host-visible meaning.

Read [SequenceAppContext and runtime parity](../sequences/sequence-app-context.md) for the complete API surface.

## Prerequisites

- Package exactly one supported runtime in `package.json` `engines`: `node`, `python3`, or `bun`. Runtime selection gives `node` precedence, then `bun`, then `python3`; do not declare more than one for a sequence.
- For a local Node deployment with the Process Adapter, install the matching Node runtime on the Hub host.
- For hosted Python, provide Python `>=3.9` and the sequence dependencies on a Process Adapter host, or select Docker or Kubernetes with a configured Python runner image.
- For hosted Bun, select Docker or Kubernetes with a configured Bun runner image. Bun runs through the hosted Bun wrapper, which delegates the host-connected AppContext behavior to Node; there is no separate direct or headless Bun mode.
- For Docker, make the Docker daemon available to the Hub and configure the Node, Python, or Bun runner image selected by your package. For Kubernetes, configure the matching runner image and a Hub address reachable from runner pods.
- Use test credentials and non-sensitive probe details.

## Sequence design

This Node sequence declares health through a monitoring handler, records a lifecycle transition through a stop handler, writes a Hub-visible log, and emits an instance-scoped event.

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

export default async function (this: SequenceAppContext) {
  let ok = true;
  let stop!: () => void;
  const stopped = new Promise<void>(resolve => { stop = resolve; });

  this.addMonitoringHandler(() => ({
    healthy: ok,
    details: { probe: { runtime: "node", ok } }
  }));
  this.addStopHandler(async () => {
    ok = false;
    stop();
  });
  this.logger.info("probe ready");
  this.emit("probe.ready", { ok: true });
  await stopped;
}
```

The unresolved `stopped` promise keeps the instance running so its monitoring handler, log, and event remain observable until the Hub sends stop. The stop handler first changes the health value, then resolves the promise so the instance can finish its normal lifecycle. Hosted Python uses `add_monitoring_handler`, `add_stop_handler`, and `context.logger` for the same monitoring, lifecycle, log, and event behavior. Its `context.hub` and `context.space` are scoped `get()`/`post()` clients, not Node-fluent clients or a generic Python REST SDK. Hosted Bun delegates these behaviors and Node-style API registration through its Node wrapper. Node alone exposes instance-local `localStorage`; do not treat `save` as durable persistence on any runtime.

The wrapper and its Hub connection are the trust boundary. AppContext does not grant filesystem, network, or secret access, make event delivery durable, or authorize requests. Observe a disconnected or failed instance through its lifecycle status and restart it according to your deployment policy.

## Package a Node sequence

Follow the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for the complete walkthrough. Use this local Process Adapter path for a Node package. Package Python with its Python dependencies and runtime metadata instead; deploy Python or Bun to Docker or Kubernetes only after configuring their matching runner images.

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o app-context-health.tar.gz
```

## Start the Hub

Keep this terminal in the foreground while you deploy and observe the sequence.

### Foreground Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

The Process Adapter runs the selected runner as a Hub child process. It does not isolate CPU, memory, filesystem, process namespace, or networking, and the Hub stops child runners when it stops.

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

## Deploy and observe

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./app-context-health.tar.gz
# Or upload and start separately:
si sequence send ./app-context-health.tar.gz
si sequence start <sequence-id>
```

### Observation terminal

```sh
si instance info <instance-id>
si instance log <instance-id>
si instance stop <instance-id> 10000
```

Inspect the Hub status for `ready: true`, the `probe ready` log, a healthy monitoring frame with `details.probe.runtime: "node"`, and the `probe.ready` event while the instance remains running. Stop it only after those observations; its stop handler changes the final health value before the stopped lifecycle state.

## Local verification (optional)

Run the packaging, foreground Hub, readiness, deployment, and observation commands only when you have the Node package and the `sth` and `si` CLIs installed locally. Use your deployed Python package with a Python-capable host or configured Python runner image, and use your deployed Bun package with a configured Bun runner image; this Node Process Adapter walkthrough does not validate those hosted runtimes.

## What this demonstrates

You can rely on shared AppContext behavior for health, lifecycle, logs, and scoped events while choosing the runner appropriate to your deployment. Select Node for the local Process Adapter path shown here; select hosted Python only where Python and its dependencies are available to the runner; and select hosted Bun only with a Bun runner image. Docker and Kubernetes require the matching Node, Python, or Bun runner image, while the Process Adapter runs the selected runner directly on the Hub host. A successful run shows consistent health, lifecycle, log, and event behavior across the supported runtime.

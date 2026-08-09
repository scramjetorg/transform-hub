---
id: example-customer-site-topic-probe-pipeline
slug: /examples/customer-site-topic-probe-pipeline
title: Customer-site topic probe pipeline
---

# Customer-site topic probe pipeline

This walkthrough is motivated by the public [Server Fault remote-site monitoring question](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet). You build two independent Sequences: a probe that publishes a measurement and a dashboard that consumes it without coupling their main streams.

Use the [topics guide](../sequences/sequence-topics.md) for the operation contract.

Use the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for packaging,
Hub readiness, and direct or Manager-routed execution.

## Prerequisites

- Node.js 18 or later, plus published `sth` and `si` commands.
- A Hub, or a Hub connected to a Manager, that can run both Sequences.
- Two Sequence projects, `probe-sequence/` and `dashboard-sequence/`, each with its own `package.json` and build script.
- Both instances must be in the same permitted topic scope. Topic names and origins are scoped, so a same-named topic in another Hub or Space is not the same route.

The probe creates `customer-site-probes` with the `application/json` content type and writes newline-delimited JSON to it. The dashboard receives that topic as its normal `input` stream. It stores the latest probe for each site and serves the current state through a local HTTP server.

Topics provide live delivery, not storage. Handle backpressure and disconnect errors in your application, and decide how to handle measurements missed while a connection is unavailable. Hub, Manager, and Space authentication and authorization remain outside this example.

## Probe Sequence

```typescript
import { Readable } from "node:stream";
import type { SequenceAppContext } from "@scramjet/sequence-types";
import type { HubClient } from "@scramjet/rest-api2";

type Context = SequenceAppContext<any, unknown, HubClient, unknown>;

export default async function (this: Context) {
  const topic = "customer-site-probes";
  const probe = { site: String(this.config.siteName), ok: true, at: new Date().toISOString() };
  await this.hubClient().createTopic.post({
    body: { topic: { name: topic, contentType: "application/json" } }
  });
  // The typed v2 stream route is scoped to this Hub.
  await this.hubClient().topicWrite.post({
    params: { name: topic },
    headers: { "content-type": "application/json" },
    body: Readable.from([Buffer.from(JSON.stringify(probe) + "\n")])
  });
  this.emitToSpace("probe.published", { topic, site: probe.site });
  return probe;
}
```

`createTopic.post` and `topicWrite.post` are typed Hub-scoped operations. The stream route is scoped to the Hub that runs the probe, so use the exact same topic name and permitted scope when you route the dashboard input.

## Consume probes in a local dashboard

The second Sequence consumes the same topic through its normal input stream. It keeps the most
recent probe for each site, serves that state on a local HTTP port, and returns a small summary
when its input closes. It does not create another topic or use a separate topic-consumer API.

```typescript
import { createServer } from "node:http";
import type { Readable } from "node:stream";
import type { SequenceAppContext } from "@scramjet/sequence-types";

type Probe = { site: string; ok: boolean; at: string };
type DashboardConfig = { dashboardPort?: number };
type Context = SequenceAppContext<DashboardConfig>;

const page = `<!doctype html>
<meta charset="utf-8">
<title>Customer-site probes</title>
<style>
  body { margin: 2rem; background: #000; color: #fff; font: 16px/1.5 monospace; }
  pre { white-space: pre-wrap; }
</style>
<pre id="probes">loading…</pre>
<script>
  const view = document.querySelector("#probes");
  async function refresh() {
    const response = await fetch("/api/probes");
    view.textContent = JSON.stringify(await response.json(), null, 2);
  }
  refresh();
  setInterval(refresh, 2000);
</script>`;

export default async function (this: Context, input: Readable) {
  const probes = new Map<string, Probe>();
  const port = this.config.dashboardPort ?? 8787;
  const server = createServer((request, response) => {
    if (request.url === "/api/probes") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([...probes.values()]));
      return;
    }
    if (request.url === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(page);
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  let pending = "";
  let processed = 0;
  try {
    for await (const chunk of input) {
      pending += Buffer.from(chunk).toString("utf8");
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const probe = JSON.parse(line) as Probe;
        probes.set(probe.site, probe);
        processed += 1;
      }
    }
    return { processed, sites: probes.size };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
```

Set `dashboardPort` in the Sequence configuration to choose the local listener port. When you omit it, the dashboard uses `8787`. The server intentionally binds to `127.0.0.1`, so it is available at `http://127.0.0.1:8787/` only from the environment where the dashboard runs.

`--input-topic customer-site-probes` makes the topic the `input` stream consumed above. When that live input closes, the Sequence returns `{ processed, sites }`; add `--output-topic <topic-name>` if you need to route that result to another topic.

For Docker, Kubernetes, or a remote Hub, configure the selected environment's port exposure before you expect the local dashboard URL to be reachable. Do not assume the Process Adapter's loopback binding or host filesystem behavior applies to containers. Configure container mounts when your Sequence needs files from the host.

## Build and run with the Process Adapter

Follow the canonical [Set up and run an installed Sequence](../sequences/setup-and-run.md) guide.
This example uses Hub API port `8000` on `127.0.0.1` and a separate `sequence-store/` directory.

### Probe package terminal

Build and pack the probe independently so its archive contains its own build output and production dependencies.

```sh
cd probe-sequence
npm install
npm run build
npm install --production
cd ..
si sequence pack ./probe-sequence -o customer-site-probe.tar.gz
```

### Dashboard package terminal

Build and pack the dashboard independently for the same reason.

```sh
cd dashboard-sequence
npm install
npm run build
npm install --production
cd ..
si sequence pack ./dashboard-sequence -o customer-site-dashboard.tar.gz
```

### Foreground Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence send ./customer-site-dashboard.tar.gz
si sequence start <dashboard-sequence-id> \
  --input-topic customer-site-probes \
  --config-string '{"dashboardPort":8787}'
si sequence deploy ./customer-site-probe.tar.gz \
  --config-string '{"siteName":"customer-a"}'
si instance list
si instance info <dashboard-instance-id>
si instance info <probe-instance-id>
si instance log <probe-instance-id>
```

Start the dashboard before the one-shot probe so its input stream is connected when the probe writes its live record. The separate upload/start path makes that ordering explicit; the returned dashboard instance ID is the value used in the observation commands.

### Dashboard access terminal

Run this from the host where the dashboard Sequence is running:

```sh
curl --fail http://127.0.0.1:8787/
curl --fail http://127.0.0.1:8787/api/probes
```

The first request returns the dashboard page. The second returns the latest JSON measurement for each site after the probe publishes to `customer-site-probes`.

## Local verification (optional)

You can use the following checks while developing the two Sequences:

```sh
si instance list
si instance info <probe-instance-id>
si instance info <dashboard-instance-id>
si instance log <probe-instance-id>
```

The v2 stream endpoint is `POST /api/v2/topics/:name/stream`. In the probe, `createTopic.post` and `topicWrite.post` use that Hub-scoped topic model. Poll the readiness endpoint above instead of relying on a fixed delay before deployment.

## What this demonstrates

You can collect measurements at one location with the probe Sequence and expose their current state through a dashboard Sequence somewhere else. Topic routing delivers the probe's live `customer-site-probes` data to the dashboard's normal input stream, while the local dashboard endpoint exposes the latest per-site state at `/` and `/api/probes`. A successful run shows probe measurements flowing through the topic to the dashboard output.

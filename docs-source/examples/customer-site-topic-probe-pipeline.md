---
id: example-customer-site-topic-probe-pipeline
slug: /examples/customer-site-topic-probe-pipeline
title: Customer-site topic probe pipeline
---

# Customer-site topic probe pipeline

This walkthrough is motivated by the public [Server Fault remote-site monitoring question](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet). A probe can publish a measurement while another sequence consumes it without coupling their main streams.

Use the [topics guide](../sequences/sequence-topics.md) for the operation contract.

Use the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for packaging,
Hub readiness, and direct or Manager-routed execution.

Prerequisites: a running Hub (or connected Manager), two sequence instances in the same permitted topic scope, and a topic with a declared content type. Topic names and origins are scoped; the creator must not assume that a same-named topic in another Hub or Space is the same route.

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

Create the topic, route its input/output as appropriate, and verify content type on both sides. Topic delivery is live and backpressure/disconnect errors are observable; topics are not persisted and cannot be replayed after a connection loss. Reconnect requires an application decision about missed measurements. Authentication and authorization for Hub, Manager, and Space remain outside this snippet.

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

Start this package with the existing input-topic routing option and pass the local port as normal
Sequence configuration. The complete installed-deliverable workflow is below; the dashboard binds
to loopback at `http://127.0.0.1:8787/`.

### Dashboard start terminal

```sh
si sequence start <dashboard-sequence-id> \
  --input-topic customer-site-probes \
  --config-string '{"dashboardPort":8787}'
```

`--input-topic` makes `customer-site-probes` the `input` stream consumed above. The returned
`{ processed, sites }` value is the Sequence output when that live input is closed; add the
existing `--output-topic <topic-name>` option if that output should be routed to another topic.
The dashboard binds only to loopback. For Docker, Kubernetes, or a remote Hub, configure that
environment's normal port exposure before expecting the local URL to be reachable.

## Optional maintainer evidence

The v2 stream equivalent is `POST /api/v2/topics/:name/stream`; the `createTopic.post` and
`topicWrite.post` calls above are typed Hub-scoped operations. Python uses the wrapper's scoped
`context.hub.post()` method. Existing `/api/v1/topic` callers remain compatibility paths. Maintainers
may run the AppContext and live topic checks when their Docker prerequisites are available; those
checks are not required for an author to deploy this package. Poll route readiness instead of using
a fixed sleep.

## Installed Process Adapter workflow

Follow the canonical [Set up and run an installed Sequence](../sequences/setup-and-run.md) guide.
For this two-sequence pipeline, use Node.js `>=18`, published `sth`/`si`, Hub API port `8000` on
`127.0.0.1`, and a separate `sequence-store/` directory. The Process Adapter has no container
mounts. The probe sequence needs config `siteName`, creates the exact topic
`customer-site-probes` with content type `application/json`, and the dashboard sequence needs
`dashboardPort: 8787`; expose port `8787` only if the dashboard must be reached beyond loopback.

### Packaging terminal

Each directory is a standalone Sequence project with its own `package.json`, build output,
and production `node_modules` included in its archive.

```sh
cd probe-sequence && npm install && npm run build && npm install --production && cd ..
si sequence pack ./probe-sequence -o customer-site-probe.tar.gz

cd dashboard-sequence && npm install && npm run build && npm install --production && cd ..
si sequence pack ./dashboard-sequence -o customer-site-dashboard.tar.gz
```

### Hub terminal

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
si sequence deploy ./customer-site-probe.tar.gz \
  --config-string '{"siteName":"customer-a"}'
si sequence deploy ./customer-site-dashboard.tar.gz \
  --input-topic customer-site-probes \
  --config-string '{"dashboardPort":8787}'
si instance list
si instance info <probe-instance-id>
si instance info <dashboard-instance-id>
si instance log <probe-instance-id>
```

Success is a `probe.published` event and a JSON measurement containing `site: "customer-a"`, the
dashboard responding with HTTP 200 at `http://127.0.0.1:8787/`, and `/api/probes` containing that
measurement. Both instances must be visible in `si instance list` and report started in
`si instance info`. For Docker or Kubernetes, deploy the two archives with the selected adapter,
declare the shared topic in the permitted scope, and configure runner networking plus port exposure
for `8787`; do not assume the process adapter's loopback binding or host filesystem behavior carries
over.

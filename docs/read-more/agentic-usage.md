# Agentic usage and production startup

This guide describes how an automated agent can write a Transform Sequence,
start Scramjet Transform Hub (STH) headlessly, verify readiness, and interact
with the Hub API without manual steps.

Use this guide with:

- [STH configuration](./sth-config.md)
- [How to write a Sequence](./how-to-write-a-sequence.md)
- [`schemas/sth-config.schema.json`](../../schemas/sth-config.schema.json)
- [`schemas/startup-config.schema.json`](../../schemas/startup-config.schema.json)

## Agent workflow

An agentic STH workflow should be deterministic:

1. Write or select a Transform Sequence.
2. Package or store the Sequence so the selected Adapter can resolve it.
3. Write an STH config file and, when needed, a host startup-config file.
4. Start the Hub with explicit `--runtime-adapter`, `--config`, and
   `--startup-config` paths.
5. Poll readiness endpoints until the Hub is ready.
6. Use stable `sequenceName` and `instanceName` values so repeated agent runs
   can recognize existing Sequences and Instances.
7. Send input, read output, read logs, and consume events through the API.

For local agent loops, the `process` Adapter is the most direct starting point
because it does not require Docker or Kubernetes infrastructure.

## Write a minimal Transform Sequence

A Transform Sequence is a program exported as a function or an array of
functions. The first argument is the input stream. The return value is the
output stream, a promise, an iterable, or an async iterable.

Create a minimal Node.js Sequence source file:

```js
// index.js
export default async function* (input) {
  for await (const chunk of input) {
    yield `agent:${chunk.toString()}`;
  }
}
```

Use stable names in deployment and startup metadata:

- `sequenceName`: logical name for the stored Sequence, for example
  `agent-echo`.
- `instanceName`: public label for a running Instance, for example
  `agent-echo-prod`.

Prefer stable names over generated IDs when an agent needs idempotent behavior.
Before creating or starting work, an agent can call `/api/v1/sequences` and
`/api/v1/instances` and compare these names with the desired state.

For more Sequence patterns, including producing, consuming, transforming,
topics, standard streams, and `AppContext` logging, see
[How to write a Sequence](./how-to-write-a-sequence.md).

## Config files

Create an STH config file for local process execution:

```json
{
  "$schema": "../../schemas/sth-config.schema.json",
  "runtimeAdapter": "process",
  "host": {
    "hostname": "0.0.0.0",
    "port": 8000,
    "apiBase": "/api/v1"
  },
  "sequencesRoot": "./sequences",
  "identifyExisting": true,
  "startupConfig": "./startup-config.json",
  "exitWithLastInstance": false
}
```

Create a host startup-config file when the Hub should start Sequences at launch:

```json
{
  "$schema": "../../schemas/startup-config.schema.json",
  "sequences": [
    {
      "id": "agent-echo",
      "sequenceName": "agent-echo",
      "instanceName": "agent-echo-prod",
      "required": true,
      "restartLimit": 3,
      "args": []
    }
  ]
}
```

The startup-config file consumed by `--startup-config` has a top-level
`sequences` array. Each item follows the `StartSequenceDTO` shape used by the
Hub. The process Adapter must be able to resolve the `id` from the configured
`sequencesRoot`.

For process Adapter startup from packages already stored in `sequencesRoot`, set
`identifyExisting: true` in the Hub config or start from a Hub state where the
Sequence has already been registered. If a startup `id` cannot be resolved, the
Hub logs a warning and skips that startup entry; `required: true` controls
restart handling after a startup entry has been resolved and launched.

## Start STH in production mode

Production mode means running built package output or an installed package,
instead of `npm run start:dev` or source-level `tsx` entrypoints.

### Local package from built sources

Use this when an agent has cloned this repository and should run the package
from local build output:

```bash
npm ci
npm run build:packages
node dist/sth/bin/hub.js \
  --runtime-adapter process \
  --config ./sth-config.json \
  --startup-config ./startup-config.json
```

If you need the root package binary after building, the root package maps
`scramjet-transform-hub` to `dist/sth/bin/hub.js`.

### npm package

Use this when the package should be resolved from the public npm registry:

```bash
npm install --global @scramjet/sth
scramjet-transform-hub \
  --runtime-adapter process \
  --config ./sth-config.json \
  --startup-config ./startup-config.json
```

For one-off runs without a global install:

```bash
npx @scramjet/sth \
  --runtime-adapter process \
  --config ./sth-config.json \
  --startup-config ./startup-config.json
```

### GitHub Packages

Use this when the package should be resolved from GitHub Packages. Configure npm
for the `@scramjet` scope first:

```bash
npm config set @scramjet:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
npm install --global @scramjet/sth
scramjet-transform-hub \
  --runtime-adapter process \
  --config ./sth-config.json \
  --startup-config ./startup-config.json
```

The token must have permission to read packages from the GitHub organization or
repository that publishes the package.

## Readiness checks

The default API base path is `/api/v1` and the default port is `8000`. An agent
should poll these endpoints before sending work:

```bash
curl --fail http://127.0.0.1:8000/api/v1/version
curl --fail http://127.0.0.1:8000/api/v1/status
curl --fail http://127.0.0.1:8000/api/v1/load-check
```

Useful Host API endpoints include:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/version` | Confirm the Hub API is responding and read version/build information. |
| `GET /api/v1/status` | Read Hub status, including CPM connection state when configured. |
| `GET /api/v1/load-check` | Check whether the Hub reports enough capacity to start work. |
| `GET /api/v1/config` | Read the public-safe Hub configuration. |
| `GET /api/v1/sequences` | List stored Transform Sequences. |
| `GET /api/v1/instances` | List running Instances. |

For a running Instance, use the Instance API under `/api/v1/instance/:id`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/instance/:id/health` | Read Instance health/monitoring information. |
| `POST /api/v1/instance/:id/input` | Send input to the Instance stream. |
| `GET /api/v1/instance/:id/output` | Read the Instance output stream. |
| `GET /api/v1/instance/:id/log` | Read Instance logs. |
| `GET /api/v1/instance/:id/events/:name` | Stream events emitted by the Instance for a named event. |

## REST API deployment pattern

To send a new packaged Sequence to the Hub, stream the package to the Sequence
endpoint. The Hub assigns the Sequence ID and returns it in the response:

```bash
curl --fail --request POST \
  --data-binary @agent-echo.tar.gz \
  http://127.0.0.1:8000/api/v1/sequence
```

Use the returned ID in later calls. `PUT /api/v1/sequence/:id` updates an
existing Sequence; it is not a create-with-custom-id endpoint.

Then start the Sequence with stable metadata:

```bash
curl --fail --request POST \
  --header 'content-type: application/json' \
  --data '{"sequenceName":"agent-echo","instanceName":"agent-echo-prod","args":[]}' \
  http://127.0.0.1:8000/api/v1/sequence/$SEQUENCE_ID/start
```

The response contains the Instance `id`. Store that ID for subsequent stream,
health, log, and event requests.

Read output:

```bash
curl --fail http://127.0.0.1:8000/api/v1/instance/$INSTANCE_ID/output
```

Send input:

```bash
printf 'hello\n' | curl --fail \
  --request POST \
  --header 'content-type: text/plain' \
  --data-binary @- \
  http://127.0.0.1:8000/api/v1/instance/$INSTANCE_ID/input
```

Stream a named event:

```bash
curl --fail http://127.0.0.1:8000/api/v1/instance/$INSTANCE_ID/events/ready
```

## TypeScript client loop

For longer-running agents, prefer the API client package over ad hoc shell
commands when it is available in the agent runtime:

```ts
import { HostClient } from "@scramjet/api-client";

const host = new HostClient("http://127.0.0.1:8000/api/v1");

async function waitForHub() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await host.getVersion();
      await host.getLoadCheck();
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error("STH did not become ready in time");
}

await waitForHub();
```

Check the installed `@scramjet/api-client` version for exact method names before
using advanced operations; REST endpoints above are the source-level contract for
this repository.

## Operational notes for agents

- Keep config paths absolute or resolve them relative to the working directory
  used to start STH.
- Prefer `--runtime-adapter process` for local automation; document Docker or
  Kubernetes prerequisites explicitly when using those Adapters.
- Treat `sequenceName` and `instanceName` as idempotency keys in agent plans.
- Poll `/api/v1/load-check` before starting new Instances and `/health` for
  running Instance health.
- Keep `--startup-config` for host launch-time `sequences` arrays. Do not mix it
  with per-sequence CLI start payload fragments unless they share the same
  contract in the current code.

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

Maintainers may use the repository lifecycle-contract test and `npm run docs:check` as optional evidence; neither is an author prerequisite for the installed deliverable.

## Install and verify the deliverable with the Process Adapter

Follow the canonical [installed Sequence setup and run guide](../sequences/setup-and-run.md) for the full package contract. From the Sequence project, install, build, install production dependencies, and create the archive:

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o validation-service.tar.gz
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

Point `si` at that Hub and deploy with the configuration key used by this example. `dataFile` must resolve inside the packaged or explicitly mounted filesystem:

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./validation-service.tar.gz --config-string '{"dataFile":"/path/visible-to-the-runner/data.json"}'
# Or separate upload and start when those operations must be split:
si sequence send ./validation-service.tar.gz
si sequence start <sequence-id> --config-string '{"dataFile":"/path/visible-to-the-runner/data.json"}'
si instance list
si instance info <instance-id>
si instance log <instance-id>
```

Live success is the `ready: true` Hub status, a running instance in `si instance info`, the `validation passed` log, and a successful request to the sequence's `/status` route. A missing or inaccessible `dataFile` must instead produce `RESOURCE_UNAVAILABLE` and an errored instance. The Process Adapter runs child processes without container resource or filesystem isolation; the Hub owns their lifecycle and stops them when it stops. For Manager-routed deployment, configure and connect the Hub to the Manager first, then change `apiUrl` to the Manager endpoint; Manager routes the operation but the connected Hub's Process Adapter runs the Runner.

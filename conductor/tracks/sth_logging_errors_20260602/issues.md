# Logging and Error Handling Issues

Use this file to record surfaced logging/handling defects during this track.

## Template

### <Scenario or Issue Name>

- **Scenario/reference:**
- **Reproduction:**
- **Observed behavior:**
- **Expected behavior:**
- **CI/review status:**
- **Status/follow-up:**

## Findings

### Missing Node import before runner-node connects

- **Scenario/reference:** `HUB-004 TC-001 Missing Node import is visible in STH logs`
- **Reproduction:** `SCRAMJET_SPAWN_TS=1 NO_HOST=true RUNTIME_ADAPTER=process node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @sth-logging`
- **Observed behavior:** Pre-connect module-load failures needed STH-visible context rather than relying only on raw runner stderr.
- **Expected behavior:** STH logs include `STH runtime error`, `phase=runner-connect`, `sequenceId=missing-import`, and `Cannot find module`.
- **CI/review status:** CI scenario under `@ci-hub @starts-host @sth-logging`.
- **Status/follow-up:** Fixed for Process + Node via contextual crash logging in the host/adapter/runner path.

### Runtime throw after instance connects

- **Scenario/reference:** `HUB-004 TC-002 Runtime throw is visible in STH logs after instance connects`
- **Reproduction:** `SCRAMJET_SPAWN_TS=1 NO_HOST=true RUNTIME_ADAPTER=process node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @sth-logging`
- **Observed behavior:** Post-connect runtime failures originally surfaced only generic `Sequence failed during execution` details in STH logs because the sequence error was serialized as `{}`.
- **Expected behavior:** STH logs include `phase=instance-runtime`, the sequence id, instance context, and the thrown message.
- **CI/review status:** CI scenario under `@ci-hub @starts-host @sth-logging`.
- **Status/follow-up:** Fixed by serializing runner-node errors and logging `SEQUENCE_STOPPED` error details in the host CSI controller.

### Invalid startup parameters passed to a sequence

- **Scenario/reference:** `HUB-004 TC-003 Invalid startup parameters are visible in STH logs`
- **Reproduction:** `SCRAMJET_SPAWN_TS=1 NO_HOST=true RUNTIME_ADAPTER=process node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @sth-logging`
- **Observed behavior:** Sequence-level parameter validation failures followed the same post-connect error serialization gap as runtime throws.
- **Expected behavior:** STH logs include `phase=instance-runtime`, the sequence id, and the sanitized expected-parameter message.
- **CI/review status:** CI scenario under `@ci-hub @starts-host @sth-logging`.
- **Status/follow-up:** Fixed for Process + Node. Broader Docker, Kubernetes, Python, and Bun parity remains deferred.

### Validation notes

- **Passed:** `npm run build:packages`.
- **Passed:** `SCRAMJET_SPAWN_TS=1 NO_HOST=true RUNTIME_ADAPTER=process node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @sth-logging`.
- **Passed:** `npm test` in `packages/runner-node`.
- **Passed:** `npm test` in `packages/adapter-process`.
- **Passed with warnings:** targeted ESLint on changed TypeScript files; remaining output was warnings only.
- **Known/preexisting environment failure:** root `npm run lint` reports existing host-package lint errors outside this track's changed lines.
- **Known/preexisting environment failure:** `npm test` in `packages/host` fails because CouchDB is not available at `127.0.0.1:5984`; unrelated host tests passed before that failure.

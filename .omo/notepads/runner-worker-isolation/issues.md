# Issues


## 2026-05-30: blockers remaining after runner-node runtime entry slice

The runner-node `bin/runner-node.ts` now drives `runSequence()` + `RunnerLifecycle` + control-stream dispatch + monitoring framing on fd5, but two integration pieces are blocked on boot-config / fd-layout extensions that are out of scope for this slice:

1. **No host port/host data in `RunnerNodeBootConfig`.**
   The current shape is `{ sequencePath, sequenceArgs?, instanceId? }`; the outer
   `packages/runner/src/bin/start-runner.ts` writes exactly that. Without
   `instancesServerPort` and `instancesServerHost` in the boot config, runner-node
   cannot construct a real `HostClient` (`packages/runner-node/src/host-client.ts`)
   that opens the legacy nine sockets to the instances-server. As a result:
   - `RunnerAppContext` (the full one in `packages/runner-node/src/runner-app-context.ts`)
     is NOT instantiated. The sequence-facing `this` is a runner-node native
     `SequenceLocalContext` that mirrors the AppContext surface for
     `keepAlive/end/destroy/on/emit/localStorage/instanceId/logger/emitter` but
     does NOT expose `hub`, `space`, or `api`.
   - Exposed-API integration (`@scramjet/api-server` createServer + APIExpose
     wiring) is deferred. BDD scenario "Exposed sequence API streams response chunks"
     and its mirror remain blocked end-to-end on this.
   To unblock: extend `RunnerNodeBootConfig` with `instancesServerPort: number` and
   `instancesServerHost: string` (and forward them in `start-runner.ts`'s
   `writeBootConfig()`). Then runner-node can `new HostClient(port, host).init(instanceId)`
   and pass the real `HostClient` plus `ApiHostClient`/`ManagerClient` into
   `RunnerAppContext`.

2. **No separate sequence-data IN/OUT sockets in the current fd layout.**
   `RUNNER_NODE_STDIO = ["pipe","pipe","pipe","ipc","pipe","pipe"]` only carries
   STDIN/STDOUT/STDERR + IPC + control(fd4)/monitoring(fd5). The legacy host has
   nine channels (CC.IN, CC.OUT, CC.LOG, CC.REQUESTS, etc.) that the inner
   runtime cannot reach over fds. As a result:
   - `runSequence()` in runner-node is given an empty `inputDataStream` (an
     already-ended `DataStream`) and a discard `PassThrough` as `outputStream`.
     `mapToInputDataStream` / `readInputStreamHeaders` from
     `packages/runner-node/src/input-stream.ts` are imported by the package
     but not yet wired into the entry; they will become reachable once a
     real input socket exists.
   - PANG monitoring frames are correctly emitted to fd5, but real sequence
     output bytes have nowhere to go in this slice.
   Two unblocking options (out of scope here):
   (a) extend boot config with host port/host, then have runner-node connect
       its own input/output/log/requests sockets from inside the child (the
       `HostClient.init(id)` path); OR
   (b) extend the spawn fd layout with extra pipes (fd6+) and have the outer
       runner forward the corresponding host channels raw.

Until either of those lands, the BDD E2E-017 scenarios that require host I/O
beyond stdout/stderr + control/monitoring (api streaming, input-content-type-driven
parsing) remain blocked end-to-end. The other scenarios (clean completion under
spawn isolation, stdout-before-SEQUENCE_STOPPED ordering, STOP+keepAlive parity)
are now satisfied at the unit level by `packages/runner-node/test/runtime-entry.spec.ts`
+ existing `lifecycle-parity.spec.ts` + the outer runner's executor tests.


## 2026-05-30: blocker 1 RESOLVED — boot-config now carries host port/host

- `RunnerNodeBootConfig` extended with optional `instancesServerPort: number` and `instancesServerHost: string` (paired); `instanceId` is now required.
- `start-runner.ts` writes them into the JSON boot config.
- `runner-node.ts` constructs a real `HostClient` for `{IN, OUT, LOG, REQUESTS}` when both fields are present, while the outer `packages/runner` keeps owning `{STDIN, STDOUT, STDERR, CONTROL, MONITORING}` via `OUTER_RUNNER_CHANNELS`.
- Sequence-data IN/OUT are now wired end-to-end: `inputDataStream` is fed from real host IN via `readInputStreamHeaders` + `mapToInputDataStream`, and `outputDataStream.JSONStringify().pipe(hostClient.outputStream)` matches legacy parity.
- Blocker 2 from the previous note (no separate IN/OUT sockets) is also resolved by route (a): runner-node opens its own sockets to the instances-server. The fd layout `["pipe","pipe","pipe","ipc","pipe","pipe"]` is unchanged.

NEW BLOCKER (next slice): full `RunnerAppContext` with `hub`/`space`/`api` is still NOT instantiated. The current sequence-facing `this` is `SequenceLocalContext`. To finish the BDD "Exposed sequence API streams response chunks" scenarios, runner-node needs to:
1. Construct `RunnerAppContext` with the real `HostClient` plus `ApiHostClient`/`ManagerClient` (the latter two read from boot-config fields not yet present).
2. Wire `@scramjet/api-server` `createServer` over `hostClient.bpmux` (REQUESTS channel) for `context.api.use(...)`.
This is out of scope for the channel-split slice but unblocked by it.


## 2026-05-30: RESOLVED — BDD TS5023 blocker removed

- **Root cause:** `tsconfig.base.json` contained `"ignoreDeprecations": "6.0"`, a TypeScript 5.0+ compiler option incompatible with the repo's pinned `typescript@~4.7.4`. This caused `ts-node/register` to fail with `TS5023: Unknown compiler option 'ignoreDeprecations'` before any BDD scenario could execute.
- **Fix:** Removed the single `"ignoreDeprecations": "6.0"` line from `/home/michal/transform-hub/tsconfig.base.json`.
- **Verification:**
  - `yarn test:bdd --dry-run --name="Node sequence completes successfully under runner-node spawn isolation"` → cucumber starts and skips steps (no TS5023).
  - `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` → clean.
  - `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → clean.

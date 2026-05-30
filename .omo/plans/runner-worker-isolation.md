# Runner Worker Isolation - Corrected Plan

## TL;DR

The previous plan is superseded. It used `worker_threads` plus `parentPort` RPC and broke required sequence behaviour: exposed APIs stopped accepting normal handlers and API request/response streams were aggregated. The corrected design uses `child_process.spawn()` with real OS pipes. The outer `packages/runner` becomes a lightweight launcher and stdio hookup. `packages/runner-node` owns Node sequence execution and keeps sequence-facing communication, including `AppContext`, API exposure, and BPMux-backed clients, local to the sequence process.

Core decisions:

- Preserve current behaviour. Existing sequences require no adoption.
- Use `spawn`, not `worker_threads`, because Node 18 workers do not support arbitrary extra fd pipes.
- Do not use `fork()`. Reserve fd 3 as an unused `ipc` slot for Node compatibility; semantic transport remains pipes only.
- Child fd 0/1/2 carry stdin/stdout/stderr.
- Child fd 3 is `ipc` for compatibility with older Node fd quirks and is intentionally unused.
- Child fd 4 carries control passthrough.
- Child fd 5 carries monitoring passthrough.
- Do not proxy exposed API handlers, HTTP bodies, input chunks, or output chunks over JSON/base64 messages.

## Findings From The Failed Plan

The failed plan made the wrong boundary explicit:

- `context.api` was classified as parent-owned RPC, but existing `RunnerAppContext` gives the sequence a real `APIExpose` object with function-valued route handlers.
- Exposed API request bodies and responses were converted to one-shot base64 payloads. That changes streaming, backpressure, ordering, and memory usage.
- Sequence output was reduced to `OUTPUT_CHUNK` messages instead of preserving `runSequence()` stream metadata and serialization rules.
- STOP/keepAlive behaviour depended on sequence-local handlers and was not preserved by the proxy model.
- `worker_threads` can redirect stdin/stdout/stderr and use `parentPort`, but it cannot expose arbitrary fd pipes. Extra pipes require `child_process.spawn()` with a `stdio` array.

## Correct Architecture

### Outer Runner: `packages/runner`

Responsibilities:

- Stay the executable launched by adapters.
- Own only launcher plumbing, stdio hookup, raw control/monitoring passthrough, logging needed for the outer process, and outer process lifecycle.
- Start `packages/runner-node` with `spawn(process.execPath, [entry, bootConfig], { stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] })`.
- Forward host stdin to child stdin.
- Forward child stdout/stderr to host stdout/stderr without closing host streams when the child exits.
- Forward host control and monitoring streams as raw bytes to fd 4/fd 5 with minimal parsing only where required for outer lifecycle safety.
- Do not own BPMux, exposed API handlers, `hub`/`space` clients, sequence input/output transformation, or `RunnerAppContext` semantics.
- Translate child process exit/signal to existing `RunnerMessageCode` messages only when the child cannot report first.

### Node Runtime: `packages/runner-node`

Responsibilities:

- Load the sequence module.
- Construct an `AppContext` equivalent in the same process as sequence code.
- Preserve `func.call(context, inputStream, ...args)`.
- Preserve `context.api` route registration and streaming handlers locally.
- Own the semantic host communication needed by sequence code: `HostClient`/BPMux or an equivalent connection owner for requests, `hub`, `space`, exposed API routing, `localStorage`, event, monitoring, stop, kill, keepAlive, and describe semantics.
- Preserve `runSequence()` stream handling: `DataStream`, `StringStream`, `BufferStream`, primitive return, `topic`, `contentType`, `readableEncoding`, PANG metadata, and serialization decisions.
- Write sequence stdout/stderr naturally to fd 1/fd 2.
- Read sequence stdin from fd 0.
- Use fd 4/fd 5 for the same framed control and monitoring data the current in-process runner consumes/produces; do not replace these streams with JSON RPC.

## Non-Negotiable Invariants

- Existing Node sequences run unchanged.
- `this` inside a sequence remains a compatible `AppContext`.
- `this.api.use(path, handler)` and equivalent expose APIs accept function handlers as today.
- Exposed API request and response bodies stream. Tests must observe multiple chunks before completion.
- No `Buffer.concat`/base64 API aggregation is allowed as the normal exposed API transport.
- `this.hub` and `this.space` keep current public behaviour, including stream-capable methods where supported today, because their BPMux-backed transport is local to the sequence runtime process.
- Sequence output preserves stream metadata and PANG payloads.
- stdout/stderr bytes arrive before terminal lifecycle messages for throw-after-stdout cases.
- `PRINT_TO_STDOUT` and `RUNNER_LOG_FILE` behaviour is explicitly tested.
- STOP passes timeout and `canCallKeepalive` to sequence handlers, and keepAlive preserves current STOP behaviour.
- Host-facing protocol, channel numbers, `RunnerMessageCode`, and adapter env contract are unchanged.

## Explicitly Forbidden

- Production `worker_threads` executor.
- `parentPort` protocol for sequence execution.
- `child_process.fork()` or semantic use of the reserved fd 3 IPC channel.
- `API_REQUEST`, `EXECUTOR_API_INVOKE`, `OUTPUT_CHUNK`, or `INPUT_CHUNK` as the main runtime transport.
- JSON/base64 request/response aggregation for exposed APIs.
- Function-handler rejection in `context.api` caused by the runner boundary.
- New host channel numbers or `RunnerMessageCode` values.
- Changes to `packages/host`, `packages/symbols`, adapters, `python-runner`, or `pre-runner`.
- Changes to `packages/runner/package.json` `main`, the adapter-facing `start-runner` environment contract (`SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCES_SERVER_PORT`, `INSTANCES_SERVER_HOST`, `INSTANCE_ID`), or the existing `RunnerExitCode` mapping.
- `packages/runner/src/bin/start-runner.ts` may be edited only to preserve its current env parsing/validation surface and replace direct in-process `Runner` execution with the new outer-runner launcher path that spawns `runner-node`.

## Deliverables

- `packages/runner-node` workspace containing the spawned Node runtime entry.
- `packages/runner/src/executor/process-executor.ts` using `spawn` with fd 0-5, fd 3 reserved as unused IPC, and fd 4/5 as pipes.
- `packages/runner/src/executor/stream-forwarder.ts` for non-closing stdout/stderr forwarding.
- Shared or copied sequence runtime code preserving current `RunnerAppContext`, `HostClient`/BPMux API-client transport, expose API, and `runSequence()` semantics, with tests before deduplication.
- AVA specs in `packages/runner` and `packages/runner-node`.
- BDD scenarios for happy path, throw-after-stdout ordering, and exposed API streaming.
- Roadmap update that documents `spawn` plus extra pipes instead of `worker_threads`.

## Execution Waves

### Wave 0 - Branch Hygiene

1. Start from `devel`.
2. Do not cherry-pick failed worker/proxy commits.
3. Create a new branch such as `feat/runner-node-spawn-isolation`.
4. Commit this corrected plan and roadmap correction first.

Acceptance:

- Working tree starts clean from `devel`.
- No production files contain V1 protocol names before implementation starts.

### Wave 1 - Pipe Transport Spike

Add RED/GREEN AVA tests proving the transport before refactoring runner code:

- parent spawns a child with `stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]`;
- fd 3 is IPC-reserved and unused;
- fd 4 is duplex control;
- fd 5 is duplex monitoring;
- fd 1/fd 2 remain independent stdout/stderr;
- `process.send` may exist because fd 3 is reserved as `ipc`, but production code never calls it.

Acceptance:

- `cd packages/runner && npx ava -m "*five-pipe*"` passes.
- Test fails if stdio omits reserved `"ipc"` at fd 3 or if fd 4/fd 5 pipes are missing.

### Wave 2 - Runner-Node Runtime Skeleton

Create `packages/runner-node` and a child entry that can:

- read boot config from a private file path or inherited fd, not runner-owned env vars;
- open fd 0-5, ignoring fd 3 and using fd 4/5 as Node streams;
- send a startup-ready monitoring frame only after sequence runtime is initialized;
- load and call a trivial sequence with a sequence-local context.

Acceptance:

- `cd packages/runner-node && npx ava` passes skeleton tests.
- `rg "process.env.SEQUENCE_PATH|process.env.SEQUENCE_INFO|RUNNER_CONNECT_INFO" packages/runner-node/src` has no matches.

### Wave 3 - Preserve AppContext And RunSequence Semantics

Move or factor current sequence-runtime behaviour into `runner-node`:

- `RunnerAppContext` compatible context;
- `HostClient`/BPMux ownership or equivalent request-channel ownership in `runner-node`;
- `hub`, `space`, `api`, `localStorage` behaviour;
- stop/kill/monitoring handlers;
- `runSequence()` stream handling and PANG metadata.

Acceptance:

- Add paired AVA tests that run the same fixture through the legacy devel `Runner` harness and the new `runner-node` harness for primitive output, `DataStream`, `StringStream`, `BufferStream`, NDJSON serialization, `topic`, `contentType`, `readableEncoding`, PANG metadata, stop handlers, keepAlive, and events.
- `cd packages/runner-node && npx ava -m "*app-context parity*"` passes and proves `this.api.use(path, handler)`, `this.hub`, `this.space`, and `this.localStorage` are available inside the sequence without fixture source changes.
- `cd packages/runner-node && npx ava -m "*run-sequence parity*"` passes and asserts byte-for-byte output payloads plus metadata equality against the devel `Runner` harness for primitive, stream, and PANG-returning fixtures.
- `cd packages/runner-node && npx ava -m "*stop keepalive parity*"` passes and asserts STOP timeout and `canCallKeepalive` values observed by fixture handlers match current devel behaviour.
- `rg "api.use\([^,]+,[^)]*=>|function" packages/runner-node/src/test packages/runner/src/test` returns at least one fixture-backed expose-API handler test, and no test requires changes to sequence fixture source.

### Wave 4 - Outer Runner Hookup

Refactor `packages/runner` to spawn `runner-node` and forward pipes:

- host stdin -> child fd 0;
- child fd 1 -> host stdout;
- child fd 2 -> host stderr;
- host control <-> child fd 4 as raw passthrough;
- host monitoring <-> child fd 5 as raw passthrough;
- child exit/signal -> existing lifecycle messages when needed.

Acceptance:

- `cd packages/runner && npx ava -m "*process executor forwarding*"` passes and asserts parent `process.stdout`/`process.stderr` are not overridden in the new Node path.
- `cd packages/runner && npx ava -m "*stream forwarder non closing*"` passes and writes sentinel bytes to host stdout/stderr after child exit to prove host streams remain writable.
- `cd packages/runner && npx ava -m "*control monitoring passthrough*"` passes and uses a fixture child to echo framed control bytes from host -> fd 4 -> host and monitoring bytes from child fd 5 -> host without JSON/base64 transformation.
- `cd packages/runner && npx ava -m "*runner lifecycle ordering*"` passes and asserts stdout/stderr bytes emitted by a throw-after-stdout fixture are observed before the terminal `SEQUENCE_STOPPED`/failure lifecycle message.
- `yarn test:bdd --name="Sequence stdout bytes arrive before SEQUENCE_STOPPED"` passes against the adapter-launched `@scramjet/runner` entrypoint, proving the unchanged `packages/runner/package.json` main path and `start-runner` env contract hook the new outer runner correctly.
- `rg "overrideStandardStream|redirectOutputs|process\.stdout\s*=" packages/runner/src` has no production matches in the new Node execution path.

### Wave 5 - Regression Tests

Add BDD and focused integration tests:

- happy path Node sequence completes;
- sequence writes stdout then throws, and stdout is observed before `SEQUENCE_STOPPED`;
- sequence exposes API endpoint with streaming response; client observes multiple chunks before completion;
- sequence exposed API request body streams into the handler;
- STOP with keepAlive matches current behaviour.

Acceptance:

- `yarn test:bdd --name="Node sequence completes successfully under runner-node spawn isolation"` passes.
- `yarn test:bdd --name="Sequence stdout bytes arrive before SEQUENCE_STOPPED"` passes.
- `yarn test:bdd --name="Exposed sequence API streams response chunks"` passes.

### Wave 6 - Final Verification

Run:

```bash
yarn build:packages
yarn lint
cd packages/runner && npx ava
cd packages/runner-node && npx ava
yarn test:bdd --name="Node sequence completes successfully under runner-node spawn isolation"
yarn test:bdd --name="Sequence stdout bytes arrive before SEQUENCE_STOPPED"
yarn test:bdd --name="Exposed sequence API streams response chunks"
```

Static checks:

```bash
rg "worker_threads|parentPort" packages/runner packages/runner-node
rg "API_REQUEST|EXECUTOR_API_INVOKE|OUTPUT_CHUNK|INPUT_CHUNK|bodyBase64" packages/runner packages/runner-node packages/types
rg "overrideStandardStream|redirectOutputs" packages/runner/src
```

Expected static result: no production matches for V1 protocol or parent stdio override patterns in the new Node path.

## Commit Strategy

Use signed, atomic commits:

1. `docs(runner): correct runner isolation plan for spawn pipes`
2. `test(runner): prove five-pipe child transport`
3. `feat(runner-node): scaffold spawned node runtime`
4. `feat(runner-node): preserve app context and sequence stream semantics`
5. `feat(runner): spawn runner-node with stdio and reserved ipc pipes`
6. `test(bdd): cover exposed API streaming under runner-node`
7. `docs(roadmap): update runner isolation transport decision`

Each implementation commit must include its directly related tests. Do not commit generated `dist/`, package tarballs, or unrelated dirty files.

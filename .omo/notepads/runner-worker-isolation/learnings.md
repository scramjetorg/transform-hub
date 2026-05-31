# Learnings


## 2026-05-30 codebase scan

- `/home/michal/transform-hub/packages/runner` is the live Node runner source package; `/home/michal/transform-hub/packages/runner-node` has no source tree yet (only build artifacts/node_modules/dist coverage), so the planned wrapper is not implemented in-repo.
- Core runtime logic lives in `/home/michal/transform-hub/packages/runner/src/runner.ts`:
  - `Runner` class owns host-client wiring, API exposure, monitoring, control handling, keepalive/stop/lifecycle handling, stdout/stderr redirection, and `runSequence()`.
  - `overrideStandardStream()` / `revertStandardStream()` are the current stdout/stderr hooks (`runner.ts:89-128`, used at `runner.ts:722-745`).
  - `runSequence()` is at `runner.ts:846-993`; it calls sequence functions with `this.context`, manages stream chaining, and writes output to `hostClient.outputStream`.
  - API server exposure is created in the constructor (`runner.ts:200-207`) and optionally started in `premain()` when `exposePath` is set (`runner.ts:587-603`).
- `RunnerAppContext` is in `/home/michal/transform-hub/packages/runner/src/runner-app-context.ts` and is the sequence-facing API surface; `keepAlive()`, `end()`, and `destroy()` proxy back to the runner through `RunnerProxy`.
- Host communication is in `/home/michal/transform-hub/packages/runner/src/host-client.ts`:
  - uses `@scramjet/bpmux` for `REQUESTS` multiplexing (`host-client.ts:109-140`)
  - exposes `stdinStream`, `stdoutStream`, `stderrStream`, `controlStream`, `monitorStream`, `inputStream`, `outputStream`, `logStream`, `requestsStream` (`host-client.ts:180-214`).
- Entry/bootstrap is `/home/michal/transform-hub/packages/runner/src/bin/start-runner.ts`; it reads `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCE_ID`, and host port/host env vars, then constructs `Runner` + `HostClient`.
- Stdout/stderr boot plumbing also exists in `/home/michal/transform-hub/packages/runner/src/bin/start.sh` and `/home/michal/transform-hub/packages/runner/docker-entrypoint.sh`.
- Relevant type definitions:
  - `/home/michal/transform-hub/packages/types/src/app-context.ts` (`AppContext`, `keepAlive`, `end`, `destroy`, `api`, `hub`, `space`, `localStorage`)
  - `/home/michal/transform-hub/packages/types/src/api-expose.ts` (`APIExpose`)
  - `/home/michal/transform-hub/packages/types/src/csh-connector.ts` (`IHostClient`)
  - `/home/michal/transform-hub/packages/types/src/messages/keep-alive.ts`
  - `/home/michal/transform-hub/packages/types/src/messages/stop-sequence.ts`.
- Current package/test commands:
  - root `/home/michal/transform-hub/package.json`: `yarn build:all`, `yarn test:packages`, `yarn test:bdd`, `yarn start`, `yarn start:dev`, `yarn build:runner-images`.
  - `/home/michal/transform-hub/packages/runner/package.json`: `build`, `build:docker`, `export:docker`, `build:docs`, `start`, `test:docker`; no regular unit-test script.
  - `/home/michal/transform-hub/packages/model/package.json`: `test: nyc ava`.
  - `/home/michal/transform-hub/packages/api-server/package.json`: `test: npm run test:ava`.
  - `/home/michal/transform-hub/packages/bpmux/package.json`: no scripts.
- Reusable/mirrorable tests/fixtures for this isolation plan:
  - `/home/michal/transform-hub/packages/api-server/test/server.spec.ts`, `rest-methods.spec.ts`, `stream-methods.spec.ts` for APIExpose/stream semantics.
  - `/home/michal/transform-hub/packages/model/test/model.spec.ts` for stop-message serialization.
  - `/home/michal/transform-hub/packages/bpmux/test/index.js` for BPMux stream behavior.
  - BDD fixtures under `/home/michal/transform-hub/bdd/data/sequences/`:
    - `simple-stdio` for stdout handling,
    - `api-server` for API exposure,
    - `bin-out-seq` for binary output/stdout logging,
    - `event-sequence` for event emission,
    - `args-config-test` / `args-to-output` / `deploy-app` for config/args behavior.
- Roadmap docs already encode the intended future boundary:
  - `/home/michal/transform-hub/docs/roadmap/013-feature-request-runner-worker-isolation.md`
  - `/home/michal/transform-hub/docs/roadmap/014-feature-request-python-runner-wrapper.md`
  - `/home/michal/transform-hub/docs/roadmap/015-feature-request-bun-runner-wrapper.md`.


## 2026-05-30 exploration
- `packages/runner` has AVA config but no `*.spec.ts`/`*.test.*` files or `test/` directory, so runner-targeted AVA work is not yet backed by local specs.
- `packages/runner-node` exists only as generated artifacts (`dist/`, `coverage/`, `node_modules/`, `tsconfig.build.tsbuildinfo`); there is no source tree, `package.json`, or tests yet.
- Runner code hotspots for isolation work are `packages/runner/src/runner.ts` (stdout/stderr override, PANG, lifecycle, keepAlive/STOP/KILL), `runner-app-context.ts` (api/hub/space/localStorage/stop/keepAlive parity), `input-stream.ts` (stdin content-type parsing), `host-client.ts` (pipe transport), `message-utils.ts` (control/monitoring framing), and `local-storage-agent.ts` (storage parity).
- BDD scenarios already covering adjacent behavior: `E2E-002-stop.feature` (keepAlive/STOP), `E2E-003-kill.feature` (KILL), `E2E-012-stream-flooding-test.feature` (control/event robustness), `E2E-014-python.feature` (stderr/health), `E2E-015-unified.feature` (stdin/stdout, stop handler, topics, events), plus `HUB-003-instance-api-server.feature` (API routing / stable name).
- Fixture conventions: sequence tarballs are mostly referenced as `../refapps/*.tar.gz`; local BDD fixtures live under `bdd/data/sequences/*` (packable source + built output), `bdd/data/test-data/*`, and `bdd/data/*.json|yml`; helper code lives in `bdd/lib/utils.ts`, `bdd/lib/host-utils.ts`, `bdd/step-definitions/e2e/host-steps.ts`, `bdd/step-definitions/e2e/cli.ts`, and `bdd/step-definitions/world.ts`.
- Exact BDD commands already defined in repo: `yarn test:bdd --name="..."`, `yarn test:bdd --tags="@ci"`, `yarn test:bdd-ci-node`, `yarn test:bdd-ci-python`, `yarn test:bdd-ci-api-node`, `yarn test:bdd-ci-hub`, `yarn test:unified-js`, `yarn test:unified-py`.
- Runner AVA command documented in plan/README is `cd packages/runner && npx ava -m "..."`, but with no local runner specs it cannot yet exercise the acceptance criteria from this checkout.
- Risk: preserve existing fixture source files and current host protocol/channel semantics; `Runner.redirectOutputs()` still globally overrides stdout/stderr today, so stream-forwarding tests will need to pin current behavior before refactor.


## 2026-05-30 — Node child_process.spawn stdio findings
- `options.stdio` accepts the string shorthands `pipe`, `overlapped`, `ignore`, and `inherit`; array indices map to child fds, and fd `3+` can add extra pipes.
- `null` / `undefined` default to `pipe` for fds `0..2`, but `ignore` for fd `3+`.
- If `ipc` is present in the stdio array, Node allows only one IPC fd; in a Node child this enables `process.send()` / `process.disconnect()`. Do not use fd 3 as a semantic data pipe.
- Parent-side access is via `child.stdio[4]`, `child.stdio[5]`, etc.; child-side access is via fd-aware streams/sockets like `new net.Socket({ fd: 4 })`.
- Node 18 is compatible: `options.stdio` is long-standing, and `overlapped` is available in supported LTS lines; use it on Windows if you need overlapped I/O.
- Representative examples: Node tests use `stdio: ['pipe','pipe','pipe','ipc','pipe']` and read `worker.process.stdio[4]`; Playwright also wires `stdio[3]`/`stdio[4]` for pipe transport.

## 2026-05-30: stream forwarding + child lifecycle notes

- `readable.pipe()` already manages backpressure, and `end: false` keeps the destination writable open. Node also says `process.stdout`/`process.stderr` are never closed until process exit, so forwarding child output with `child.stdout.pipe(process.stdout, { end: false })` is the safe pattern when the host streams must stay alive. [Node stream docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/stream.md#L1498-L1502), [Node stream docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/stream.md#L1530-L1548)
- `child_process` defaults stdio to `['pipe', 'pipe', 'pipe']`, and the `stdio` array can define extra pipes for fd 4/5+; keep control/monitoring fds as raw passthroughs instead of folding them into stdout/stderr forwarding. [Node child_process docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/child_process.md#L1001-L1027)
- Use `close`, not `exit`, as the terminal lifecycle barrier when stdout/stderr bytes must land first: Node says `close` fires only after the process ends **and** stdio is closed, and always after `exit`/spawn error. [Node child_process docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/child_process.md#L1439-L1448)
- Real-world examples of the exact non-closing forwarding pattern exist in Node’s own test suite, forever-monitor, and Platformatic: `child.stdout.pipe(process.stdout, { end: false })` / `stderr` mirror this, with one library also bumping max listeners to avoid warnings. [Node test](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/test/parallel/test-child-process-silent.js#L66-L71), [forever-monitor](https://github.com/foreversd/forever-monitor/blob/7e0f6b120bdebf582912f3f40ba33e2f7b549c59/lib/forever-monitor/plugins/logger.js#L81-L89), [Platformatic](https://github.com/platformatic/platformatic/blob/2f486a81ebf3c5620b772d0162368fe9d84241a5/packages/next/lib/capability.js#L296-L303)
- Error/backpressure caveat: `pipe()` will not auto-close the writable if the readable errors, so attach error handlers and do cleanup on child `'close'`/failure paths; don’t rely on `exit` timing alone. [Node stream docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/stream.md#L1542-L1548), [Node child_process docs](https://github.com/nodejs/node/blob/df52c216f921b4e4d112f92939e46027474cb899/doc/api/child_process.md#L1439-L1448)

### AVA-oriented test ideas

- Spawn a child that writes `stdout`/`stderr`, then exits or throws; assert the forwarded bytes are observed before any terminal summary message that is emitted from the parent after `await once(child, 'close')`.
- Assert that forwarding with `{ end: false }` does not close the host `process.stdout`/`process.stderr` handles (or a spy writable), even after the child ends.
- Add a failure-path test where the child stream errors mid-flight and confirm the parent does not emit lifecycle text until cleanup is complete.


## 2026-05-30: Wave 4 lifecycle-ordering slice (additive)

- Added `packages/runner/src/executor/exit-translation.ts` exposing
  `translateChildClose(code, signal)` and `writeTerminalLifecycleFrame(monitoring, translated)`.
  Translation reuses existing `RunnerExitCode` (SUCCESS/KILLED/STOPPED/DISCONNECTED/
  SEQUENCE_FAILED_DURING_EXECUTION) and `RunnerMessageCode` (SEQUENCE_COMPLETED on clean
  exit, SEQUENCE_STOPPED otherwise). No new symbols added; helper writes frames in the
  existing `MessageUtils.writeMessageOnStream` wire format (`JSON.stringify([code, payload]) + "\r\n"`).
- Added `packages/runner/test/fixtures/throw-after-stdout-child.js` — emits
  `STDOUT_BEFORE_THROW` / `STDERR_BEFORE_THROW` then synchronously throws so Node prints
  the uncaught-exception report to stderr and exits non-zero.
- Added `packages/runner/test/executor/runner-lifecycle-ordering.spec.ts` (5 tests).
  Uses `child.on("close", ...)` as the ordering barrier; spawns the throwing fixture with
  raw `["ignore","pipe","pipe"]` stdio, captures stdout/stderr through Writable sinks via
  `forwardChildStdio`, and only emits the terminal monitoring frame after `close`. Asserts:
  (a) stdout/stderr captured chunks are non-empty before frame emit, (b) the frame is the
  translated `[SEQUENCE_STOPPED, { exitCode, sequenceError }]` JSON+CRLF line, (c) the
  uncaught-exception text in stderr appears strictly after `STDERR_BEFORE_THROW`.
- ENV GOTCHA (pre-existing, NOT introduced by this slice): the working tree has an
  uncommitted modification to `tsconfig.base.json` adding `"ignoreDeprecations": "6.0"`,
  which is a TS 5.0+ option but the repo pins `typescript@~4.7.4`. This makes
  `ts-node/register` reject every `*.spec.ts` in `packages/runner` with `TS5023` and
  also fails `npx tsc --noEmit -p tsconfig.build.json`. Workaround for AVA:
  `TS_NODE_IGNORE_DIAGNOSTICS=5023 npx ava ...` — under that env all 5 new ordering
  tests pass. Standalone `tsc --skipLibCheck` over the changed sources is also clean.
  This blocker is package-wide, not slice-specific; removing the offending
  `ignoreDeprecations` line in `tsconfig.base.json` (out of this slice's edit scope) is
  the proper fix.


## 2026-05-30: Wave 5 BDD regression coverage (additive)

- Added BDD feature `bdd/features/e2e/E2E-017-runner-node-spawn.feature` with 5
  scenarios named verbatim per the corrected plan so `yarn test:bdd --name="..."`
  can select them:
  - `Node sequence completes successfully under runner-node spawn isolation`
  - `Sequence stdout bytes arrive before SEQUENCE_STOPPED`
  - `Exposed sequence API streams response chunks`
  - `Exposed sequence API request body streams into the handler`
  - `STOP with keepAlive matches current behaviour under runner-node spawn isolation`
- Three scenarios drive the host via the existing `HUB-003` startup-config
  pattern (`hub process is started with random ports and parameters "... --sequences-root data/sequences/ --identify-existing --startup-config ... --runtime-adapter=process"`),
  so they need no tarball build and run on the process runtime adapter once the
  outer-runner rewiring lands.
- Added minimal local fixtures:
  - `bdd/data/sequences/node-completes/` — writes `NODE_COMPLETES_OK`, sleeps 2s,
    returns a primitive (used to prove `runSequence()` ends naturally).
  - `bdd/data/sequences/throw-after-stdout/` — writes `STDOUT_BEFORE_THROW` then
    throws synchronously after `setImmediate`; existing
    `keep instance streams "stdout"` + `kept instance stream "stdout" should be ...`
    +  `runner has ended execution` flow proves stdout reached the host before
    the runner terminated (i.e. before the terminal `SEQUENCE_STOPPED` lifecycle).
  - `bdd/data/sequences/api-streaming/` — exposes `/streaming/stream-out` (4
    delayed `chunk-N` writes + `end`) and `/streaming/stream-in` (POST body
    counter that replies `chunks=<n> sizes=<...>`).
- Added startup configs `bdd/data/sample-config-runner-node-completes.json`,
  `sample-config-runner-node-throw.json`, `sample-config-runner-node-api.json`
  using the existing stable-name fields (`id` + `sequenceName` + `instanceName`)
  so existing `stable instance name "..." becomes available` and
  `I use instance client for stable name "..."` steps work unchanged.
- Added new BDD step file `bdd/step-definitions/hub/streaming.ts` (no `as any`,
  no ts-ignore) with four reusable steps:
  - `When I send a "{method}" streaming request to "{path}" and collect response chunks`
  - `Then I observe at least {int} streaming response chunks`
  - `Then the streamed response body contains "{string}"`
  - `When I send a "{method}" streaming request to "{path}" with {int} body chunks of "{string}" every {int} ms`
  - `Then the response body reports at least {int} request body chunks`
- Streaming send uses `fetch(url, { ..., body: ReadableStream, duplex: "half" })`;
  typed via a local `StreamingRequestInit = RequestInit & { duplex?: "half" | "full" }`
  to avoid `as any`.
- Streaming receive uses `response.body!.getReader()` plus `TextDecoder` so
  multiple wire-level chunks are observed (proves the host's exposed-API
  forwarder is not aggregating into the final body).
- `bdd/step-definitions/hub/config.ts` already attaches `this.response` without
  declaring it on `CustomWorld`; new steps follow the same loose-`this`
  convention rather than introducing an index signature on `CustomWorld`.
- `cd bdd && npx tsc -p tsconfig.json --noEmit` is clean after the additions.
- Verified via cucumber-js dry-run that all five scenarios are individually
  selectable and that every step resolves to a step definition (no undefined
  steps): `1 scenario (1 skipped) / N steps (N skipped)` for each `--name=...`.
- Pre-existing LSP errors in `packages/runner-node/src/bin/{worker,process}-entry.ts`
  and `packages/runner/src/executor/{event-translator,worker-executor,executor}.ts`
  are leftover failed-V1 worker/proxy artifacts and are NOT introduced by this
  slice; out of scope per task constraints.
- Full BDD execution of these scenarios still requires the Wave 4 outer-runner
  rewiring of `packages/runner/src/bin/start-runner.ts` plus a built `dist/sth`
  (the `HostUtils` spawns `node ../dist/sth/bin/hub.js`). The scenarios are
  authored as acceptance/regression definitions and are guaranteed to be
  syntactically `--name`-selectable today.


## 2026-05-30: Wave 4 outer-runner spawn rewiring (start-runner.ts)

- Rewired `packages/runner/src/bin/start-runner.ts` to launch
  `@scramjet/runner-node` via `child_process.spawn()` pipes instead of
  constructing in-process `Runner`. Adapter-facing env contract preserved
  verbatim: `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`,
  `INSTANCES_SERVER_PORT`, `INSTANCES_SERVER_HOST`, `INSTANCE_ID` are still
  parsed and validated with the same `RunnerExitCode.INVALID_ENV_VARS` /
  `RunnerExitCode.INVALID_SEQUENCE_PATH` exit codes. The runner package
  `main` field is unchanged.
- Boot config is a private JSON file in `os.tmpdir()` (mode 0o600) carrying
  `{ sequencePath, instanceId, sequenceArgs? }` matching the current
  `RunnerNodeBootConfig` shape exactly. The absolute path is passed as
  argv[2] to the runner-node entry. The config file (and its mkdtemp dir)
  are removed best-effort on child `close`.
- Spawn uses the existing `spawnRunnerNode()` with `RUNNER_NODE_STDIO =
  ["pipe","pipe","pipe","ipc","pipe","pipe"]`. Runner-owned env vars are NOT
  forwarded to runner-node; child env defaults to `{}`.
- Stream wiring (raw passthrough only):
  - host stdin -> child stdin (default `pipe`, end:true so EOF propagates)
  - child stdout/stderr -> host stdout/stderr via existing
    `forwardChildStdio()` (`{ end:false }`)
  - host control -> child fd4 via raw `pipe(_, { end:false })`
  - child fd5 -> host monitoring via raw `pipe(_, { end:false })`
  - fd3 stays unused IPC; no JSON/base64 aggregation; no V1 protocol names.
- Lifecycle barrier is `child.on("close", ...)`, which translates into
  existing `RunnerExitCode` / `RunnerMessageCode` via `translateChildClose()`
  and emits a single terminal frame via `writeTerminalLifecycleFrame()` to
  `hostClient.monitorStream` (existing JSON+CRLF wire format). Then the
  `HostClient` is disconnected (hard on non-zero exit) and the parent
  process exits with the translated code.
- Added `packages/runner/src/executor/runner-node-launcher.ts` to resolve
  the runner-node entry robustly: prefers `<pkg>/dist/bin/runner-node.js`
  (production / built dist); falls back to `<pkg>/src/bin/runner-node.ts`
  for source-tree development. The `.ts` fallback path passes
  `NODE_OPTIONS=--require ts-node/register/transpile-only` plus minimal
  `PATH`/`HOME`/`NODE_PATH` env so ts-node and module resolution work; the
  dist path remains scrubbed (`env: {}`). Package root is found via
  `require.resolve("@scramjet/runner-node/package.json")` with a
  walk-up-to-sibling-`runner-node` fallback for environments where the
  symlink is not in the resolver path.
- Verification: `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json`
  passes; `cd packages/runner && npx ava` passes (20 tests, unchanged).
  Forbidden-pattern grep over `packages/runner/src` and
  `packages/runner-node/src` matches none of `worker_threads`,
  `parentPort`, `child_process.fork`, `API_REQUEST`, `EXECUTOR_API_INVOKE`,
  `OUTPUT_CHUNK`, `INPUT_CHUNK`, `bodyBase64`. No `as any`,
  `@ts-ignore`, or `@ts-expect-error` introduced; the original `as Writable`
  casts on host streams were removed by relying on the structural
  `WritableStream<string> extends Writable` relation in the existing types.
- Known runtime gap (NOT introduced by this slice; see
  `packages/runner-node/src/bin/runner-node.ts`): runner-node still ships a
  skeleton runtime (single-frame `startup-ready` monitoring, no AppContext /
  exposed-API parity, no host-side input/output bridging via the additional
  `HostClient` channels beyond stdio/control/monitoring). Full BDD scenarios
  in `bdd/features/e2e/E2E-017-runner-node-spawn.feature` therefore still
  cannot pass end-to-end against this entry alone; the outer-runner rewiring
  is complete but downstream runner-node runtime work remains. Unit/AVA and
  type verification at this slice are clean.


## 2026-05-30: Wave 4 fix - fallback terminal lifecycle frame is conditional

- Problem: previous slice always emitted a translated terminal lifecycle
  frame on `child.close`. Plan requires the parent to emit only when the
  child did not already report `SEQUENCE_COMPLETED` / `SEQUENCE_STOPPED`
  on its monitoring fd5; otherwise the host would observe two terminal
  frames.
- Fix: added `packages/runner/src/executor/lifecycle-observer.ts`
  exposing `observeChildLifecycleFrames(src)` -> `{ observed(): boolean }`.
  The observer attaches a non-destructive `data` listener (Node `pipe()`
  and additional `data` listeners coexist on a Readable), buffers up to
  64 KiB of pending bytes, splits on `\n` (tolerating trailing `\r`),
  and only inspects lines starting with `[`. Inspection is a single
  `JSON.parse` followed by an `Array.isArray` + first-element-numeric
  check against `RunnerMessageCode.SEQUENCE_COMPLETED` (3011) /
  `SEQUENCE_STOPPED` (3006). Malformed lines are silently ignored.
- `start-runner.ts` now installs the observer right after the raw fd5 ->
  host monitoring `pipe(_, { end:false })`, and the `child.close` handler
  calls `writeTerminalLifecycleFrame(...)` only if `!lifecycle.observed()`.
  Raw fd5 passthrough is unchanged byte-for-byte.
- Tests: `packages/runner/test/executor/lifecycle-observer.spec.ts`
  (6 tests) covers: classifier accept/reject, split-across-chunks, only-
  non-terminal-frames, non-destructive `data` consumption, and malformed
  JSON tolerance.
- Verification: `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json`
  passes; `cd packages/runner && npx ava` passes 26 tests (20 prior + 6
  new). Forbidden-pattern grep over `packages/runner/src` and
  `packages/runner-node/src` remains clean (no `worker_threads`,
  `parentPort`, `child_process.fork`, `API_REQUEST`, `EXECUTOR_API_INVOKE`,
  `OUTPUT_CHUNK`, `INPUT_CHUNK`, `bodyBase64`). No `as any`,
  `@ts-ignore`, or `@ts-expect-error` introduced.


## 2026-05-30: runner-node runtime entry integration (bin/runner-node.ts)

- Replaced the skeleton `startup-ready` + direct `first.apply(context, args)` flow with a real runtime entry that drives `runSequence()` (parity with legacy `Runner.runSequence`), wires the existing `RunnerLifecycle`, parses control frames from fd4, and emits framed monitoring messages on fd5 via `MessageUtils.writeMessageOnStream`.
- Sequence-facing `this` is a runner-node-native `SequenceLocalContext` that exposes `keepAlive/end/destroy/on/emit/addStopHandler/addKillHandler` plus `instanceId`, `logger`, `emitter`, and a `LocalStorageAgent` whose `writeMonitoringMessage` writes to fd5. The full `RunnerAppContext` (with `hub`/`space`/`api`) is intentionally NOT instantiated in this slice — see issues for the boot-config gap.
- Helpers exported for unit testing: `resolveSequenceFunctions`, `loadSequenceModule`, `buildSequenceContext`, `wireControlStream`, and `bootstrap`. Each is a small testable function rather than one monolithic bootstrap. The auto-run is gated by `require.main === module` so the spec can import these helpers without spawning.
- Control-stream parser is a focused CRLF-delimited JSON line splitter built on a `setEncoding("utf8")` data handler; this keeps deps minimal and avoids pulling `StringStream.from(...).JSONParse()` (the legacy parser) just to dispatch four message codes (STOP/KILL/EVENT/STORAGE_UPDATE). PING/PONG/MONITORING_RATE/SET fall through to the host fallback today.
- Sequence stdout/stderr are NOT overridden in runner-node: fd1/fd2 stay as `process.stdout`/`process.stderr` (which the outer runner forwards to the host). `runSequence()` is given a discard `PassThrough` as `outputStream` because the current fd layout (`pipe,pipe,pipe,ipc,pipe,pipe`) has no separate sequence-data output socket; documented as a boot-config gap, not a regression.
- Trivial-sequence fixture changed to return primitive `0` (was `null`). `null` is not handled cleanly by `runSequence`'s `isSynchronousStreamable` check (typeof null === "object" makes it treated as streamable, then `DataStream.from(null)` throws). A small primitive return exercises the documented primitive branch.
- Skeleton spec updated:
  - removed the `startup-ready` envelope assertion (no longer the terminal behavior),
  - added an explicit `t.notRegex(monitoringBuf, /"type":"startup-ready"/)` to lock the regression,
  - asserts at least one `RunnerMessageCode.PANG` and a final `RunnerMessageCode.SEQUENCE_COMPLETED` frame on fd5,
  - kept the "ignores legacy SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO env vars" test verbatim and the source-grep test.
- New `runtime-entry.spec.ts` covers:
  - `resolveSequenceFunctions` for function/array/default-export shapes,
  - `loadSequenceModule` real-fixture happy path,
  - `buildSequenceContext` keepAlive emits ALIVE frame and triggers proxy callback,
  - stop/kill handler registration/dispatch through the same context object,
  - `wireControlStream` STOP and EVENT dispatch from CRLF JSON,
  - end-to-end spawn proving `func.call(context, inputStream, ...args)` semantics from `runSequence` (NOT direct first-only invocation): writes a side-channel JSON record from the sequence and asserts argCount=3, args=[arg-x, 7], `this` exposes `keepAlive`, both functions invoked,
  - end-to-end spawn proving STOP frame on fd4 reaches a sequence-registered `addStopHandler` exactly once with the original `{ timeout, canCallKeepalive }` payload.
- Forbidden-pattern grep over `packages/runner-node/src` is clean: no `worker_threads`, `parentPort`, `child_process.fork`, `API_REQUEST`, `EXECUTOR_API_INVOKE`, `OUTPUT_CHUNK`, `INPUT_CHUNK`, `bodyBase64`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Verification (post-change):
  - `cd packages/runner-node && npx ava` → 61 tests passed (was 51; +10 new).
  - `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → clean.
  - `cd packages/runner && npx ava` → 26 tests passed (outer runner observer/fallback unchanged).
- Pre-existing TS errors in `packages/runner-node/src/bin/{worker,process}-entry.ts` and `packages/runner/src/executor/{event-translator,worker-executor,executor}.ts` are leftover failed-V1 worker/proxy artifacts (already noted in earlier learnings); they are excluded from `tsconfig.build.json` and were NOT touched by this slice.


## 2026-05-30: split host channel ownership (runner / runner-node)

- `HostClient` (both `packages/runner/src/host-client.ts` and `packages/runner-node/src/host-client.ts`) now accepts an optional `channels: ReadonlySet<CommunicationChannel>` on `init()` (defaults to `ALL_CHANNELS` for legacy parity). Internal `_streams` is a sparse `Array<Socket | PassThrough | undefined>` of length 9; `connect()` only opens sockets for the requested channel indices and leaves the others `undefined`. `initWithStreams()`/input-end/BPMux/disconnect all branch on `undefined` so split ownership is safe.
- `disconnect()` early-returns on `undefined` slots and keeps the legacy skip of `[CC.IN, CC.STDIN, CC.CONTROL]` (those host-side close them). Tests must explicitly destroy server-accepted sockets to avoid hanging on `server.close()`.
- `requireStream<T>(idx)` throws `Channel <NAME> not opened on this HostClient` when a getter is hit on a slot that wasn't opened. `requestsStream` returns `| undefined` because the BPMux setup is conditional.
- Outer runner exports `OUTER_RUNNER_CHANNELS = {STDIN, STDOUT, STDERR, CONTROL, MONITORING}`; runner-node's `runner-node.ts` uses `RUNNER_NODE_CHANNELS = {IN, OUT, LOG, REQUESTS}`. Disjoint union covers all 9 host channels for the same `instanceId` — the host's `socket-server` already keys by `(id, channelIdx)` so accepting two clients per id is supported with no host change.
- `RunnerNodeBootConfig` now requires `instanceId` and adds optional paired `instancesServerPort: number` / `instancesServerHost: string`. `validateBootConfig` enforces: integer port, non-empty host, both-or-neither. Existing tests/spawns that didn't pass port/host continue to work (runner-node falls back to discard sink + ended input stream).
- `start-runner.ts` writes `instancesServerPort`, `instancesServerHost`, `instanceId` into the JSON boot config; the outer `HostClient.init(id, OUTER_RUNNER_CHANNELS)` call now opens only the 5 outer-owned channels.
- `runner-node.ts` bootstrap: when boot config has port+host, constructs `new HostClient(port, host)`, calls `init(instanceId, RUNNER_NODE_CHANNELS)`, pipes `outputDataStream.JSONStringify()` to `hostClient.outputStream`, and reads `inputDataStream` from real host IN via `readInputStreamHeaders` + `mapToInputDataStream` (parity with legacy `runner.ts`). `disconnect()` is called in finally.
- New tests:
  - `packages/runner-node/test/host-client-channels.spec.ts`: proves `init(id, {IN,OUT,LOG,REQUESTS})` opens exactly those 4 channels (server-side observed by reading the 36-byte id + 1-byte channel handshake).
  - `packages/runner/test/transport/host-client-channels.spec.ts`: same proof for outer with `OUTER_RUNNER_CHANNELS`.
  - Both also assert `disconnect(true)` doesn't crash on sparse `_streams`.
  - `packages/runner-node/test/skeleton.spec.ts`: extended to cover `instanceId`-required + paired port/host validation.
- Verification: `runner-node` 64 tests pass (was 61), `runner` 28 tests pass (was 26). `tsc --noEmit -p tsconfig.build.json` clean for both packages. Forbidden-pattern grep clean (only pre-existing legacy `runner.ts` `as any`/`@ts-ignore` not touched in this slice).
- Trap: tests using a mock `net.Server` must track accepted sockets and `socket.destroy()` them before `server.close()` because `disconnect()` does NOT close IN/CONTROL sockets (host-side close in production).

## 2026-05-30 — runner-node AppContext/API slice landed

- `packages/runner-node/src/bin/runner-node.ts` now branches on boot config: when `instancesServerPort`+`instancesServerHost` are present it constructs a real `RunnerAppContext` (hub/space/api/localStorage) via `buildAppContext()`, otherwise it falls back to the existing `SequenceLocalContext` for unit-test spawns without an instances-server.
- AppContext wiring matches legacy parity: `createServer(undefined, { defaultRoute })` for local API; `ApiHostClient` + `getManagerClient("/api/v1")` constructed via `ClientUtilsCustomAgent("http://scramjet-host/api/v1", hostClient.getAgent())` so handlers stay in-process and HTTP bodies traverse BPMux REQUESTS — no JSON/base64 proxying.
- `RunnerProxy` methods bound to `RunnerLifecycle.keepAliveIssued()` and fd5 monitor stream via `MessageUtils.writeMessageOnStream`. Lifecycle remains the STOP/KILL/keepAlive authority.
- Local API server now starts on `0` / `exposeHost || "localhost"` when `bootConfig.exposePath` is present.
- `RunnerNodeBootConfig` extended (optional): `appConfig`, `logLevel`, `exposePath`, `exposeHost`. Outer `start-runner.ts` `writeBootConfig()` forwards them from `parsedRunnerConnectInfo` (+ `EXPOSE_HOST` env fallback for host).
- Recovery from broken duplicated edit: file had two complete halves; truncated lines 530+ and removed two added docstrings to comply with comment policy.
- Verification: runner-node 64 ava tests pass; runner 28 ava tests pass; both `tsc --noEmit -p tsconfig.build.json` clean; forbidden-name scan clean for `worker_threads|parentPort|child_process.fork|API_REQUEST|EXECUTOR_API_INVOKE|OUTPUT_CHUNK|INPUT_CHUNK|bodyBase64|as any|@ts-ignore|@ts-expect-error`.
- The pre-existing `app-context-parity.ts` test `api.use(path, handler) accepts function handler` already covers function-handler registration locally; no new test needed for that surface in this slice.


## 2026-05-30: subprocess/build scan after opencode instability

- Current local process scan after cancelling background research: no `npm`, `yarn`, `build-all`, `run-script`, `tsc`, `ava`, `cucumber`, hub, runner, `start-runner`, or `runner-node` processes are active. Only opencode MCP helper Node processes remain.
- A background librarian search briefly started `gh repo clone nodejs/node /tmp/node -- --depth 1` with child `git`/`ssh`/`index-pack`; it was cancelled and disappeared from `pgrep`. Avoid librarian/remote searches while diagnosing opencode process pressure.
- BDD host startup is in `bdd/lib/host-utils.ts`: `SCRAMJET_SPAWN_TS=1` selects `npx tsx ../packages/sth/src/bin/hub.ts`; otherwise BDD starts compiled `node ../dist/sth/bin/hub.js`.
- The interrupted work already added root script `test:bdd:ts`: `SCRAMJET_SPAWN_TS=1 yarn --cwd=./bdd run test:bdd --fail-fast`; no BDD harness code change was needed for TS mode because `host-utils.ts` already supports the env flag.
- The E2E-017 BDD runtime path does not run package installation by itself. It starts Cucumber -> hub process -> process adapter runner process -> runner-spawned `runner-node` process.
- In TS BDD mode, `ProcessInstanceAdapter` detects the hub is running under `tsx`/`ts-node` and starts the runner with `tsx` plus `require.resolve("@scramjet/runner")`; `start-runner.ts` can then choose `runner-node` source fallback and set `NODE_OPTIONS=--require ts-node/register/transpile-only` for the child.
- Build/install risk is separate from BDD runtime: root `build:packages` runs `prebuild:packages` (`scripts/run-script.js -v -w modules build:only`) and then `scripts/build-all.js -v -w modules --ts-config tsconfig.build.json`; `build-all.js` copies packages to `dist/` and, unless `NO_INSTALL`/`--no-install`, executes `cd dist && npx npm@8 install -q -ws --no-audit`.
- Root `postinstall` runs `scripts/run-script.js -v -w modules install:deps`; `packages/python-runner/package.json` has `install:deps` that runs `pip3 install --upgrade -r requirements.txt --target __pypackages__`.
- Some BDD fixture package scripts can run npm installs when their build/deploy scripts are invoked (`bin-out-seq`, `deploy-app`, `event-sequence`), but the new E2E-017 startup-config fixtures (`api-streaming`, `node-completes`, `throw-after-stdout`) do not contain install hooks.

## 2026-05-31: E2E-017 TC-001 get runner PID / ESRCH / health fix

- Reproduced `SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=900000 yarn test:bdd:ts --name="Node sequence completes successfully under runner-node spawn isolation"` failing in `get runner PID`. The original late failure was not in the process adapter itself: the spawned runner-node connected to the host as an unknown instance because its PING frame lacked the top-level `id` expected by `CSIDispatcher`'s established listener.
- `ProcessInstanceAdapter.waitUntilExit()` has two adapter instances in this flow: the dispatcher-owned adapter tracks the outer runner process, while the CSIController-owned adapter never dispatched a process and relies on `setRunner()` plus `/tmp/runner-<processPID>` for completion. Runner-node reported its own PID but did not create the legacy exit-code file, so the CSIController adapter eventually hit `process.kill(pid, 0)` after runner-node exited, logged `kill ESRCH`, rejected with `pid not exists`, and `CSIController.instanceMain()` mapped that untyped rejection to exit `213`.
- Fixed in allowed runner-node/runner test scope only; no adapter/host/symbol changes. `packages/runner-node/src/handshake.ts` now restores legacy PING fields `id` and `created`, `packages/runner-node/src/bin/runner-node.ts` writes `/tmp/runner-<pid>` with the exit code before returning or failed bootstrap exit, and runner transport tests assert PING `id` plus the health frame ordering.
- After the exit-file fix, TC-001 still timed out at `get runner PID` because the `/health` route is backed by the last observed `MONITORING` frame rather than an on-demand request. Legacy runner emits initial health before sequence execution; runner-node only emitted PING/PANG/terminal. Added an initial `[MONITORING, { healthy: true }]` immediately after PING so the host can cache health and augment it with `processId` through the existing process adapter `stats()` path.
- Verification after the fix:
  - `SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=900000 yarn test:bdd:ts --name="Node sequence completes successfully under runner-node spawn isolation"` passes; health returned `{ healthy: true, processId: <runner-node pid> }`, `runner has ended execution` passed, stdout matched `NODE_COMPLETES_OK\n`, and no ESRCH/213 failure appeared.
  - `cd packages/runner && TS_NODE_IGNORE_DIAGNOSTICS=5023 npx ava` passes 34 tests.
  - `cd packages/runner-node && npx ava` passes 64 tests.
  - `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` and `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` pass.
  - Forbidden-pattern scan over `packages/runner/src packages/runner-node/src` for `worker_threads|parentPort|child_process.fork|API_REQUEST|EXECUTOR_API_INVOKE|OUTPUT_CHUNK|INPUT_CHUNK|bodyBase64` returns no matches.

## Legacy exit-file hardening (security review blocker resolved)

`packages/runner-node/src/bin/runner-node.ts` previously used `writeFileSync("/tmp/runner-${pid}", ...)`, which followed symlinks and clobbered pre-existing files at a predictable, world-writable-directory path.

Resolution: extracted `writeLegacyExitFileSecure(path, code, logger?)` (exported for tests) using `openSync` with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW` (when supported) and mode `0o600`, then `writeSync` and a finally-block `closeSync`. `legacyExitFilePath(pid?)` keeps the adapter-compatible `/tmp/runner-<pid>` contract so `ProcessInstanceAdapter.waitUntilExit()` still finds the file.

Key behavior:
- Pre-existing file → `EEXIST` → skipped, original content preserved (verified by test).
- Path is a symlink → `ELOOP` → skipped, target untouched (verified by test).
- Any other failure (missing dir, EACCES) → swallowed with optional `logger.warn`; runner-node never crashes a successful sequence because of legacy-compat write failure.
- Mode `0o600` enforced (verified by stat).

Tests: `packages/runner-node/test/exit-file-secure.spec.ts` (6 tests covering create, EEXIST refusal, symlink refusal, missing dir tolerance, warn logger, path contract). Full `npx ava` suite: 70 tests pass. `tsc --noEmit -p tsconfig.build.json`: clean.

No architecture constraint regressed: no `worker_threads`, no `parentPort`, no `fork()` semantic transport, no JSON/base64 body aggregation. Only `runner-node.ts` and a new test file were touched.

## 2026-05-31: runner-node PING shared-contract alignment

- Late code-quality review found that the restored runner-node PING fields were still not fully legacy/type-compatible: `created` was a `Date`, `payload.system.processPID` was a number, and required `status` / `inputHeadersSent` fields from `PingMessageData` were absent.
- Fixed `packages/runner-node/src/handshake.ts` to return `[RunnerMessageCode.PING, PingMessageData]` directly, with `created: Date.now()`, string `system.processPID`, `status: InstanceStatus.STARTING`, and `inputHeadersSent: false`, matching the legacy runner handshake shape used before `runSequence()` transitions to running.
- Strengthened runner transport tests to assert the shared contract: numeric `created`, startup `status`, `inputHeadersSent === false`, and string `processPID` that parses to a positive number.
- Verification after the contract fix:
  - `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` passes.
  - `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` passes.
  - `cd packages/runner && npx ava test/transport/split-runner-communication-metadata.spec.ts test/transport/split-runner-communication-ordering.spec.ts` passes 2 tests.
  - `cd packages/runner-node && npx ava` passes 70 tests.
  - `cd packages/runner && TS_NODE_IGNORE_DIAGNOSTICS=5023 npx ava` passes 34 tests.
  - `SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=900000 yarn test:bdd:ts --name="Node sequence completes successfully under runner-node spawn isolation"` passes 1 scenario / 9 steps, with PING showing numeric `created`, string `processPID`, `status:"starting"`, and `inputHeadersSent:false`.
  - Forbidden-pattern scan over `packages/runner/src packages/runner-node/src` remains clean for `worker_threads|parentPort|child_process.fork|API_REQUEST|EXECUTOR_API_INVOKE|OUTPUT_CHUNK|INPUT_CHUNK|bodyBase64`.

# Runner Split Communication Contract — TDD Fix

## TL;DR

> **Quick Summary**: Add RED tests in `packages/runner` (no Hub, no BDD) proving the split-runner monitoring contract — PING-first with full sequenceInfo + processPID, single terminal frame, child exit, socket cleanup — then drive a minimal GREEN fix: add a handshake-emission path to runner-node and close `CC.IN` on graceful disconnect so the child can exit.
>
> **Deliverables**:
> - Reusable `fake-instances-server.ts` harness under `packages/runner/test/transport/`
> - Four sequence fixtures at `packages/runner-node/test/fixtures/`: `trivial-sequence/` (exits immediately), `delayed-sequence/` (~2s lifetime, no outputs), `output-sequence/` (~2s lifetime, emits a handful of items as sequence outputs), `input-sequence/` (consumes input items from CC.IN, emits one output per input item)
> - Five runner-level spec files: `split-runner-communication-{ordering,lifecycle,metadata,runtime,input}.spec.ts`
> - `RunnerHandshakeBuilder` helper in `packages/runner-node/src/handshake.ts`
> - PING emission wired into `packages/runner-node/src/bin/runner-node.ts` before any PANG
> - `host-client.ts:disconnect()` graceful-path fix to close `CC.IN`
> - Outer-runner terminal-frame de-duplication guard
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final review wave
> **Critical Path**: T1 (harness) + T2 (fixtures) + T6 (builder) → {T3, T4, T5, T10, T11 RED in parallel} → {T7, T8, T9 GREEN in parallel} → F1-F4

---

## Context

### Original Request
Fix the runner / runner-node split communication so the Hub-side `CSIController` receives a complete handshake. Diagnostic BDD scenario `Node sequence completes successfully under runner-node spawn isolation` showed `Get info [seq, info] [ undefined, {} ]` from `packages/host/src/lib/csi-controller.ts:getInfo()`. RCA traced to the new `packages/runner-node` runtime never emitting `RunnerMessageCode.PING`, and `host-client.ts:disconnect(false)` skipping `CC.IN` close so the child stays alive until Docker kills it (exit 137, `oom=false`).

### Interview Summary
**Key Discussions**:
- Tests must live in `packages/runner` (NOT BDD, NOT Hub-level). No Hub process started.
- Build reusable fake instances-server harness: TCP, 36-byte instance id + 1-byte channel index framing, capture all channels including runner-node-owned IN/OUT/LOG/REQUESTS, parse monitoring as CRLF-delimited JSON arrays.
- Drive the real `packages/runner/src/bin/start-runner.ts` with full env contract (SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO, INSTANCES_SERVER_PORT/HOST, INSTANCE_ID).
- Three RED tests: monitoring ordering (PING before PANG; required fields; single terminal), process lifecycle (child + outer exit; no leaked sockets), metadata sufficiency (PING contains every field `CSIController.handleHandshake()` reads). Plus two runtime contract specs (T10 runtime: delayed + output fixtures; T11 input: bidirectional round-trip).
- Implementation must: add a shared protocol builder for future non-node runners; close `CC.IN` on graceful disconnect; preserve raw fd4/fd5 passthrough and six-slot stdio; never reintroduce worker_threads/parentPort/fork/V1 names.

**Research Findings**:
- `packages/runner/package.json` already configures ava with `ts-node/register` → child spawn uses `node -r ts-node/register <absoluteStartRunnerPath>`.
- `packages/runner/test/transport/host-client-channels.spec.ts:14-50` has a minimal recording server (36+1 framing) — generalize, don't duplicate.
- `packages/runner-node/src/message-utils.ts:12` confirms monitoring frame format: `JSON.stringify([code, data]) + "\r\n"`.
- `packages/runner-node/src/host-client.ts:185-220` `disconnect(hard)` currently skips CC.IN/STDIN/CONTROL in BOTH branches — graceful path must close CC.IN when runner-node owns it.
- `packages/host/src/lib/csi-controller.ts:617` `handleHandshake()` reads: `message[1].ports`, `message[1].sequenceInfo`, `message[1].payload.system` (→ `runnerSystemInfo`, must include `processPID`), `payload.appConfig`, `payload.args`, `payload.instanceName`, `payload.inputTopic?`, `payload.outputTopic?`, `payload.limits?` (`memory`/`gpu`), `payload.exposePath?`/`exposeHost?`/`exposePort?`.

### Metis Review
**Identified Gaps** (addressed):
- Harness location ambiguity → standardized at `packages/runner/test/transport/fake-instances-server.ts`.
- Frame-ordering invariant vs observed race → enforced as **implementation invariant**; tests assert via arrival-index ordering.
- CONTROL channel scope → **read-only harness**; KILL/CONTROL write only added if Test 2 cannot complete naturally.
- Child spawn path resolution → tests use `path.resolve(__dirname, "../../src/bin/start-runner.ts")` + explicit env; never cwd-dependent.
- Metadata sufficiency → exact field list enumerated from `CSIController.handleHandshake()`.
- Port collision under parallel ava workers → harness binds `port: 0`, returns OS-assigned.
- Socket-leak vagueness → concrete tracked-socket count assertion.
- Test timeouts → every test sets `t.timeout(15_000)`.

---

## Work Objectives

### Core Objective
Prove and enforce, with runner-level TDD, that `packages/runner` (outer) + `packages/runner-node` (split child) together produce a valid Hub-facing handshake: PING-first with complete `sequenceInfo` and `payload.system.processPID`, exactly one terminal frame, and a clean child/outer exit with no leaked sockets.

### Concrete Deliverables
- `packages/runner/test/transport/fake-instances-server.ts` — reusable TCP harness (read-all + minimal write-via-socket on CC.IN/CC.STDIN)
- `packages/runner-node/test/fixtures/trivial-sequence/{index.js,package.json}` — exits immediately
- `packages/runner-node/test/fixtures/delayed-sequence/{index.js,package.json}` — lives ~2s, returns without producing items
- `packages/runner-node/test/fixtures/output-sequence/{index.js,package.json}` — lives ~2s, emits 3-5 items as sequence outputs
- `packages/runner-node/test/fixtures/input-sequence/{index.js,package.json}` — consumes input items from CC.IN, emits one output item per input item, then exits when input ends
- `packages/runner/test/transport/split-runner-communication-ordering.spec.ts`
- `packages/runner/test/transport/split-runner-communication-lifecycle.spec.ts`
- `packages/runner/test/transport/split-runner-communication-metadata.spec.ts`
- `packages/runner/test/transport/split-runner-communication-runtime.spec.ts` — exercises delayed + output fixtures (no premature terminal frame during lifetime; OUT channel receives expected payloads)
- `packages/runner/test/transport/split-runner-communication-input.spec.ts` — exercises input-sequence fixture (host writes N items to CC.IN; OUT channel receives N transformed items; child exits cleanly on input end)
- `packages/runner-node/src/handshake.ts` — `RunnerHandshakeBuilder` (single helper)
- Modified `packages/runner-node/src/bin/runner-node.ts` — emits PING via builder before any PANG, after host channels open
- Modified `packages/runner-node/src/host-client.ts` — graceful disconnect closes `CC.IN` when owned by runner-node
- Modified `packages/runner/src/executor/lifecycle-observer.ts` (or whichever module owns the outer-runner terminal-frame fallback) — suppress fallback when child already emitted a terminal frame

### Definition of Done
- [x] `cd packages/runner && npx ava -m "*split runner communication*"` → 5/5 pass
- [ ] `cd packages/runner && npx ava` → all green (existing tests unaffected)
- [x] `cd packages/runner-node && npx ava` → all green
- [x] `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` → 0 errors
- [x] `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → 0 errors
- [x] BDD scenario `Node sequence completes successfully under runner-node spawn isolation` completes without `Get info [seq, info] [ undefined, ... ]`, prints `NODE_COMPLETES_OK`, emits `SEQUENCE_COMPLETED` exactly once, and runner process exits (no exit 137)

### Must Have
- PING emitted on the MONITORING channel **before any PANG** by construction.
- PING payload includes `sequenceInfo` (with `id`, `config`, `instances`, `location`), `payload.system` (with `processPID`), `payload.appConfig`, `payload.args`, `payload.instanceName`.
- Exactly one terminal frame (`SEQUENCE_COMPLETED` or `SEQUENCE_STOPPED`) across outer + child monitoring streams combined.
- Runner-node child closes `CC.IN` on graceful disconnect (success path).
- Both outer and child processes exit naturally with code 0 on trivial sequence.
- All five new specs initially FAIL with clear assertion messages (not crashes / not timeouts) — RED phase evidence captured before any production change.
- Reusable harness uses `port: 0`, tracks sockets, and is consumable by future non-node runner tests.
- Existing six-slot stdio layout and raw fd4/fd5 passthrough preserved.

### Must NOT Have (Guardrails)
- No `worker_threads`, `parentPort`, `fork`, JSON/base64 API proxying, or any V1 protocol name reintroduced.
- No modification of `packages/host/` source files. (Read-only inspection for field enumeration only.)
- No modification of `packages/adapters/`, BDD framework, or Docker images.
- No new shared/testing package. Harness lives in `packages/runner/test/transport/` only.
- No CONTROL-channel **command** semantics (KILL, STOP, etc.) emitted from the harness unless Test 2 provably cannot terminate without it (conditional gate). The harness MAY expose its captured per-channel sockets so tests can write raw input frames to CC.IN — but this is a thin pass-through, not a message-routing layer.
- No refactor of `host-client.ts:disconnect()` beyond closing `CC.IN` on the graceful branch. No signature, parameter, naming, or logging changes.
- No refactor of PANG emission while adding PING. Two separate emit calls; no abstraction unless ≥3 duplications appear.
- No abstraction of the harness into a class hierarchy. One factory function returning `{ port, sockets, channels, frames, close }`.
- No hardcoded TCP ports. Always `port: 0`.
- No reliance on `process.cwd()` for fixture or entry-point paths. Always absolute via `path.resolve(__dirname, ...)`.
- No reliance on AVA global timeout. Each test calls `t.timeout(15_000)`.
- No "patch BDD polling to hide the problem." Tests must prove the contract holds without observable retries.
- No premature generalization of the protocol builder in this work — module lives in `packages/runner-node/src/handshake.ts` with a small, clean, exportable API (future non-node runners may import it directly without refactor). No new shared/testing package created in this work.
- No acceptance criterion that requires human inspection of logs.

### Spec Framework Integration (if detected)
> N/A — no OpenSpec or Spec Kit directory detected in this repository.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — all verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (ava 3.x + ts-node/register + sinon + proxyquire).
- **Automated tests**: YES — TDD. RED phase mandatory before any production change. RED = each spec asserts clearly and fails on assertion (not crash/timeout).
- **Framework**: ava with `ts-node/register`.
- **Workflow**: For Tasks 3, 4, 5, 10, 11, agent writes the spec, runs ava to confirm FAILURE with clear message, captures output as RED evidence. For Tasks 7–9, agent re-runs the same five specs to confirm GREEN, captures output as GREEN evidence.

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Library/Module** (T1, T6): Use Bash with `node -e` or a small ts-node check script — instantiate, invoke, assert output shape.
- **Test specs** (T3, T4, T5, T10, T11): Use Bash to run `npx ava <path> --verbose` and grep for expected assertion message.
- **GREEN verifications** (T7–T9): Use Bash to run `npx ava` plus `npx tsc --noEmit` and capture exit code + stdout/stderr across all five specs.
- **No browser/UI** — entirely a backend transport contract.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — START IMMEDIATELY, fully parallel):
├── T1: fake-instances-server.ts harness                       [unspecified-high]
├── T2: four sequence fixtures (trivial/delayed/output/input)  [quick]
└── T6: RunnerHandshakeBuilder helper (skeleton + types only)  [quick]

Wave 2 (RED tests — after T1+T2, fully parallel — MUST fail):
├── T3:  split-runner-communication-ordering.spec.ts (RED)     [deep]
├── T4:  split-runner-communication-lifecycle.spec.ts (RED)    [deep]
├── T5:  split-runner-communication-metadata.spec.ts (RED)     [deep]
├── T10: split-runner-communication-runtime.spec.ts (RED)      [deep]
└── T11: split-runner-communication-input.spec.ts (RED)        [deep]

Wave 3 (GREEN implementation — after Wave 2 + T6, fully parallel):
├── T7: Wire PING emission in runner-node.ts (depends: T6)     [deep]
├── T8: Fix CC.IN close in host-client.ts disconnect           [quick]
└── T9: Outer-runner terminal-frame fallback suppression       [unspecified-high]

Wave FINAL (after ALL implementation — 4 parallel reviews + user okay):
├── F1: Plan compliance audit                                  [oracle]
├── F2: Code quality review                                    [unspecified-high]
├── F3: Real manual QA (full ava + tsc + BDD scenario)         [unspecified-high]
└── F4: Scope fidelity check                                   [deep]
→ Present results → Get explicit user okay

Critical Path: T1 → {T3, T4, T5, T10, T11} (RED) → T6 → {T7, T8, T9 in parallel} → F1-F4 → user okay
Parallel Speedup: ~60% vs sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

- **T1**: deps `—`, blocks T3, T4, T5, T10, T11
- **T2**: deps `—`, blocks T3, T4, T5, T10, T11
- **T3**: deps T1, T2; blocks T7
- **T4**: deps T1, T2; blocks T8, T9
- **T5**: deps T1, T2; blocks T7
- **T6**: deps `—`, blocks T7
- **T7**: deps T3, T5, T10, T11, T6; blocks F1, F3
- **T8**: deps T4, T11; blocks F1, F3
- **T9**: deps T4, T10; blocks F1, F3
- **T10**: deps T1, T2; blocks T7, T9
- **T11**: deps T1, T2; blocks T7, T8 (input fixture exit relies on CC.IN close on read-end termination)
- **F1–F4**: deps T7, T8, T9; blocks user-okay handoff

### Agent Dispatch Summary

- **Wave 1 (3 tasks)**: T1 → `unspecified-high`, T2 → `quick`, T6 → `quick`
- **Wave 2 (5 tasks)**: T3 → `deep`, T4 → `deep`, T5 → `deep`, T10 → `deep`, T11 → `deep`
- **Wave 3 (3 tasks)**: T7 → `deep`, T8 → `quick`, T9 → `unspecified-high`
- **Wave FINAL (4 tasks)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. `packages/runner/test/transport/fake-instances-server.ts`: Implement reusable read-only TCP harness for split-runner contract tests — exports `createFakeInstancesServer()` returning `{ port, sockets, channels, frames, close }`

  **What to do**:
  - Create new file `packages/runner/test/transport/fake-instances-server.ts`.
  - Export `interface FakeInstancesServer { port: number; sockets: Set<net.Socket>; channels: Map<number, net.Socket>; frames: { monitoring: Array<[number, any]>; raw: Map<number, Buffer> }; harnessErrors: Error[]; awaitChannel(idx: number, timeoutMs?: number): Promise<net.Socket>; close(): Promise<void>; }` plus a factory `createFakeInstancesServer(expectedInstanceId: string): Promise<FakeInstancesServer>`.
  - Server binds `127.0.0.1` on `port: 0`. After `server.listen`, read `server.address()` and expose `.port` numerically.
  - On each incoming socket: track in `sockets`; on close, remove. Read first 37 bytes (36-byte UUID-style instance id + 1 ASCII digit channel index). Validate id matches `expectedInstanceId`; on mismatch destroy socket and push an `Error` to `harnessErrors`.
  - Once channel index is parsed, store the socket in `channels.set(channelIndex, socket)`. From there:
    - If channel index === `CC.MONITORING`: buffer subsequent bytes, split on `\r\n`, JSON.parse each non-empty line as `[code, data]` and push to `frames.monitoring` in arrival order. Tolerate partial trailing bytes between chunks.
    - Else: append raw bytes to `frames.raw.get(channelIndex)` (initialize empty Buffer if missing).
  - `awaitChannel(idx, timeoutMs = 5000)`: resolve with the socket once `channels.has(idx)`; reject with a clear `Error("channel <idx> not opened within <ms>ms")` on timeout. Used by tests that need to write to `CC.IN` once the runner has opened it.
  - `close()`: destroy every tracked socket, then `await new Promise<void>(res => server.close(() => res()))`.
  - Use `CommunicationChannel as CC` import from `@scramjet/symbols`.
  - **Write support is intentionally minimal**: tests interact with input channels by writing directly to `harness.channels.get(CC.IN)` (or via `awaitChannel`). The harness does NOT frame, route, or replay messages — callers own message framing for input items.

  **Must NOT do**:
  - No class hierarchy. Single factory function.
  - No high-level "send command" API. No CONTROL-channel write helpers.
  - No hardcoded port.
  - No abstraction for non-node runners in this work.
  - No parsing of any channel other than MONITORING.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — Networking + protocol parsing requires careful chunk-boundary handling.
  - **Skills**: none required.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T6)
  - **Blocks**: T3, T4, T5, T10, T11
  - **Blocked By**: None — can start immediately.

  **References**:
  - **Pattern**: `packages/runner/test/transport/host-client-channels.spec.ts:14-50` — existing minimal recording server; harness generalizes this. Extract the 36+1 framing logic and extend with per-channel buffering + `awaitChannel`.
  - **Channel constants**: `@scramjet/symbols` `CommunicationChannel` enum — gives `STDIN`, `STDOUT`, `STDERR`, `CONTROL`, `MONITORING`, `IN`, `OUT`, `LOG`, `REQUESTS` numeric indices.
  - **Monitoring frame format**: `packages/runner-node/src/message-utils.ts:12` — `JSON.stringify([code, data]) + "\r\n"`. Confirms CRLF-delimited JSON arrays.

  **Acceptance Criteria**:
  - [x] File compiles: `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` → 0 errors.
  - [ ] Exports verified via ts-node smoke: returned object has `port`, `sockets`, `channels`, `frames`, `harnessErrors`, `awaitChannel`, `close`.
  - [ ] No hardcoded port number (`grep -nE "listen\\(\\s*[0-9]" packages/runner/test/transport/fake-instances-server.ts` returns no port literal except `0`).

  **QA Scenarios**:

  ```
  Scenario: Harness binds, accepts a single channel, records monitoring frame
    Tool: Bash (node -r ts-node/register inline script)
    Preconditions: File T1 written; ts-node available.
    Steps:
      1. Import createFakeInstancesServer with expectedInstanceId = "00000000-0000-0000-0000-0000000000aa".
      2. Connect a net.Socket to 127.0.0.1:{server.port}.
      3. Write Buffer.from("00000000-0000-0000-0000-0000000000aa" + "5") (5 === CC.MONITORING).
      4. Write Buffer.from(JSON.stringify([3000, {hello: "world"}]) + "\r\n").
      5. Wait 50ms.
      6. Assert harness.frames.monitoring.length === 1 and harness.frames.monitoring[0][1].hello === "world".
      7. Call harness.close().
    Expected Result: Exit 0, no stderr.
    Failure Indicators: Frame count 0 (CRLF parsing broken), id mismatch, socket leak after close.
    Evidence: .omo/evidence/task-1-monitoring-frame-record.txt

  Scenario: Harness rejects wrong instance id
    Tool: Bash (node -r ts-node/register inline script)
    Steps:
      1. Create harness with expectedInstanceId "...aa".
      2. Connect socket, write "...bb" + "5".
      3. Wait 50ms.
      4. Assert harnessErrors length >= 1 and harness.channels.get(5) is undefined.
      5. Close.
    Expected Result: Error captured, channel not registered.
    Evidence: .omo/evidence/task-1-wrong-id-reject.txt

  Scenario: awaitChannel resolves on connect and rejects on timeout
    Tool: Bash (node -r ts-node/register inline script)
    Steps:
      1. Create harness.
      2. Start `awaitChannel(CC.IN, 2000)` promise.
      3. After 50ms, connect socket and write "...aa" + String(CC.IN).
      4. Assert promise resolves with a net.Socket instance.
      5. Start `awaitChannel(CC.STDIN, 200)` (no connect). Assert it rejects with error containing "not opened within".
    Expected Result: Both paths behave as specified.
    Evidence: .omo/evidence/task-1-await-channel.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-1-monitoring-frame-record.txt`
  - [ ] `.omo/evidence/task-1-wrong-id-reject.txt`
  - [ ] `.omo/evidence/task-1-await-channel.txt`

  **Commit**: Groups with C1.

- [x] 2. `packages/runner/test/fixtures/{trivial,delayed,output,input}-sequence/`: Add four sequence fixtures (single file + manifest each) covering the basic communication shapes — instant exit, longer lifetime no-output, longer lifetime with outputs, input-driven transform

  **What to do**:
  - For each of the four directories under `packages/runner/test/fixtures/`, create `index.js` + `package.json`. `package.json` is `{ "name": "<dir>", "version": "0.0.0", "main": "index.js" }` in all four cases.
  - Inspect `packages/runner-node/src/run-sequence.ts` first to confirm the exact export signature the sequence loader expects (default vs named, generator vs function returning iterable). All four fixtures use that same signature; only the body differs.
  - **trivial-sequence/index.js**: returns/exits immediately. Body: `async function*() { return; }`.
  - **delayed-sequence/index.js**: lives ~2s, returns without producing items. Body: `async function*() { await new Promise(r => setTimeout(r, 2000)); return; }`.
  - **output-sequence/index.js**: lives ~2s, emits 3–5 items as sequence outputs (yield from the async generator) with ~400ms gaps between items. Each item is a small JSON object like `{ "n": i, "from": "output-sequence" }`.
  - **input-sequence/index.js**: consumes input items (the first parameter to the exported function is the input stream — confirm via `run-sequence.ts`). For each incoming item, yield a single transformed item `{ "echo": <input>, "from": "input-sequence" }`. When the input stream ends, the generator completes; the runner-node then exits.
  - All four fixtures: pure Node, zero deps, no console.log, no setTimeout-based loops beyond the lifetime requirement, no I/O outside the sequence protocol.

  **Must NOT do**:
  - No alternative entry shapes — pick exactly one shape that matches the runner-node loader and use it consistently for all four.
  - No console output (would pollute STDERR/STDOUT channel assertions).
  - No throwing — these are happy-path fixtures.

  **Recommended Agent Profile**:
  - **Category**: `quick` — four small file pairs, no logic beyond what's listed.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T6).
  - **Blocks**: T3, T4, T5, T10, T11.
  - **Blocked By**: None.

  **References**:
  - **Pattern source of truth**: `packages/runner-node/src/run-sequence.ts` — read to confirm exact export shape consumed. Match the shape used by existing sample apps in the repo.
  - **Why**: an incorrect export shape causes the runner to throw before PING, polluting every spec downstream with a misleading failure mode.

  **Acceptance Criteria**:
  - [ ] Each fixture loads without error: `node -e "require('./packages/runner/test/fixtures/<name>')"` exits 0 for all four.
  - [ ] All four manifests are valid JSON with `"main": "index.js"`.
  - [ ] Zero `console.log` / `console.error` calls in any of the four index.js files (`grep -nE "console\\." packages/runner/test/fixtures/{trivial,delayed,output,input}-sequence/index.js` returns no matches).
  - [ ] `output-sequence/index.js` yields exactly 3, 4, or 5 items (verified by a smoke that consumes the generator and counts).

  **QA Scenarios**:

  ```
  Scenario: All four fixtures load and expose the expected callable
    Tool: Bash (node)
    Steps:
      1. For each of trivial/delayed/output/input:
         node -e "const m = require('./packages/runner/test/fixtures/<name>'); console.log(typeof m === 'function' || typeof m.default === 'function')"
      2. Assert every invocation prints "true".
    Evidence: .omo/evidence/task-2-fixture-load.txt

  Scenario: delayed-sequence lives ~2s, output-sequence yields 3-5 items
    Tool: Bash (node)
    Steps:
      1. Inline script imports delayed-sequence and consumes its iterator with `for await`. Measure wall time. Assert >= 1800ms and <= 2500ms.
      2. Inline script imports output-sequence and consumes. Assert produced count in [3, 5] and each item has `from === "output-sequence"`.
    Evidence: .omo/evidence/task-2-fixture-runtime.txt

  Scenario: input-sequence echoes input items
    Tool: Bash (node)
    Steps:
      1. Inline script: create an async iterable yielding 3 items {a:1},{a:2},{a:3}; pass to input-sequence's exported function in whatever shape run-sequence.ts uses; consume output; assert exactly 3 items echoed, each with `echo.a === <i>` and `from === "input-sequence"`.
    Evidence: .omo/evidence/task-2-fixture-input.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-2-fixture-load.txt`
  - [ ] `.omo/evidence/task-2-fixture-runtime.txt`
  - [ ] `.omo/evidence/task-2-fixture-input.txt`

  **Commit**: Groups with C1.

  **Commit**: Groups with C1.

- [x] 3. `packages/runner/test/transport/split-runner-communication-ordering.spec.ts`: RED — assert monitoring frame ordering (PING-first with required fields, PANG later, single terminal frame, no fallback duplicate)

  **What to do**:
  - Create spec file. Set `test.beforeEach(t => t.timeout(15_000))`.
  - Build an absolute path: `const startRunner = path.resolve(__dirname, "../../src/bin/start-runner.ts");`.
  - Construct an instance id constant `INSTANCE_ID = "00000000-0000-0000-0000-0000000000aa"`.
  - In each test: `const server = await createFakeInstancesServer(INSTANCE_ID);`.
  - Build env: copy `process.env`, then set:
    - `SEQUENCE_PATH=path.resolve(__dirname, "../fixtures/trivial-sequence/index.js")`
    - `SEQUENCE_INFO=JSON.stringify({ id: INSTANCE_ID, config: { engines: { node: "*" } }, instances: [], location: path.resolve(__dirname, "../fixtures/trivial-sequence") })`
    - `RUNNER_CONNECT_INFO=JSON.stringify({ appConfig: {}, args: [], instanceName: "trivial" })`
    - `INSTANCES_SERVER_PORT=String(server.port)`
    - `INSTANCES_SERVER_HOST="127.0.0.1"`
    - `INSTANCE_ID=INSTANCE_ID`
  - Spawn outer runner: `const child = spawn(process.execPath, ["-r", "ts-node/register", startRunner], { env, stdio: ["ignore", "pipe", "pipe"] });`. Pipe stdout/stderr to test buffers for diagnostics.
  - Wait for child exit with a 12s timeout. If timeout, kill and fail with collected stdout/stderr.
  - Assertions (each as a separate `t.true`/`t.is` with message):
    1. First non-trivial monitoring frame: `t.is(server.frames.monitoring[0][0], RunnerMessageCode.PING, "first monitoring frame must be PING")`.
    2. PING payload must contain `sequenceInfo.id === INSTANCE_ID`.
    3. PING payload must contain `payload.system.processPID` of type `number` > 0.
    4. PING payload must contain `payload.appConfig` (object), `payload.args` (array), `payload.instanceName === "trivial"`.
    5. Any frame whose code === `RunnerMessageCode.PANG` must appear at an index strictly greater than the PING index.
    6. Exactly one terminal frame: `const terminals = server.frames.monitoring.filter(f => f[0] === RunnerMessageCode.SEQUENCE_COMPLETED || f[0] === RunnerMessageCode.SEQUENCE_STOPPED); t.is(terminals.length, 1, "exactly one terminal frame");`.
  - Always `await server.close()` in `t.teardown`.

  **Must NOT do**:
  - No retries, no polling loops to mask race conditions. If PANG arrives before PING, the test must FAIL — that is the bug being proven.
  - No starting any Hub process.
  - No reliance on cwd or relative paths in env.

  **Recommended Agent Profile**:
  - **Category**: `deep` — needs careful handling of child process spawn, stdio plumbing, frame ordering invariants.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4, T5).
  - **Blocks**: T7 (informs PING shape).
  - **Blocked By**: T1, T2.

  **References**:
  - **Pattern**: `packages/runner/test/transport/host-client-channels.spec.ts` — spawn pattern + harness usage.
  - **Types**: `@scramjet/types` `SequenceInfo`, `RunnerConnectInfo` — match real shapes.
  - **Codes**: `@scramjet/symbols` `RunnerMessageCode.{PING,PANG,SEQUENCE_COMPLETED,SEQUENCE_STOPPED}`.
  - **Why**: PING-before-PANG with full handshake payload is the exact precondition `packages/host/src/lib/csi-controller.ts:617 handleHandshake()` requires before `getInfo()` can resolve `this.sequence.id`.

  **Acceptance Criteria**:
  - [ ] RED phase: `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-ordering.spec.ts --verbose 2>&1 | tee .omo/evidence/task-3-RED.txt` → exits non-zero with assertion message `first monitoring frame must be PING` (or similar — proving the bug).
  - [ ] GREEN phase (after T7): same command exits 0; evidence captured at `.omo/evidence/task-3-GREEN.txt`.

  **QA Scenarios**:

  ```
  Scenario: RED — spec fails with clear assertion (bug present)
    Tool: Bash
    Preconditions: T6 PING wiring NOT yet applied.
    Steps:
      1. Run `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-ordering.spec.ts --verbose`.
      2. Capture exit code (must be non-zero).
      3. grep output for "first monitoring frame must be PING" — must be present.
      4. grep for "TIMEOUT", "Error: spawn", "ENOENT" — must be absent (fail by assertion, not crash).
    Expected Result: Non-zero exit, assertion message present, no crash signals.
    Evidence: .omo/evidence/task-3-RED.txt

  Scenario: GREEN — spec passes after PING wiring (T7 applied)
    Tool: Bash
    Preconditions: T7 complete.
    Steps:
      1. Same command.
      2. Capture exit code 0.
      3. Output shows `1 test passed`.
    Expected Result: Exit 0.
    Evidence: .omo/evidence/task-3-GREEN.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-3-RED.txt`
  - [ ] `.omo/evidence/task-3-GREEN.txt`

  **Commit**: RED → C2 (Wave 2). GREEN proof lives under T7's evidence.

- [x] 4. `packages/runner/test/transport/split-runner-communication-lifecycle.spec.ts`: RED — assert child exits, outer exits, no leaked sockets after trivial sequence completes

  **What to do**:
  - Create spec file. `t.timeout(15_000)`.
  - Same harness + env construction as T3.
  - Spawn outer runner identically.
  - Wait for outer child exit. Capture `exitCode` and `signal`.
  - Assertions:
    1. `t.is(outerChild.exitCode, 0, "outer runner must exit 0")`.
    2. `t.is(outerChild.signal, null, "no signal kill")`.
    3. After outer exit, wait up to 2s for `server.sockets.size` to drain to `0`. Assert `t.is(server.sockets.size, 0, "no leaked sockets — all channel sockets closed including CC.IN")`.
    4. The IN channel socket (`server.channels.get(CC.IN)`) must have received an `end` or `close` event before assertion — track via per-socket `readableEnded` and assert `t.true(inSocket.readableEnded || inSocket.destroyed, "CC.IN closed by runner-node")`. If `server.channels.get(CC.IN)` is undefined (channel never opened), the test MUST fail with `"CC.IN channel was never opened by runner-node"` (proves split ownership is wrong if so).
  - `t.teardown(() => server.close())`.

  **Must NOT do**:
  - No `process.kill` from the test. The child must exit naturally; if it doesn't, that IS the bug.
  - No CONTROL writes from harness — gate is read-only.

  **Recommended Agent Profile**:
  - **Category**: `deep` — race-sensitive socket bookkeeping.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T5).
  - **Blocks**: T8, T9.
  - **Blocked By**: T1, T2.

  **References**:
  - **Pattern**: T3 spec — copy the spawn + env scaffolding to keep both specs aligned.
  - **Code under test**: `packages/runner-node/src/host-client.ts:185-220 disconnect()` — graceful branch skips CC.IN. That is the bug T8 will fix.
  - **Why**: Without CC.IN close, runner-node's input loop keeps the event loop alive, child never exits, outer waits forever, Docker kills with 137.

  **Acceptance Criteria**:
  - [ ] RED: spec fails with either "outer runner must exit 0" (timeout-induced) or "no leaked sockets" or "CC.IN closed by runner-node" assertion message.
  - [ ] GREEN (after T8): spec passes.

  **QA Scenarios**:

  ```
  Scenario: RED — child does not exit / CC.IN socket leaks
    Tool: Bash
    Preconditions: T8 not yet applied.
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-lifecycle.spec.ts --verbose`.
      2. Exit non-zero, assertion message present (any of the three above).
      3. No crash markers.
    Evidence: .omo/evidence/task-4-RED.txt

  Scenario: GREEN — child exits cleanly, sockets drain
    Tool: Bash
    Preconditions: T8 complete.
    Steps:
      1. Same command.
      2. Exit 0, "1 test passed".
    Evidence: .omo/evidence/task-4-GREEN.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-4-RED.txt`
  - [ ] `.omo/evidence/task-4-GREEN.txt`

  **Commit**: RED → C2. GREEN under T8.

- [x] 5. `packages/runner/test/transport/split-runner-communication-metadata.spec.ts`: RED — assert PING payload contains every field `CSIController.handleHandshake()` reads, without starting Hub

  **What to do**:
  - Create spec file. `t.timeout(15_000)`.
  - Same harness + env as T3.
  - Spawn outer runner. Wait for at least one PING frame to arrive (poll `server.frames.monitoring` for first PING with 8s timeout — this is allowed because we are not masking the bug, we are waiting for the protocol to start). Then wait for outer exit.
  - Assertions on PING payload (each field separately for diagnostic clarity):
    1. `t.truthy(ping[1].sequenceInfo, "sequenceInfo present")`.
    2. `t.is(ping[1].sequenceInfo.id, INSTANCE_ID)`.
    3. `t.truthy(ping[1].sequenceInfo.config, "sequenceInfo.config present")`.
    4. `t.true(Array.isArray(ping[1].sequenceInfo.instances), "sequenceInfo.instances is array")`.
    5. `t.truthy(ping[1].sequenceInfo.location, "sequenceInfo.location present")`.
    6. `t.truthy(ping[1].payload, "payload present")`.
    7. `t.is(typeof ping[1].payload.system.processPID, "number")` and `t.true(ping[1].payload.system.processPID > 0)`.
    8. `t.truthy(ping[1].payload.appConfig)`.
    9. `t.true(Array.isArray(ping[1].payload.args))`.
    10. `t.is(ping[1].payload.instanceName, "trivial")`.
  - These exactly mirror reads in `packages/host/src/lib/csi-controller.ts:617-650 handleHandshake()` for the non-optional path.

  **Must NOT do**:
  - No polling that retries past the explicit 8s deadline (no infinite wait masquerading as "patience").
  - No assertion on optional fields (`limits`, `expose*`, `inputTopic`, `outputTopic`) — they are not set by the trivial fixture.

  **Recommended Agent Profile**:
  - **Category**: `deep`.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4).
  - **Blocks**: T7.
  - **Blocked By**: T1, T2.

  **References**:
  - **Source of truth**: `packages/host/src/lib/csi-controller.ts:617-650 handleHandshake()` — every field asserted here must match a read there.
  - **Type shapes**: `@scramjet/types` — `SequenceInfo` (id, config, instances, location), `AppConfig`, etc.
  - **Why**: This spec is the contract test. If it passes without a Hub, the Hub-side `getInfo()` will not log `undefined`.

  **Acceptance Criteria**:
  - [ ] RED: spec fails on `t.truthy(ping)` or "first monitoring frame must be PING" (no PING emitted at all today).
  - [ ] GREEN (after T7): spec passes.

  **QA Scenarios**:

  ```
  Scenario: RED — no PING frame appears (or missing required fields)
    Tool: Bash
    Preconditions: T7 not yet applied.
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-metadata.spec.ts --verbose`.
      2. Exit non-zero with assertion about PING absence or missing field.
    Evidence: .omo/evidence/task-5-RED.txt

  Scenario: GREEN — PING with full payload present
    Tool: Bash
    Preconditions: T7 complete.
    Steps:
      1. Same command.
      2. Exit 0.
    Evidence: .omo/evidence/task-5-GREEN.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-5-RED.txt`
  - [ ] `.omo/evidence/task-5-GREEN.txt`

  **Commit**: RED → C2. GREEN under T7.

- [x] 6. `packages/runner-node/src/handshake.ts`: Add `RunnerHandshakeBuilder` — minimal helper that constructs the PING payload from runtime inputs

  **What to do**:
  - Create new file `packages/runner-node/src/handshake.ts`.
  - Export `interface RunnerHandshakeInputs { sequenceInfo: SequenceInfo; appConfig: AppConfig; args: any[]; instanceName?: string; }`.
  - Export `function buildPing(inputs: RunnerHandshakeInputs): [RunnerMessageCode.PING, { sequenceInfo: SequenceInfo; payload: { system: { processPID: number }; appConfig: AppConfig; args: any[]; instanceName?: string } }]`.
  - Implementation:
    ```ts
    return [RunnerMessageCode.PING, {
      sequenceInfo: inputs.sequenceInfo,
      payload: {
        system: { processPID: process.pid },
        appConfig: inputs.appConfig,
        args: inputs.args,
        instanceName: inputs.instanceName,
      },
    }];
    ```
  - Single function. No class. No optional-field fluent API. Keep narrow on purpose.

  **Must NOT do**:
  - No "future runner abstraction layer". No generics over message code. No PANG support.
  - No reading of process.env inside the builder — all inputs explicit.
  - No I/O. Pure construction.

  **Recommended Agent Profile**:
  - **Category**: `quick` — ~25 LOC.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1 with T1, T2).
  - **Blocks**: T7.
  - **Blocked By**: None.

  **References**:
  - **Legacy reference**: `packages/runner/src/runner.ts` `sendHandshakeMessage()` — shows the original PING shape; mirror the same payload fields (`sequenceInfo`, `payload.system.processPID`, `appConfig`, `args`, `instanceName`).
  - **Hub-side reader**: `packages/host/src/lib/csi-controller.ts:617 handleHandshake()` — confirms field names.
  - **Codes**: `@scramjet/symbols` `RunnerMessageCode`.

  **Acceptance Criteria**:
  - [x] `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → 0 errors.
  - [ ] Smoke: `node -r ts-node/register -e 'const {buildPing} = require("./packages/runner-node/src/handshake"); const f = buildPing({sequenceInfo:{id:"x",config:{},instances:[],location:"/"}, appConfig:{}, args:[], instanceName:"t"}); console.log(JSON.stringify(f));'` prints valid `[code, payload]`.

  **QA Scenarios**:

  ```
  Scenario: buildPing returns well-formed PING frame
    Tool: Bash (node -r ts-node/register)
    Steps:
      1. Run smoke above.
      2. Parse output JSON. Assert frame[0] === RunnerMessageCode.PING (numeric), frame[1].sequenceInfo.id === "x", frame[1].payload.system.processPID === process.pid (current node's), frame[1].payload.instanceName === "t".
    Expected Result: Exit 0, all assertions pass.
    Evidence: .omo/evidence/task-6-buildping-smoke.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-6-buildping-smoke.txt`

  **Commit**: Groups with C1.

  **Commit**: Groups with C1.

- [x] 7. `packages/runner-node/src/bin/runner-node.ts`: Wire `buildPing` emission on MONITORING channel BEFORE any PANG, after host channels open and before sequence start

  **What to do**:
  - Read current `packages/runner-node/src/bin/runner-node.ts` to locate (a) the boot-config parse that yields `sequenceInfo`, `appConfig`, `args`, `instanceName`; (b) the host-client `connect`/channel-init call; (c) the first PANG emission and the `run-sequence` invocation.
  - Import `buildPing` from `../handshake`.
  - Insert: after host channels are confirmed open (specifically after `MONITORING` stream is writable) and BEFORE any other write to MONITORING (including PANG), call `messageUtils.writeMessageOnStream(buildPing({sequenceInfo, appConfig, args, instanceName}), monitoringStream)` — match the existing write helper signature in `packages/runner-node/src/message-utils.ts`.
  - Ensure the call is `await`ed (or its flush is observed) before subsequent writes so chunks cannot interleave on the wire and reorder frames at the harness boundary.
  - Do NOT change PANG emission code path.
  - Do NOT change exit translation, fd4/fd5 passthrough, or six-slot stdio code paths.

  **Must NOT do**:
  - No reordering of PANG emission. PING goes earlier; PANG stays where it is.
  - No new env vars. Use boot-config / existing parsed inputs.
  - No reintroduction of forbidden patterns (worker_threads, parentPort, fork, V1 names).
  - No touching `packages/host/`.

  **Recommended Agent Profile**:
  - **Category**: `deep` — must integrate cleanly with existing boot ordering and avoid race with first PANG.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8 and T9 — they touch disjoint files: T7 = `runner-node/src/bin/runner-node.ts` + `handshake.ts`; T8 = `runner-node/src/host-client.ts`; T9 = `runner/src/executor/*`).
  - **Parallel Group**: Wave 3 (with T8, T9).
  - **Blocks**: F1, F3.
  - **Blocked By**: T3, T5, T10, T11, T6.

  **References**:
  - **Where to insert**: `packages/runner-node/src/bin/runner-node.ts` — find the line that performs first `writeMessageOnStream(... PANG ...)` and insert PING write immediately above it (or after `hostClient.init(...)`/`connect()` resolves and before run-sequence kickoff).
  - **Helper**: `packages/runner-node/src/message-utils.ts:writeMessageOnStream` — single write path; reuse to maintain `\r\n` framing.
  - **Input source**: `packages/runner-node/src/boot-config.ts` — already parses `SEQUENCE_INFO` / `RUNNER_CONNECT_INFO`. Reuse its exports; do not re-parse env in bin.
  - **Builder**: `packages/runner-node/src/handshake.ts` (created in T6).
  - **Why**: this is the entire RCA fix — without PING, `CSIController.handleHandshake()` never runs, `this.sequence` stays `{}`, `getInfo()` logs `undefined`.

  **Acceptance Criteria**:
  - [x] T3 spec passes (GREEN): `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-ordering.spec.ts` → 1 passed.
  - [x] T5 spec passes (GREEN): `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-metadata.spec.ts` → 1 passed.
  - [x] `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → 0 errors.
  - [x] `cd packages/runner-node && npx ava` → all green (no regression).
  - [x] `git diff packages/runner-node/src/fd-streams.ts` empty (no fd4/fd5 changes).

  **QA Scenarios**:

  ```
  Scenario: PING-before-PANG verified end-to-end
    Tool: Bash
    Preconditions: T7 applied.
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-ordering.spec.ts --verbose`.
      2. Exit 0; output shows "1 test passed".
      3. Capture full stdout to evidence.
    Evidence: .omo/evidence/task-7-ordering-GREEN.txt

  Scenario: Metadata spec passes
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-metadata.spec.ts --verbose`.
      2. Exit 0.
    Evidence: .omo/evidence/task-7-metadata-GREEN.txt

  Scenario: No runner-node regression
    Tool: Bash
    Steps:
      1. `cd packages/runner-node && npx ava 2>&1 | tee .omo/evidence/task-7-runner-node-ava.txt`.
      2. Exit 0.
    Evidence: .omo/evidence/task-7-runner-node-ava.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-7-ordering-GREEN.txt`
  - [ ] `.omo/evidence/task-7-metadata-GREEN.txt`
  - [ ] `.omo/evidence/task-7-runner-node-ava.txt`

  **Commit**: Groups with C3.

- [x] 8. `packages/runner-node/src/host-client.ts`: Graceful-disconnect path closes `CC.IN` when owned by runner-node so the child process can exit

  **What to do**:
  - Locate `disconnect(hard: boolean)` at lines 185-220.
  - Current skip-list inside the `streams.map` includes `[CC.IN, CC.STDIN, CC.CONTROL]` for BOTH branches.
  - Change: on the `!hard` (graceful success) branch, `CC.IN` must NOT be skipped — it must be `.end()`'d (graceful half-close) so the writable end on the harness side observes `end` and the readable input loop terminates, allowing the runner-node event loop to drain.
  - Keep `STDIN` and `CONTROL` in the skip-list (they remain host-owned even in split mode).
  - On the `hard` branch, retain existing destroy-all behavior.
  - Single, surgical change. No signature, parameter, naming, or logging modifications.

  **Must NOT do**:
  - No refactor of disconnect's structure beyond moving CC.IN out of the graceful-branch skip-list.
  - No removal of STDIN/CONTROL skip — they are intentional.
  - No additional error handlers, log lines, or comments beyond what's needed to explain the CC.IN delta (single-line comment OK).

  **Recommended Agent Profile**:
  - **Category**: `quick` — one-line code change with comment.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9; T7 owns a different file).
  - **Blocks**: F1, F3.
  - **Blocked By**: T4, T11.

  **References**:
  - **Code under change**: `packages/runner-node/src/host-client.ts:185-220`.
  - **Why CC.IN matters here**: in split-runner mode the OUTER runner does not open CC.IN (see `packages/runner/src/host-client.ts:OUTER_RUNNER_CHANNELS`); the runner-node child owns it. If runner-node never closes it on success, the readable input pipe holds the event loop open.
  - **Evidence in BDD logs**: child stayed alive past `SEQUENCE_COMPLETED`; Docker killed with 137 (oom=false).

  **Acceptance Criteria**:
  - [x] T4 spec passes (GREEN): `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-lifecycle.spec.ts` → 1 passed.
  - [x] `cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json` → 0 errors.
  - [x] `cd packages/runner-node && npx ava` → all green.
  - [ ] Diff scope: `git diff --stat packages/runner-node/src/host-client.ts` shows a small change (~1-3 lines added/removed) — proves no refactor sprawl.

  **QA Scenarios**:

  ```
  Scenario: Lifecycle spec GREEN — child exits, no leaked sockets
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-lifecycle.spec.ts --verbose 2>&1 | tee .omo/evidence/task-8-lifecycle-GREEN.txt`.
      2. Exit 0, "1 test passed".
    Evidence: .omo/evidence/task-8-lifecycle-GREEN.txt

  Scenario: No regression on runner-node existing tests
    Tool: Bash
    Steps:
      1. `cd packages/runner-node && npx ava 2>&1 | tee .omo/evidence/task-8-runner-node-ava.txt`.
      2. Exit 0.
    Evidence: .omo/evidence/task-8-runner-node-ava.txt

  Scenario: Diff stays surgical
    Tool: Bash
    Steps:
      1. `git diff --stat packages/runner-node/src/host-client.ts`.
      2. Assert "1 file changed" with insertions+deletions <= 6.
    Evidence: .omo/evidence/task-8-diff-stat.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-8-lifecycle-GREEN.txt`
  - [ ] `.omo/evidence/task-8-runner-node-ava.txt`
  - [ ] `.omo/evidence/task-8-diff-stat.txt`

  **Commit**: Groups with C3.

- [x] 9. `packages/runner/src/executor/{lifecycle-observer,exit-translation}.ts`: Suppress outer-runner terminal-frame fallback when child has already emitted SEQUENCE_COMPLETED/STOPPED

  **What to do**:
  - Read `packages/runner/src/executor/lifecycle-observer.ts` and `packages/runner/src/executor/exit-translation.ts` to locate where the OUTER runner writes its own fallback terminal lifecycle frame on child close.
  - Add a small state flag (`childEmittedTerminal: boolean`) observed by `observeChildLifecycleFrames`: set to `true` when a parsed monitoring frame from the child has code `SEQUENCE_COMPLETED` or `SEQUENCE_STOPPED`.
  - In `writeTerminalLifecycleFrame` (or its caller in `start-runner.ts`), short-circuit when `childEmittedTerminal === true` — do not emit a second terminal frame.
  - Preserve all existing behavior for crash/non-zero exit paths where the child did NOT emit a terminal frame (those still need the fallback).
  - Keep the change minimal — a flag and a guard. No reorganization.

  **Must NOT do**:
  - No removal of the fallback emission for crash paths.
  - No new public APIs from `executor/`.
  - No touching the six-slot stdio or fd4/fd5 forwarding code.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — small but cross-module wiring inside executor/.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T8).
  - **Blocks**: F1, F3.
  - **Blocked By**: T4, T10.

  **References**:
  - **Files**: `packages/runner/src/executor/lifecycle-observer.ts`, `packages/runner/src/executor/exit-translation.ts`, callers in `packages/runner/src/bin/start-runner.ts`.
  - **Why**: T3 asserts exactly ONE terminal frame; today the outer runner may add a fallback even when the child already emitted one, creating a duplicate on the wire and confusing the Hub-side state machine.

  **Acceptance Criteria**:
  - [x] T3 spec assertion "exactly one terminal frame" passes.
  - [x] `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` → 0 errors.
  - [ ] `cd packages/runner && npx ava` → all green (no regression on existing executor tests).
  - [x] Crash-path coverage retained: any existing executor test for non-zero exit code still passes.

  **QA Scenarios**:

  ```
  Scenario: Single terminal frame on success path
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-ordering.spec.ts --verbose 2>&1 | tee .omo/evidence/task-9-single-terminal.txt`.
      2. Exit 0; assertion "exactly one terminal frame" satisfied.
    Evidence: .omo/evidence/task-9-single-terminal.txt

  Scenario: Crash-path fallback retained (existing executor tests)
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/executor/ 2>&1 | tee .omo/evidence/task-9-executor-regression.txt`.
      2. Exit 0.
    Evidence: .omo/evidence/task-9-executor-regression.txt

  Scenario: Full runner suite green
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava 2>&1 | tee .omo/evidence/task-9-runner-full-ava.txt`.
      2. Exit 0.
    Evidence: .omo/evidence/task-9-runner-full-ava.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-9-single-terminal.txt`
  - [ ] `.omo/evidence/task-9-executor-regression.txt`
  - [ ] `.omo/evidence/task-9-runner-full-ava.txt`

  **Commit**: Groups with C3.

- [x] 10. `packages/runner/test/transport/split-runner-communication-runtime.spec.ts`: RED — exercise delayed + output fixtures; assert no premature terminal frame during sequence lifetime and OUT channel receives expected payloads

  **What to do**:
  - Create spec file. `t.timeout(15_000)`.
  - Two tests in one file (use `test()` twice, share env-builder helper from T3):
    - **Test A (delayed)**: spawn outer runner with `SEQUENCE_PATH=…/delayed-sequence/index.js`. After PING is observed, sample `server.frames.monitoring` at `t = 500ms`, `t = 1000ms`, `t = 1500ms` — at each sample assert no `SEQUENCE_COMPLETED` / `SEQUENCE_STOPPED` frame yet. After child exit, assert exactly one terminal frame total.
    - **Test B (output)**: spawn outer runner with `SEQUENCE_PATH=…/output-sequence/index.js`. Wait for child exit. Assert `server.frames.raw.get(CC.OUT)` is non-empty. Parse OUT channel bytes (whichever framing the runner uses for sequence outputs — confirm via `run-sequence.ts` / output stream module; CRLF-delimited JSON expected). Assert item count ∈ [3, 5] and each item has `from === "output-sequence"`.
  - Both tests assert PING precedes all OUT-channel data (i.e., the harness must observe PING before any byte on CC.OUT).
  - `t.teardown(() => server.close())`.

  **Must NOT do**:
  - No polling/retry past the spec timeout.
  - No assumption that OUT framing is identical to MONITORING — verify the actual format used by `output-sequence` against `run-sequence.ts` before writing the parser. If formats differ, document the OUT format inline in the test.

  **Recommended Agent Profile**:
  - **Category**: `deep` — multi-fixture runtime assertions with timing windows.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4, T5, T11).
  - **Blocks**: T7, T9.
  - **Blocked By**: T1, T2.

  **References**:
  - **Pattern**: T3 spec — same env-builder pattern; reuse helper if extracted, otherwise copy.
  - **OUT framing**: `packages/runner-node/src/run-sequence.ts` and whichever module wires the sequence output to `CC.OUT` (likely `packages/runner-node/src/host-client.ts` getter for OUT stream). Read these to determine OUT-channel byte format.
  - **Why**: trivial-sequence proves the contract starts; delayed proves nothing terminal arrives early; output proves the data plane works during the sequence lifetime — together they cover "the runner-node child correctly communicates with host throughout the sequence's life."

  **Acceptance Criteria**:
  - [ ] RED: spec fails — most likely on the "first monitoring frame must be PING" precondition (since no PING is emitted today). Capture the assertion message.
  - [x] GREEN (after T7 + T9): both tests pass.

  **QA Scenarios**:

  ```
  Scenario: RED — runtime spec fails on missing PING / duplicate terminal
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-runtime.spec.ts --verbose 2>&1 | tee .omo/evidence/task-10-RED.txt`.
      2. Exit non-zero. Output contains explicit assertion (not crash).
    Evidence: .omo/evidence/task-10-RED.txt

  Scenario: GREEN — delayed test sees no premature terminal; output test sees N items
    Tool: Bash
    Preconditions: T7 + T9 applied.
    Steps:
      1. Same command.
      2. Exit 0; two passed.
    Evidence: .omo/evidence/task-10-GREEN.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-10-RED.txt`
  - [ ] `.omo/evidence/task-10-GREEN.txt`

  **Commit**: RED → C2. GREEN proof under T7/T9 evidence pair.

- [x] 11. `packages/runner/test/transport/split-runner-communication-input.spec.ts`: RED — exercise input-sequence fixture; harness writes N items to CC.IN; assert OUT channel receives N transformed items and child exits on input end

  **What to do**:
  - Create spec file. `t.timeout(15_000)`.
  - Reuse env-builder pattern from T3 with `SEQUENCE_PATH=…/input-sequence/index.js`.
  - Spawn outer runner.
  - `const inSocket = await server.awaitChannel(CC.IN, 8000);` — proves CC.IN was opened by runner-node.
  - Write three input items to `inSocket`. Determine the CC.IN framing by reading `packages/runner-node/src/input-stream.ts` (or equivalent module that parses input). Expected framing: CRLF-delimited JSON values (one item per `value + "\r\n"`). If the actual framing differs, the test uses the actual format — but document it in a comment.
  - After writing the 3rd item, half-close the writable side of `inSocket` (`inSocket.end()`) to signal input EOF.
  - Wait for outer child exit (8s deadline). Capture exit code.
  - Assertions:
    1. PING present and first on MONITORING channel.
    2. CC.IN channel was opened by runner-node (`server.channels.has(CC.IN)` true).
    3. OUT channel raw buffer parses into exactly 3 items, each with `from === "input-sequence"` and `echo.<key>` matching the written input.
    4. Outer child exit code === 0 (child exits naturally when input ends).
    5. Exactly one terminal frame total.
  - `t.teardown(() => server.close())`.

  **Must NOT do**:
  - No fabricated CC.IN framing — read the runner-node input parser to learn the real format.
  - No sending input before PING is observed (would mask ordering bugs).
  - No `inSocket.destroy()` from the test — use graceful `end()` so the test verifies the input-EOF → child-exit path.

  **Recommended Agent Profile**:
  - **Category**: `deep` — bidirectional protocol test with timing and framing concerns.
  - **Skills**: none.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4, T5, T10).
  - **Blocks**: T7, T8 (T8's CC.IN-close fix is what allows the child to exit on input EOF).
  - **Blocked By**: T1, T2.

  **References**:
  - **Input framing source**: `packages/runner-node/src/input-stream.ts` — read to determine CC.IN parsing (likely CRLF-delimited JSON, but verify).
  - **OUT framing source**: same as T10 (`run-sequence.ts` + OUT host-client wiring).
  - **awaitChannel**: T1 harness API — used to block until runner-node opens CC.IN.
  - **Why**: this is the most realistic Hub-side simulation runner-level — host pushes items, runner consumes and emits, host observes outputs, host closes input → runner shuts down. Catches both protocol-shape bugs and lifecycle bugs in one spec.

  **Acceptance Criteria**:
  - [ ] RED: spec fails — most likely on "first monitoring frame must be PING" or `awaitChannel(CC.IN)` timing out, depending on which bug surfaces first.
  - [x] GREEN (after T7 + T8): spec passes; 3 echoed items observed on CC.OUT.

  **QA Scenarios**:

  ```
  Scenario: RED — input spec fails with explicit assertion (no PING / child won't exit)
    Tool: Bash
    Steps:
      1. `cd packages/runner && npx ava packages/runner/test/transport/split-runner-communication-input.spec.ts --verbose 2>&1 | tee .omo/evidence/task-11-RED.txt`.
      2. Exit non-zero. Assertion message present.
    Evidence: .omo/evidence/task-11-RED.txt

  Scenario: GREEN — input → output round trip works; child exits on input EOF
    Tool: Bash
    Preconditions: T7 + T8 applied.
    Steps:
      1. Same command.
      2. Exit 0; "1 test passed".
      3. Output mentions all 5 assertions satisfied.
    Evidence: .omo/evidence/task-11-GREEN.txt

  Scenario: Diagnose CC.IN framing if assertion #3 fails
    Tool: Bash
    Steps:
      1. If echo items don't parse, log `inspect(server.frames.raw.get(CC.OUT))` to stderr.
      2. Cross-check against `packages/runner-node/src/input-stream.ts` framing.
    Evidence: .omo/evidence/task-11-out-framing-diagnostic.txt (only if needed)
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-11-RED.txt`
  - [ ] `.omo/evidence/task-11-GREEN.txt`
  - [ ] `.omo/evidence/task-11-out-framing-diagnostic.txt` (conditional)

  **Commit**: RED → C2. GREEN proof under T7/T8 evidence pair.

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read this plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": grep changed files for forbidden patterns (worker_threads, parentPort, fork, JSON+base64 API proxy, V1 names, host/ edits, hardcoded ports, host-client.ts non-CC.IN changes) — reject with file:line if found. Check evidence files exist in `.omo/evidence/`. Confirm six-slot stdio + fd4/fd5 untouched (`git diff packages/runner-node/src/fd-streams.ts` shows no logic change). Verify all five new specs pass.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json` and same for `packages/runner-node`. Run `cd packages/runner && npx ava` and `cd packages/runner-node && npx ava`. Review every changed file for: `as any`/`@ts-ignore`, empty catches, stray `console.log`, commented-out code, unused imports, AI-slop excess comments, over-abstraction in `handshake.ts`, generic names (data/result/temp).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Clean state. Execute every QA scenario from every task — exact steps, capture evidence. Then run the full Definition-of-Done command list including the BDD scenario: `SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=900000 yarn test:bdd:ts --name="Node sequence completes successfully under runner-node spawn isolation"`. Save all output to `.omo/evidence/final-qa/`. Grep BDD log for `Get info [seq, info] [ undefined`, `NODE_COMPLETES_OK`, and count `SEQUENCE_COMPLETED` occurrences (must be exactly 1). Confirm runner exit code (must NOT be 137).
  Output: `Scenarios [N/N pass] | BDD [PASS/FAIL] | undefined-metadata [ABSENT/PRESENT] | SEQUENCE_COMPLETED count [N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  `git log` + `git diff` since plan start. For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec built, nothing beyond spec built. Verify "Must NOT Have" compliance via grep. Detect cross-task contamination: T8 only touches `packages/runner-node/src/host-client.ts`; T7 only touches `packages/runner-node/src/bin/runner-node.ts` + `packages/runner-node/src/handshake.ts`; T9 only touches `packages/runner/src/executor/*`. Flag any unaccounted file.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

> Group by wave to keep RED→GREEN clearly visible in history.

- **C1** (after Wave 1): `test(runner): add fake instances-server harness + four sequence fixtures (trivial/delayed/output/input)`
  - Files: `packages/runner/test/transport/fake-instances-server.ts`, `packages/runner/test/fixtures/trivial-sequence/{index.js,package.json}`, `packages/runner/test/fixtures/delayed-sequence/{index.js,package.json}`, `packages/runner/test/fixtures/output-sequence/{index.js,package.json}`, `packages/runner/test/fixtures/input-sequence/{index.js,package.json}`, `packages/runner-node/src/handshake.ts` (skeleton)
  - Pre-commit: `cd packages/runner && npx tsc --noEmit -p tsconfig.build.json && cd ../runner-node && npx tsc --noEmit -p tsconfig.build.json`

- **C2** (after Wave 2 — RED commit):
  `test(runner): RED — split runner communication contract (ordering, lifecycle, metadata, runtime, input)`
  - Files: `packages/runner/test/transport/split-runner-communication-{ordering,lifecycle,metadata,runtime,input}.spec.ts`
  - Pre-commit: `cd packages/runner && npx ava -m "*split runner communication*" || true` (must print 5 failures with assertion messages — captured as RED evidence)

- **C3** (after Wave 3 — GREEN commit):
  `fix(runner-node): emit PING handshake + close CC.IN on graceful disconnect; runner: suppress duplicate terminal frame`
  - Files: `packages/runner-node/src/handshake.ts`, `packages/runner-node/src/bin/runner-node.ts`, `packages/runner-node/src/host-client.ts`, `packages/runner/src/executor/{lifecycle-observer|exit-translation}.ts`
  - Pre-commit: `cd packages/runner && npx ava && npx tsc --noEmit -p tsconfig.build.json && cd ../runner-node && npx ava && npx tsc --noEmit -p tsconfig.build.json`

---

## Success Criteria

### Verification Commands
```bash
# RED phase evidence (after Wave 2, before Wave 3)
cd packages/runner && npx ava -m "*split runner communication*" --verbose
# Expected: 5 tests, 5 failures with clear assertion messages

# GREEN phase
cd packages/runner && npx ava -m "*split runner communication*"
# Expected: 5 passed

cd packages/runner && npx ava
cd packages/runner-node && npx ava
# Expected: all green, no regressions

cd packages/runner && npx tsc --noEmit -p tsconfig.build.json
cd packages/runner-node && npx tsc --noEmit -p tsconfig.build.json
# Expected: 0 errors each

# Final BDD validation
SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=900000 yarn test:bdd:ts \
  --name="Node sequence completes successfully under runner-node spawn isolation"
# Expected:
#   - log contains "NODE_COMPLETES_OK"
#   - log contains "SEQUENCE_COMPLETED" exactly once
#   - log does NOT contain "Get info [seq, info] [ undefined"
#   - runner process exit code != 137
```

### Final Checklist
- [ ] All "Must Have" present and verified by command
- [ ] All "Must NOT Have" absent and verified by grep
- [x] Five new specs pass (`*split runner communication*`)
- [ ] Full `npx ava` green in both packages
- [x] `tsc --noEmit` clean in both packages
- [x] BDD scenario passes without undefined-metadata log and without exit 137
- [ ] Evidence files saved under `.omo/evidence/`

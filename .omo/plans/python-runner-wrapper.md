# Python Runner Wrapper

## TL;DR
> **Summary**: Replace `packages/python-runner` with a fresh `packages/runner-python` runtime wrapper, owned by the main `packages/runner` via a formal `RuntimeExecutor` interface. Remove all `engines.python3` branching from adapter launch paths. Lock the runtime-wrapper contract behind shared TS types + executable parity tests so future wrappers (e.g. `runner-bun`) plug in without touching adapters or host.
> **Deliverables**:
> - `packages/runner-python/` (clean-slate Python: asyncio, type hints, dataclasses, pytest infra)
> - `packages/runner/src/executor/types.ts` + `select.ts` + `python-process-executor.ts`
> - `packages/types/src/runtime-executor.ts` (BootConfig + RuntimeExecutor canonical types)
> - Adapter Python-branch removal across process/docker/kubernetes
> - Updated runner-py Docker image (outer-runner entrypoint, python deps preserved)
> - `docs/architecture/runner-runtime-wrappers.md`
> - Hard cutover: `packages/python-runner/` deleted after repo-wide reference scan is empty
> - All existing BDD + new unit/parity tests green
> **Effort**: Large
> **Parallel**: YES - 8 implementation waves + 1 final verification wave
> **Critical Path**: W1.parity-capture -> W2.runner-python-core -> W3.sequence-runtime -> W4.outer-executor -> W5.adapter-cleanup -> W6.image-ci -> W7.deletion -> W8.bdd-verify -> W9.final-verify

## Context

### Original Request
Generate a plan based on `docs/roadmap/014-feature-request-python-runner-wrapper.md`. After the runner-worker-isolation work (013, completed), make `packages/runner` the single host-facing entrypoint for both Node and Python; replace `packages/python-runner` with a `runner-python` runtime wrapper that the main runner invokes via an executor protocol; stop env-var transport to the wrapper; remove host-side language branching; document the contract.

### Interview Summary
- Migration: NEW `packages/runner-python` package, DELETE `packages/python-runner` (hard cutover, no shim).
- Wire protocol: MIRROR runner-node. Outer runner forwards fds 0/1/2 (stdio) + fd4 (control) + fd5 (monitoring); fd3 reserved IPC. Python child opens IN/OUT/LOG directly to host TCP. No REQUESTS / no BPMux for Python.
- Boot config: same private-file mechanism as runner-node, JSON file path passed as the last positional CLI argument to the wrapper. Index in the child differs by runtime: runner-node reads `process.argv[2]` (because parent spawns `["<runner-node-entry>", bootConfigPath]`); runner-python reads `sys.argv[1]` (because parent spawns `["-m", "runner_python", bootConfigPath]` and Python's `-m` execution surfaces user args starting at `sys.argv[1]`). Adapter env contract for bootstrapping `packages/runner` (`INSTANCES_SERVER_PORT`, `INSTANCES_SERVER_HOST`, `INSTANCE_ID`) is unchanged per 013 invariants.
- Test discipline: TDD (RED-GREEN-REFACTOR) per implementation task.
- Test infra: NEW pytest + pytest-asyncio under `packages/runner-python/`; AVA on Node side; BDD parity preserved.
- Documentation: dedicated `docs/architecture/runner-runtime-wrappers.md`.
- Image strategy: keep two image variants (`scramjetorg/runner` Node-only, `scramjetorg/runner-py` with Python deps). Outer `packages/runner` is the entrypoint in BOTH images. `runnerImages.python3` config + CLI flags survive (infrastructure-only per roadmap line 39).
- Executor abstraction: ADD a formal `RuntimeExecutor` interface in `packages/runner/src/executor/`; `selectExecutor(config)` reads `engines.python3`.
- Contract source of truth: SHARED TS TYPES + EXECUTABLE TESTS. `BootConfig` and `RuntimeExecutor` types live in `packages/types/src/runtime-executor.ts`. Python mirrors them as dataclasses; paired AVA + pytest contract tests prove validation parity.
- Python cleanup scope: CLEAN-SLATE rewrite (asyncio-first, type hints, dataclasses). Parity is bound by golden fixtures captured from the current `packages/python-runner` BEFORE refactoring.

### Metis Review (gaps addressed)
- Behavior-preserving refactor mandate: every preserved behavior has a paired old-vs-new fixture test before `packages/python-runner` is deleted.
- Protocol-level invariants pinned: CRLF framing on fd 4/5, channel ownership split, lifecycle ordering, 1s heartbeat cadence, control-code parity (SET/KILL/STOP/EVENT), boot-config-only bootstrap.
- Cutover safety: repo-wide reference scan (`rg @scramjet/python-runner`, `packages/python-runner`, `runner.py`, `__pypackages__`) gates the deletion task.
- Per-adapter QA: process / docker / kubernetes verified separately.
- Image-level QA: both image variants build, start, and expose the outer-runner entrypoint.
- Failure-path tests: missing boot file, malformed config, missing fd, dead child, early child exit, channel connect failure.
- Negative capability: Python path must NOT open REQUESTS / BPMux.

## Work Objectives

### Core Objective
After this plan executes, all sequence languages are launched by the same `packages/runner` executable; runtime selection happens inside the runner via `selectExecutor(config)`; `packages/runner-python` is the canonical Python wrapper invoked through the `RuntimeExecutor` protocol; `packages/python-runner` no longer exists; adapter packages contain zero `engines.python3` control-flow branches; host-visible behaviour for every preserved Python scenario is byte-for-byte (or semantically equivalent where natural Python output differs in formatting only) identical to the pre-refactor baseline.

### Deliverables
- `packages/types/src/runtime-executor.ts` - BootConfig + RuntimeExecutor + RuntimeKind canonical TS types.
- `packages/runner/src/executor/types.ts` - RuntimeExecutor interface (re-export or local refinement).
- `packages/runner/src/executor/select.ts` - `selectExecutor(config): RuntimeExecutor`.
- `packages/runner/src/executor/python-process-executor.ts` - Python-side spawn impl mirroring `process-executor.ts`.
- `packages/runner/src/executor/process-executor.ts` - refactored to implement the new interface (Node side).
- `packages/runner/src/bin/start-runner.ts` - calls `selectExecutor()` instead of direct `spawnRunnerNode`.
- `packages/runner-python/` - NEW package (pyproject.toml, requirements.txt, src/, tests/, Dockerfile-image-overlay or equivalent, README).
- `docs/architecture/runner-runtime-wrappers.md` - canonical wrapper contract doc.
- `packages/python-runner/` - DELETED at end of plan.
- `packages/adapter-process/`, `packages/adapter-docker/`, `packages/adapter-kubernetes/` - all `engines.python3` control-flow branches removed; `@scramjet/python-runner` dep removed.
- `packages/runner-python/Dockerfile` (or moved equivalent) - python image with outer runner as entrypoint.
- Updated `bdd/lib/host-utils.ts` for image-flag continuity.

### Definition of Done (verifiable conditions with commands)
- [ ] `git ls-files packages/python-runner` -> empty.
- [ ] `rg -n "@scramjet/python-runner"` -> only inside historical CHANGELOG/release notes if any; no code or package.json hits.
- [ ] `rg -n "if .*engines.python3" packages/adapter-process packages/adapter-docker packages/adapter-kubernetes packages/host` -> empty (telemetry-only `language` reads in `adapters-common/src/utils.ts` are allowed).
- [ ] `cd packages/runner && npx ava` -> all green, includes new executor-selection + python-process-executor tests.
- [ ] `cd packages/runner-node && npx ava` -> all green (regression check).
- [ ] `cd packages/runner-python && pytest` -> all green; coverage on boot, fds, channels, control codes, heartbeat, sequence loading, stop handlers.
- [ ] `cd packages/runner-python && pytest tests/parity/` -> all golden-fixture parity tests green.
- [ ] `yarn build:packages` -> success.
- [ ] `yarn lint` -> success.
- [ ] `yarn test:bdd-ci-sth-process-python` -> all green.
- [ ] `yarn test:bdd-ci-sth-docker-python` -> all green.
- [ ] `yarn test:bdd-ci-sth-process-unified-python` -> all green.
- [ ] `yarn test:bdd-ci-sth-docker-unified-python` -> all green.
- [ ] `yarn test:bdd --name="TC-021 Test Start sequence in python with startup-config"` -> green.
- [ ] `docker build -f packages/runner-python/Dockerfile -t scramjetorg/runner-py:dev .` -> success; container ENTRYPOINT executes `packages/runner` start-runner.
- [ ] `docs/architecture/runner-runtime-wrappers.md` exists and references canonical TS types.

### Must Have
- Shared TS canonical types for BootConfig and RuntimeExecutor in `packages/types/`.
- `selectExecutor(config)` is the single source of truth for runtime selection inside the runner.
- runner-python uses fd 0/1/2/4/5 for stdio + control + monitoring; opens IN/OUT/LOG directly to host via TCP using `instancesServerHost/Port` from boot config.
- runner-python reads zero runner-owned env vars; refuses to start if `sys.argv[1]` boot-config path is missing or invalid (runner-python uses `python3 -m runner_python <bootConfigPath>` spawn form).
- Heartbeat cadence: 1s monitoring frame, first frame after handshake, cancel on stop.
- Control code parity: `SET`, `KILL`, `STOP`, `EVENT` semantics preserved.
- Stdout/stderr ordering: bytes flush BEFORE terminal SEQUENCE_STOPPED on the host.
- Repo-wide reference scan gates the deletion of `packages/python-runner`.
- Both Docker images run `packages/runner` start-runner as ENTRYPOINT.

### Must NOT Have (guardrails, AI slop, scope boundaries)
- NO BPMux / REQUESTS channel for Python.
- NO env-var transport to runner-python (`SEQUENCE_PATH` / `SEQUENCE_INFO` / `RUNNER_CONNECT_INFO` not read in wrapper).
- NO new `RunnerMessageCode` values.
- NO host-facing protocol changes (channel numbers, frame codec).
- NO changes to `packages/runner/package.json` `main`.
- NO changes to adapter -> outer-runner env contract (`INSTANCES_SERVER_PORT/HOST`, `INSTANCE_ID` keep working).
- NO changes to `packages/runner-node/` runtime semantics (regression check only).
- NO RuntimeExecutor framework bloat. The `RuntimeExecutor` interface has exactly two members: `kind: RuntimeKind` and `spawn(opts: SpawnOptions): RuntimeProcessHandles`. Runtime selection is a free function `selectExecutor(config): RuntimeExecutor` in `packages/runner/src/executor/select.ts`. No `wireHandles`, no `cleanup`, no plugin registry, no other members.
- NO Python "improvements" beyond what's required for parity (clean slate is approved BUT tests are the binding constraint).
- NO docs sprawl - one architecture doc + JSDoc on the interface. (Roadmap status updates are out-of-scope manual operator actions, not plan tasks.)
- NO `runner-bun` implementation. Doc only states "how to add it".
- NO removing `runnerImages.python3` config key, `--runner-py-image`, `--k8s-runner-py-image` CLI flags. Image variant selection is infrastructure, not control flow.
- NO speculative cleanups in adapter code beyond removing the documented branches.
- NO changes to pre-runner / sequence packaging.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- **Test decision**: TDD (RED-GREEN-REFACTOR). Every implementation task starts with a failing test. Frameworks: AVA (`packages/runner`, `packages/runner-node`), pytest + pytest-asyncio (`packages/runner-python`), cucumber-js (`bdd/`).
- **QA policy**: Every task has agent-executed scenarios (happy + failure). No human-in-the-loop verification.
- **Evidence directory**: `.omo/evidence/task-{N}-{slug}.{ext}` (logs, transcripts, screenshots if BDD-UI).

### Invariant -> Harness Mapping (Metis-imposed)
| Invariant | Harness | Test location |
|-----------|---------|---------------|
| CRLF framing on fd 4/5 | AVA + pytest | `packages/runner/test/executor/python-process-executor-framing.spec.ts`, `packages/runner-python/tests/test_fd_framing.py` |
| Channel ownership (outer = stdio + fd4/5; wrapper = direct TCP IN/OUT/LOG; fd3 reserved) | AVA + pytest | `python-process-executor.spec.ts` (stdio array assertion), `tests/test_channel_ownership.py` (asserts no fd3 use; opens only IN/OUT/LOG) |
| stdout/stderr-before-SEQUENCE_STOPPED ordering | pytest + BDD | `tests/test_lifecycle_ordering.py`, `bdd/features/.../E2E-015-unified.feature` |
| 1s heartbeat cadence + cancellation on stop | pytest | `tests/test_heartbeat_cadence.py` |
| Control code parity (SET, KILL, STOP, EVENT) | pytest + paired parity fixture | `tests/test_control_codes.py`, `tests/parity/test_control_parity.py` |
| Boot-config-only bootstrap | pytest + AVA | `tests/test_no_env_leak.py` (assert os.environ blank for runner vars), `python-process-executor.spec.ts` (assert child env strips them) |
| No BPMux/REQUESTS for Python | AVA + pytest | `python-process-executor.spec.ts` (assert no REQUESTS channel opened by outer for python path), `tests/test_no_requests_channel.py` |
| Image variants run outer-runner entrypoint | Bash + BDD | `task-{N}-image-build.log`, `bdd/features/.../E2E-014-python.feature` |
| Adapter branch removal | ast-grep | static check command in DoD |
| python-runner deletion safety | ripgrep | static check command before deletion task |
| Cross-adapter parity | BDD | `test:bdd-ci-sth-process-python`, `-docker-python`, `-process-unified-python`, `-docker-unified-python` |

### Golden Fixture Strategy (Wave 1 mandatory)
Before any refactor: spawn current `@scramjet/python-runner` against fixture sequences and capture host-visible bytes. Replay against `runner-python` in Wave 3 final task. Byte-for-byte equality on stable bytes (output payloads, monitoring codes, lifecycle ordering); semantic equality on inherently variable bytes (timestamps, PIDs).

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. Wave-internal tasks are parallel; waves are sequential blockers.
> Tasks marked `[BLOCKING]` are mandatory gates within their wave.

- **Wave 1 - Foundation & Parity Capture** (parallel, no dependencies):
  - 1.1 Author shared TS types (`packages/types/src/runtime-executor.ts`)
  - 1.2 Author architecture doc skeleton
  - 1.3 [BLOCKING] Capture golden parity fixtures from current python-runner
  - 1.4 Add ast-grep static checks for forbidden patterns
  - 1.5 Scaffold `packages/runner-python/` package (pyproject + pytest infra + src skeleton)
  - 1.6 AVA RED test for `selectExecutor()` Node/Python branching
  - 1.7 AVA RED test for `python-process-executor.ts` stdio layout

- **Wave 2 - runner-python core (boot, fds, channels)** (parallel after Wave 1):
  - 2.1 pytest RED+GREEN: boot-config parser (sys.argv[1] -> dataclass)
  - 2.2 pytest RED+GREEN: fd-stream wiring (fd0/1/2 stdio, fd4 control reader, fd5 monitoring writer, fd3 closed)
  - 2.3 pytest RED+GREEN: direct host TCP IN/OUT/LOG channel opening
  - 2.4 pytest RED+GREEN: control frame codec (CRLF JSON-array decode)
  - 2.5 pytest RED+GREEN: monitoring frame codec (CRLF JSON-array encode)
  - 2.6 pytest RED+GREEN: ping/pong handshake + first healthy MONITORING frame

- **Wave 3 - runner-python sequence runtime (semantics + parity)** (parallel after Wave 2):
  - 3.1 pytest: sequence module loading (importlib + asyncio context + cwd)
  - 3.2 pytest: AppContext API (set_stop_handler, set_health_check, on, emit, keep_alive)
  - 3.3 pytest: input stream decoding (text/plain, application/octet-stream)
  - 3.4 pytest: output stream encoding (text/plain, application/x-ndjson, raw bytes)
  - 3.5 pytest: control codes SET / KILL / STOP / EVENT
  - 3.6 pytest: 1s heartbeat cadence + cancellation on stop
  - 3.7 pytest: stop handler timeout + canCallKeepalive parity
  - 3.8 [BLOCKING] pytest parity replay: golden fixtures from W1.3 against runner-python

- **Wave 4 - Outer-runner Python executor wiring** (parallel after Wave 3):
  - 4.1 Implement `python-process-executor.ts` (spawn `python3 -m runner-python <bootConfigPath>` with RUNNER_NODE_STDIO layout)
  - 4.2 Implement `selectExecutor()` reading `engines.python3` from sequence config
  - 4.3 Refactor `start-runner.ts` to call `selectExecutor()` instead of direct `spawnRunnerNode`
  - 4.4 AVA: outer runner forwards fd4/fd5 raw bytes to/from runner-python (no JSON transformation)
  - 4.5 AVA: child env STRIPS `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` from runner-python child env
  - 4.6 AVA: stdout-before-SEQUENCE_STOPPED ordering for Python sequence (throw-after-stdout fixture)

- **Wave 5 - Adapter branch removal** (parallel after Wave 4):
  - 5.1 Remove `engines.python3` branches in `process-instance-adapter.ts:89-126`; always spawn `packages/runner`; relocate `PYTHONPATH` injection into runner-python boot config
  - 5.2 Remove `@scramjet/python-runner` dep from `packages/adapter-process/package.json`
  - 5.3 Scope `engines.python3` to image-only selection in `docker-sequence-adapter.ts:262-264`; verify no other control-flow branches remain; update Python-related log message
  - 5.4 Remove `@scramjet/python-runner` dep from `packages/adapter-docker/package.json`
  - 5.5 Scope `engines.python3` to image-only selection in `kubernetes-instance-adapter.ts:192-194`; verify no other control-flow branches remain
  - 5.6 [BLOCKING] ast-grep verification: no `engines.python3` control-flow branches remain in adapters

- **Wave 6 - Image + CI** (parallel after Wave 5):
  - 6.1 Move + adapt `packages/python-runner/Dockerfile` -> `packages/runner-python/Dockerfile` with outer-runner ENTRYPOINT
  - 6.2 Adapt `Dockerfile-tf-gpu` equivalently
  - 6.3 Update boot scripts (`unpack.sh`, `wait-for-sequence-and-start.sh`, `docker-entrypoint.sh`)
  - 6.4 Update `.github/workflows/build-docker-runner-python.yml` for new Dockerfile path
  - 6.5 Update `bdd/lib/host-utils.ts` --runner-py-image flag continuity

- **Wave 7 - Cutover (deletion + lockfile)** (sequential):
  - 7.1 [BLOCKING] Repo-wide ripgrep: `@scramjet/python-runner`, `packages/python-runner`, `runner.py`, `__pypackages__`. Result must be empty (modulo intentional historic notes).
  - 7.2 Delete `packages/python-runner/` directory.
  - 7.3 Update root `package.json` workspaces if needed; refresh lockfile.

- **Wave 8 - BDD verification** (parallel after Wave 7):
  - 8.1 Run E2E-014-python.feature against runner-python (process adapter)
  - 8.2 Run E2E-014-python.feature (docker adapter)
  - 8.3 Run E2E-015-unified.feature for Python (process + docker)
  - 8.4 Run E2E-010-cli TC-021 Python startup-config

### Dependency Matrix
| Task | Blocks | Blocked By |
|------|--------|------------|
| 1.1 Shared TS types | 1.5, 1.6, 1.7, 2.1, 4.1, 4.2 | none |
| 1.2 Architecture doc | (advisory) | none |
| 1.3 Parity fixture capture | 3.8 | none |
| 1.4 ast-grep static checks | 5.6, 7.1 | none |
| 1.5 Package scaffold | 2.1-2.6, 3.1-3.8 | 1.1 |
| 1.6 AVA RED selectExecutor | 4.2 | 1.1 |
| 1.7 AVA RED python-process-executor | 4.1 | 1.1 |
| 2.1 boot-config parser | 2.6, 3.1 | 1.1, 1.5 |
| 2.2 fd-stream wiring | 2.4, 2.5, 4.4 | 1.5 |
| 2.3 host TCP IN/OUT/LOG | 2.6, 3.3, 3.4 | 1.5 |
| 2.4 control frame codec | 2.6, 3.5 | 2.2 |
| 2.5 monitoring frame codec | 2.6, 3.6 | 2.2 |
| 2.6 ping/pong handshake | 3.x, 4.6 | 2.1, 2.3, 2.4, 2.5 |
| 3.1-3.7 sequence runtime | 3.8 | 2.1-2.6 |
| 3.8 parity replay | 4.x, 7.1 | 1.3, 3.1-3.7 |
| 4.1 python-process-executor | 4.3, 4.4 | 1.7, 3.8 |
| 4.2 selectExecutor | 4.3 | 1.6 |
| 4.3 start-runner refactor | 4.4-4.6, 5.x | 4.1, 4.2 |
| 4.4-4.6 AVA verification | 5.x | 4.3 |
| 5.1-5.5 adapter branch removal | 5.6, 6.x | 4.3 |
| 5.6 ast-grep verify adapters | 7.1 | 5.1-5.5 |
| 6.1-6.5 image + CI | 7.1, 8.x | 5.6 |
| 7.1 reference scan | 7.2 | 5.6, 6.x |
| 7.2 delete python-runner | 7.3, 8.x | 7.1 |
| 7.3 lockfile update | 8.x | 7.2 |
| 8.1-8.4 BDD verification | F1-F4 | 7.3 |

### Agent Dispatch Summary
| Wave | Tasks | Categories used |
|------|-------|-----------------|
| 1 | 7 | ultrabrain, writing, artistry, deep, unspecified-high |
| 2 | 6 | ultrabrain, unspecified-high |
| 3 | 8 | unspecified-high, ultrabrain (3.5, 3.8) |
| 4 | 6 | ultrabrain, unspecified-high |
| 5 | 6 | unspecified-high, quick (5.2, 5.4) |
| 6 | 5 | unspecified-high, quick (6.5) |
| 7 | 3 | deep (7.1), quick (7.2, 7.3) |
| 8 | 4 | unspecified-high |
| 9 (final-verify) | 4 | oracle, unspecified-high, deep |

## TODOs

### Wave 1 - Foundation & Parity Capture

- [ ] 1. **`packages/types/src/runtime-executor.ts`: Author shared TS types for BootConfig + RuntimeExecutor + RuntimeKind - returns canonical interface usable by both Node executors and (mirrored to) Python wrapper**

  **What to do**:
  - Create `packages/types/src/runtime-executor.ts`.
  - Export `RuntimeKind = "node" | "python3"`.
  - Export `BootConfig` interface mirroring fields written today by `packages/runner/src/bin/start-runner.ts:99-127`: `sequencePath: string`, `instanceId: string`, `instancesServerPort: number`, `instancesServerHost: string`, `sequenceInfo: SequenceInfo`, optional `sequenceArgs?: any[]`, `appConfig?: object`, `instanceName?: string`, `logLevel?: string`, `exposePath?: string`, `exposeHost?: string`, `pythonPath?: string` (NEW - moved from process adapter).
  - Export `RuntimeExecutor` interface: `{ kind: RuntimeKind; spawn(opts: SpawnOptions): RuntimeProcessHandles }`.
  - Re-export `SpawnOptions = { runtimeEntry: string; bootConfigPath: string; nodeExecPath?: string; cwd?: string; env?: NodeJS.ProcessEnv }`.
  - Re-export `RuntimeProcessHandles` matching current `RunnerNodeProcessHandles` shape (`child`, `stdout`, `stderr`, `control`, `monitoring`).
  - Add `packages/types/src/index.ts` re-export.
  - Add JSDoc to every member of `RuntimeExecutor` referencing the architecture doc.

  **Must NOT do**: add fields not currently passed by `start-runner.ts`; introduce a `runtime` discriminated union beyond `RuntimeKind`; add validators here (Wave 2 owns validation).

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: type-system design with multi-package + cross-language implications.
  - Skills: none required.
  - Omitted: `git-master` (single-file create).

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 1.5, 1.6, 1.7, 2.1, 4.1, 4.2 | Blocked By: none

  **References**:
  - Pattern: `packages/runner-node/src/boot-config.ts:18-39` - existing BootConfig shape on the Node side.
  - Pattern: `packages/runner/src/bin/start-runner.ts:99-127` - canonical fields written today.
  - Pattern: `packages/runner/src/executor/process-executor.ts:18-39, 69-110` - existing `SpawnRunnerNodeOptions` and `RunnerNodeProcessHandles` types.
  - Pattern: `packages/types/src/runner-config.ts:8-54` - sibling types style.
  - Type: `packages/types/src/sequence-adapter.ts:5-13` - `SequenceInfo` to import.

  **Acceptance Criteria**:
  - [ ] `git ls-files packages/types/src/runtime-executor.ts` -> non-empty.
  - [ ] `cd packages/types && yarn build` -> success.
  - [ ] `rg -n "RuntimeExecutor" packages/types/src/index.ts` -> at least one match.
  - [ ] All BootConfig fields documented with JSDoc that names the source field in `start-runner.ts`.

  **QA Scenarios**:
  ```
  Scenario: Types compile cleanly with strict TS settings
    Tool: Bash
    Steps: cd packages/types && yarn build
    Expected: exit 0; no diagnostic output
    Evidence: .omo/evidence/task-1.1-build.log

  Scenario: Type re-export reachable from consumer
    Tool: Bash
    Steps: cd packages/types && node -e "console.log(Object.keys(require('./dist/runtime-executor')))"
    Expected: includes "RuntimeKind" (note: types-only members may not be runtime-visible; instead grep dist .d.ts)
    Evidence: .omo/evidence/task-1.1-export.log
  ```

  **Commit**: YES | `feat(types): add shared RuntimeExecutor and BootConfig types` | Files: `packages/types/src/runtime-executor.ts`, `packages/types/src/index.ts`

- [ ] 2. **`docs/architecture/runner-runtime-wrappers.md`: Author architecture doc skeleton documenting executor interface, fd layout, boot-config schema, channel ownership split, and "how to add runner-bun" - serves as canonical contract reference**

  **What to do**:
  - Create `docs/architecture/runner-runtime-wrappers.md`.
  - Sections (in this order):
    1. Overview - what `packages/runner` is post-013/014; one diagram (ASCII) of outer + wrapper relationship.
    2. RuntimeExecutor interface - link to `packages/types/src/runtime-executor.ts`; signature contract.
    3. fd layout - table: fd0 stdin, fd1 stdout, fd2 stderr, fd3 reserved IPC (unused), fd4 control passthrough, fd5 monitoring passthrough.
    4. Channel ownership - outer owns STDIN/STDOUT/STDERR/CONTROL/MONITORING; wrapper opens IN/OUT/LOG (Node also opens REQUESTS for BPMux); Python does NOT open REQUESTS.
    5. Boot-config protocol - JSON file path passed as last positional arg; index in child runtime: `process.argv[2]` for runner-node (spawned as `[entry, bootConfigPath]`), `sys.argv[1]` for runner-python (spawned as `["-m", "runner_python", bootConfigPath]`); schema = TS types in `packages/types/src/runtime-executor.ts`; validators = decoder on Node, dataclass+validator on Python; lifecycle = outer writes, child reads, child does not delete (outer cleans up on exit).
    6. Frame codec - control (fd4) and monitoring (fd5) carry CRLF-terminated JSON arrays `[code, payload]`.
    7. Adding a new runtime wrapper (e.g. runner-bun) - 6-step recipe: pick `RuntimeKind`, create `packages/runner-X`, implement `bootstrap(<argv-index appropriate to spawn form>)`, mirror BootConfig types, add `X-process-executor.ts` defining the exact spawn form + which argv index carries `bootConfigPath`, register in `selectExecutor`.
  - End with cross-links to `docs/roadmap/013-feature-request-runner-worker-isolation.md` and `docs/roadmap/014-feature-request-python-runner-wrapper.md`.

  **Must NOT do**: write content for unimplemented wrappers (`runner-bun` example must be a recipe, not source code); document host-side protocol (out of scope); duplicate content from `.omo/plans/runner-worker-isolation.md`.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: technical writing with structured cross-links.
  - Skills: none required.
  - Omitted: `git-master` (single doc creation).

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: (advisory only - Wave 9 F1 reads it) | Blocked By: none

  **References**:
  - Pattern: `.omo/plans/runner-worker-isolation.md:30-92` - architectural narrative style.
  - Pattern: `docs/roadmap/013-feature-request-runner-worker-isolation.md:33-49` - executor interface narrative.
  - Pattern: `docs/roadmap/014-feature-request-python-runner-wrapper.md:31-43` - wrapper contract narrative.
  - Type: `packages/types/src/runtime-executor.ts` (created in T1.1) - canonical TS source.
  - Pattern: `packages/runner/src/executor/process-executor.ts:18` - RUNNER_NODE_STDIO array (cite as fd-layout source).

  **Acceptance Criteria**:
  - [ ] `git ls-files docs/architecture/runner-runtime-wrappers.md` -> non-empty.
  - [ ] Doc cites `packages/types/src/runtime-executor.ts` as canonical schema source.
  - [ ] Doc contains at least one ASCII diagram.
  - [ ] Doc has all 7 sections enumerated above.
  - [ ] Doc cross-links 013 and 014 roadmap files.

  **QA Scenarios**:
  ```
  Scenario: Doc renders without broken internal links
    Tool: Bash
    Steps: rg -n "\]\(([^)]+)\)" docs/architecture/runner-runtime-wrappers.md | grep -v "https" | while read line; do echo "$line"; done
    Expected: all referenced relative paths exist (manual cross-check via ls)
    Evidence: .omo/evidence/task-1.2-links.log

  Scenario: Required sections present
    Tool: Bash
    Steps: rg -n "^## " docs/architecture/runner-runtime-wrappers.md
    Expected: 7 H2 headings matching the section list
    Evidence: .omo/evidence/task-1.2-sections.log
  ```

  **Commit**: YES | `docs(architecture): add runner-runtime-wrappers contract doc` | Files: `docs/architecture/runner-runtime-wrappers.md`

- [ ] 3. **[BLOCKING] `packages/runner-python/tests/parity/fixtures/`: Capture golden parity fixtures from current `packages/python-runner` - records host-visible bytes for every preserved Python behaviour BEFORE the rewrite, used as the binding equivalence target**

  **What to do**:
  - Create `packages/runner-python/tests/parity/fixtures/` with one subdir per scenario.
  - Build a small Python runner harness that: (a) starts the current `packages/python-runner/runner.py` against a fixture sequence, (b) acts as a fake host (TCP server on each CommunicationChannel), (c) records all bytes received on each channel + all bytes sent on each channel + relative timestamps, into `<scenario>/recorded.json`.
  - Scenarios to capture (from `bdd/features/e2e/E2E-014-python.feature` + invariants):
    - `happy-path`: sequence yields strings; verify OUT bytes + monitoring frames + lifecycle order.
    - `throw-after-stdout`: sequence prints to stdout then raises; verify stdout precedes SEQUENCE_STOPPED.
    - `text-input`: sequence echoes text/plain input lines; verify line splitting.
    - `binary-input`: sequence echoes application/octet-stream; verify no decoding.
    - `ndjson-output`: sequence yields dicts; verify NDJSON serialization.
    - `health-override`: sequence overrides health check; verify monitoring payload includes custom health.
    - `topic-rename`: provides/requires + topic; verify PANG payload.
    - `async-generator`: sequence is async generator; verify chunked output.
    - `stop-handler`: sequence registers stop handler; verify STOP -> handler -> SEQUENCE_STOPPED.
    - `event-emit-receive`: sequence emits + receives event; verify EVENT frames.
    - `control-set`: host sends SET; verify behaviour.
    - `control-kill`: host sends KILL; verify lifecycle.
    - `heartbeat-cadence`: long-running sequence; verify monitoring frames at ~1s intervals.
  - Emit `recorded.json` with strict schema: `{ scenario, channels: {<name>: [{direction, bytes_b64, ts_ms_relative}]}, exit_code, stable_byte_mask }`.
  - The `stable_byte_mask` lists byte ranges that are deterministic (output payloads, codes) vs variable (timestamps, PIDs). Used by replay tests in T3.8.
  - Commit fixtures under git; `recorded.json` files are checked-in artifacts.

  **Must NOT do**: modify `packages/python-runner` source; capture fixtures with debug logging enabled (must reflect production behaviour); include any system-specific paths in fixture data.

  **Recommended Agent Profile**:
  - Category: `artistry` - Reason: requires creative test harness design (fake host server, byte capture, deterministic masking).
  - Skills: none required.
  - Omitted: `git-master`, `playwright`.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3.8 | Blocked By: none

  **References**:
  - Pattern: `packages/python-runner/runner.py` - current runner; do NOT modify.
  - Pattern: `packages/python-runner/hardcoded_magic_values.py` - `CommunicationChannels` enum + `RunnerMessageCodes` enum (target frames to record).
  - Pattern: `bdd/features/e2e/E2E-014-python.feature:1-68` - scenario list inspiration.
  - Pattern: `bdd/features/e2e/E2E-015-unified.feature:1-81` - additional scenarios.
  - External: `https://docs.python.org/3/library/asyncio-stream.html` - useful for harness async TCP server.

  **Acceptance Criteria**:
  - [ ] `ls packages/runner-python/tests/parity/fixtures/` -> at least 13 scenario directories.
  - [ ] Each scenario dir contains `sequence/` (Python source), `recorded.json` (golden bytes), and `expected_summary.md` (one-line description + assertions list).
  - [ ] Schema validation: `jq 'keys' packages/runner-python/tests/parity/fixtures/happy-path/recorded.json` returns `["channels","exit_code","scenario","stable_byte_mask"]`.
  - [ ] Re-running the capture script twice yields byte-identical output on the `stable_byte_mask` ranges.

  **QA Scenarios**:
  ```
  Scenario: All 13 scenarios captured with non-empty recordings
    Tool: Bash
    Steps: for d in packages/runner-python/tests/parity/fixtures/*/; do test -s "$d/recorded.json" || echo "MISSING $d"; done
    Expected: empty output (no MISSING)
    Evidence: .omo/evidence/task-1.3-coverage.log

  Scenario: Determinism - capture is reproducible on stable bytes
    Tool: Bash
    Steps: rerun capture script for happy-path; diff stable byte ranges
    Expected: zero diff on stable bytes; variable bytes (timestamps/PIDs) flagged in stable_byte_mask
    Evidence: .omo/evidence/task-1.3-determinism.log
  ```

  **Commit**: YES | `test(runner-python): capture golden parity fixtures from python-runner` | Files: `packages/runner-python/tests/parity/fixtures/**`, capture script under `packages/runner-python/tests/parity/capture.py`

- [ ] 4. **`scripts/check-runtime-wrapper-invariants.sh`: Add ast-grep + ripgrep static checks for forbidden runtime-wrapper patterns - guards against regression of decisions captured in this plan**

  **What to do**:
  - Create `scripts/check-runtime-wrapper-invariants.sh`.
  - Implement these guards (script exits non-zero on any violation, prints offending paths):
    1. No `engines.python3` control-flow branches in adapter packages: `ast-grep -p '"python3" in $E' --lang ts packages/adapter-process packages/adapter-docker packages/adapter-kubernetes` and `ast-grep -p '$E.python3' ...` filtered to non-telemetry contexts. (Use ripgrep + line context to allow `language: detectLanguage(...)` and `runnerImages.python3` reads.)
    2. No env-var reads of `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` in `packages/runner-python/src/`: `rg -n 'os\.environ.*(SEQUENCE_PATH|SEQUENCE_INFO|RUNNER_CONNECT_INFO)' packages/runner-python/src` -> empty.
    3. No BPMux import in `packages/runner-python/`: `rg -n 'bpmux' packages/runner-python` -> empty.
    4. No REQUESTS channel open in `packages/runner-python/`: `rg -in 'REQUESTS' packages/runner-python/src` -> empty.
    5. No `@scramjet/python-runner` references outside `CHANGELOG`/`docs/roadmap/`: `rg -l '@scramjet/python-runner'` filtered.
    6. No `process.stdout =` or `redirectOutputs` regression in runner: `rg -n 'process\.stdout\s*=' packages/runner/src` -> empty.
  - Add an npm script in root `package.json`: `"check:runtime-invariants": "bash scripts/check-runtime-wrapper-invariants.sh"`.
  - Wire into `yarn lint` chain (or run as separate CI step).

  **Must NOT do**: rewrite source files; introduce eslint plugins (overkill for 6 guards); modify CI workflows here (that's T6.4).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: shell + static analysis tooling; non-trivial filtering.
  - Skills: none required.
  - Omitted: all skills.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 33 (W5.6 ast-grep verify), 39 (W7.1 reference scan) | Blocked By: none

  **References**:
  - Pattern: `.omo/plans/runner-worker-isolation.md:208-214` - example static-check command set.
  - Pattern: `packages/adapters-common/src/utils.ts:16-23` - the ALLOWED `engines.python3` reference (telemetry-only); guard must whitelist this.
  - Pattern: `packages/runner-node/src/utils.ts:20-22` - canonical channel set; allowed REQUESTS reference (NOT in runner-python).

  **Acceptance Criteria**:
  - [ ] `git ls-files scripts/check-runtime-wrapper-invariants.sh` -> non-empty.
  - [ ] `bash scripts/check-runtime-wrapper-invariants.sh` exits 0 on a clean post-refactor tree (run after Wave 7).
  - [ ] Each guard outputs a clear "GUARD <name>: PASS|FAIL" line.
  - [ ] Script is idempotent and side-effect-free (read-only).

  **QA Scenarios**:
  ```
  Scenario: Script catches a planted violation
    Tool: Bash
    Steps: echo 'if ("python3" in engines) { /* test */ }' >> packages/adapter-process/src/process-instance-adapter.ts; bash scripts/check-runtime-wrapper-invariants.sh; rev=$?; git checkout packages/adapter-process/src/process-instance-adapter.ts
    Expected: rev != 0 (script detects violation); after revert, script passes.
    Evidence: .omo/evidence/task-4-violation-detection.log

  Scenario: Script tolerates whitelisted occurrences
    Tool: Bash
    Steps: bash scripts/check-runtime-wrapper-invariants.sh on the current tree (with adapters-common/utils.ts:16-23 present)
    Expected: exit 0
    Evidence: .omo/evidence/task-4-whitelist.log
  ```

  **Commit**: YES | `chore(runner): add ast-grep static checks for forbidden runtime-wrapper patterns` | Files: `scripts/check-runtime-wrapper-invariants.sh`, `package.json`

- [ ] 5. **`packages/runner-python/`: Scaffold new package - pyproject.toml + requirements.txt + src skeleton + pytest infra - so subsequent Wave-2/3 tasks can land idiomatic Python with TDD**

  **What to do**:
  - Create `packages/runner-python/` with this structure:
    - `pyproject.toml` (build-system: setuptools; project name `scramjet-runner-python`; version 1.1.0; python_requires `>=3.9`).
    - `requirements.txt`: `pyee==9.0.4`, `scramjet-framework-py` (preserve current python-runner deps).
    - `requirements-dev.txt`: `pytest>=7`, `pytest-asyncio>=0.21`, `pytest-timeout`.
    - `src/runner_python/__init__.py` (empty for now).
    - `src/runner_python/__main__.py` (placeholder: `raise NotImplementedError("filled in by Wave 2 task 8")`).
    - `tests/conftest.py` (pytest plugins: `pytest-asyncio` mode `auto`).
    - `tests/test_smoke.py` (single test asserting package importable).
    - `package.json` (yarn workspace member; name `@scramjet/runner-python`; no `main` since this is a Python package; scripts `install:deps: pip install -r requirements.txt -r requirements-dev.txt --target __pypackages__`, `test: pytest`, `build: pip install -r requirements.txt --target dist/__pypackages__`, `clean`).
    - `README.md` (one paragraph: this is the Python runtime wrapper for `packages/runner`; do not invoke directly).
  - Add `packages/runner-python` to root `yarn` workspaces if not pattern-matched.
  - Run `yarn install` from repo root to refresh `node_modules` symlinks.

  **Must NOT do**: import any code from `packages/python-runner` yet (clean-slate per user decision; copying happens never - only behaviour parity); set up CI here (Wave 6); add Python source beyond placeholders.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multi-file scaffold with packaging concerns.
  - Skills: none required.
  - Omitted: all skills.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 9, 10, 11, 12, 13, 14-21 | Blocked By: 1 (needs RuntimeKind type for cross-language reference)

  **References**:
  - Pattern: `packages/python-runner/package.json:1-15` - existing yarn-workspace + Python package shape.
  - Pattern: `packages/python-runner/requirements.txt` - dep versions to mirror.
  - Pattern: `packages/runner-node/package.json:1-50` - yarn workspace conventions.
  - External: `https://docs.pytest.org/en/stable/getting-started.html` - pytest scaffolding.

  **Acceptance Criteria**:
  - [ ] `git ls-files packages/runner-python/` shows pyproject.toml, requirements.txt, requirements-dev.txt, src/runner_python/__init__.py, src/runner_python/__main__.py, tests/conftest.py, tests/test_smoke.py, package.json, README.md.
  - [ ] `cd packages/runner-python && yarn install:deps` succeeds.
  - [ ] `cd packages/runner-python && pytest tests/test_smoke.py` -> 1 passed.
  - [ ] `yarn workspaces list` includes `@scramjet/runner-python`.

  **QA Scenarios**:
  ```
  Scenario: Smoke test passes from clean install
    Tool: Bash
    Steps: cd packages/runner-python && rm -rf __pypackages__ && yarn install:deps && pytest tests/test_smoke.py -v
    Expected: 1 passed in <2s
    Evidence: .omo/evidence/task-5-smoke.log

  Scenario: Workspace integration
    Tool: Bash
    Steps: yarn workspaces list 2>&1 | rg "runner-python"
    Expected: includes @scramjet/runner-python entry
    Evidence: .omo/evidence/task-5-workspace.log
  ```

  **Commit**: YES | `feat(runner-python): scaffold package with pytest infra` | Files: `packages/runner-python/**`, root `package.json` if workspaces glob updated

- [ ] 6. **`packages/runner/test/executor/select-executor.spec.ts`: AVA RED test for `selectExecutor()` Node/Python branching - locks the runtime-selection contract before implementation**

  **What to do**:
  - Create `packages/runner/test/executor/select-executor.spec.ts`.
  - Import (yet-to-be-created) `selectExecutor` from `packages/runner/src/executor/select.ts`.
  - Assert behaviours (all should FAIL until T23 lands):
    - `selectExecutor({ engines: { node: ">=16" } })` returns an object with `kind === "node"`.
    - `selectExecutor({ engines: { python3: "3.9" } })` returns an object with `kind === "python3"`.
    - `selectExecutor({ engines: {} })` defaults to `kind === "node"` (preserve current "no engines = node" behaviour).
    - `selectExecutor({ engines: { python3: "3.9", node: ">=16" } })` returns `kind === "python3"` (Python wins because it's the more specific runtime).
    - returned executor has a `spawn` method (`typeof e.spawn === "function"`).
  - Run AVA on the file; commit the failing test (RED).

  **Must NOT do**: implement `selectExecutor` here (Wave 4); test the spawn behaviour (T28 covers); use mocks beyond test config inputs.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small test file, one import, 5 assertions.
  - Skills: none required.
  - Omitted: all skills.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 23 | Blocked By: 1 (RuntimeKind type)

  **References**:
  - Pattern: `packages/runner-node/test/scaffold.spec.ts:1-25` - tiny AVA test style.
  - Pattern: `packages/runner/test/executor/process-executor.spec.ts:1-30` - executor test style.
  - Pattern: `packages/adapters-common/src/utils.ts:16-23` - reference behaviour for engine detection.
  - Type: `packages/types/src/runtime-executor.ts` (T1) - `RuntimeKind` import.

  **Acceptance Criteria**:
  - [ ] File exists at `packages/runner/test/executor/select-executor.spec.ts`.
  - [ ] `cd packages/runner && npx ava test/executor/select-executor.spec.ts` -> tests FAIL with "Cannot find module" or assertion errors (RED).
  - [ ] After T23 lands, the same command -> all PASS (verified in T23 acceptance).

  **QA Scenarios**:
  ```
  Scenario: Test file is in RED state initially
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/select-executor.spec.ts 2>&1 || echo "FAILED-AS-EXPECTED"
    Expected: stdout contains "FAILED-AS-EXPECTED"
    Evidence: .omo/evidence/task-6-red.log

  Scenario: All 5 assertions present
    Tool: Bash
    Steps: rg -c "test\(" packages/runner/test/executor/select-executor.spec.ts
    Expected: 5
    Evidence: .omo/evidence/task-6-coverage.log
  ```

  **Commit**: YES | `test(runner): RED tests for selectExecutor branching` | Files: `packages/runner/test/executor/select-executor.spec.ts`

- [ ] 7. **`packages/runner/test/executor/python-process-executor.spec.ts`: AVA RED test for `python-process-executor.ts` stdio layout + spawn semantics - locks the Python spawn contract before implementation**

  **What to do**:
  - Create `packages/runner/test/executor/python-process-executor.spec.ts`.
  - Import (yet-to-be-created) `spawnRunnerPython` and `RUNNER_PYTHON_STDIO` from `packages/runner/src/executor/python-process-executor.ts`.
  - Assert behaviours (all should FAIL until T22 lands):
    - `RUNNER_PYTHON_STDIO` deep-equals `["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]` (mirrors RUNNER_NODE_STDIO).
    - `spawnRunnerPython({ runtimeEntry: "/dev/null/missing-fixture-script.py", bootConfigPath: "/dev/null/missing-boot.json" })` returns a child that exits non-zero within 5s (fixture script does not exist; Python reports import error). Test the failure mode via child exit code, not by expecting `spawnRunnerPython` itself to throw.
    - returned `RuntimeProcessHandles` shape: `child`, `stdout`, `stderr`, `control`, `monitoring` (all defined).
    - child env STRIPS `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` from inherited env. Test: set them in the parent (test process) env, spawn via the TEST `runtimeEntry` override pointing to `test/fixtures/python/printenv.py` (writes `os.environ` keys to stdout); read child stdout; assert keys are absent from child env.
    - boot-config path delivery to Python child: observable as `sys.argv[1]` inside the child. Test method: use the TEST-only `runtimeEntry` override on `spawnRunnerPython` to spawn a Python fixture script (e.g. `test/fixtures/python/argv_printer.py` containing `import sys; print(sys.argv[1])` then `sys.exit(0)`). Assert printed path matches `opts.bootConfigPath`. NOTE: production path uses `-m runner_python` form (also yields path at `sys.argv[1]` - the invariant is index `1` regardless of spawn form). This differs from runner-node where the path is at `process.argv[2]`.
    - NO REQUESTS channel is opened by the outer runner on the Python path - assert via a recording fake host that only STDIN/STDOUT/STDERR/CONTROL/MONITORING channel codes appear during spawn; REQUESTS code does NOT.
    - fd3 is reserved IPC and never written to from the parent side - assert by inspecting `child.stdio[3]` is the IPC channel (not a pipe handle the parent writes to).
  - Run AVA on the file; commit the failing test (RED).

  **Must NOT do**: implement the executor (Wave 4); replicate AVA tests already present for `process-executor.spec.ts` (this is the Python sibling).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: 5 assertions including env stripping + argv passing; needs careful fixture design.
  - Skills: none required.
  - Omitted: all skills.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 22 | Blocked By: 1 (types)

  **References**:
  - Pattern: `packages/runner/test/executor/process-executor.spec.ts` - sibling test (Node side).
  - Pattern: `packages/runner/src/executor/process-executor.ts:18-39, 69-110` - layout + spawn signature to mirror.
  - Pattern: `packages/runner/src/bin/start-runner.ts:184-201` - parent stdio wiring (informs the handles shape).

  **Acceptance Criteria**:
  - [ ] File exists at `packages/runner/test/executor/python-process-executor.spec.ts`.
  - [ ] `cd packages/runner && npx ava test/executor/python-process-executor.spec.ts` -> tests FAIL (RED).
  - [ ] At least 6 `test(...)` blocks present (count: `rg -c "test\(" packages/runner/test/executor/python-process-executor.spec.ts` >= 6).
  - [ ] At least one test asserts env stripping; at least one asserts boot-config path delivery as Python child `sys.argv[1]`.
  - [ ] At least one test asserts NO REQUESTS channel opened by outer runner on Python path: `rg -n "REQUESTS" packages/runner/test/executor/python-process-executor.spec.ts` >= 1 occurrence in a `t.false(...)` / `t.is(..., undefined)` assertion context.
  - [ ] At least one test asserts fd3 is IPC and not written to from parent.

  **QA Scenarios**:
  ```
  Scenario: Test file is in RED state initially
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/python-process-executor.spec.ts 2>&1 || echo "FAILED-AS-EXPECTED"
    Expected: stdout contains "FAILED-AS-EXPECTED"
    Evidence: .omo/evidence/task-7-red.log

  Scenario: env-stripping assertion present
    Tool: Bash
    Steps: rg -n "SEQUENCE_PATH|SEQUENCE_INFO|RUNNER_CONNECT_INFO" packages/runner/test/executor/python-process-executor.spec.ts
    Expected: at least 3 matches
    Evidence: .omo/evidence/task-7-env-strip.log
  ```

  **Commit**: YES | `test(runner): RED tests for python-process-executor stdio + spawn contract` | Files: `packages/runner/test/executor/python-process-executor.spec.ts`

### Wave 2 - runner-python core (boot, fds, channels)

- [ ] 8. **`packages/runner-python/src/runner_python/boot_config.py`: TDD pytest+impl for boot-config parser - reads `sys.argv[1]` -> JSON file -> validated dataclass; refuses to start if file missing/malformed/missing required fields. Note: runner-python is spawned via `python3 -m runner_python <bootConfigPath>`, so the path is at `sys.argv[1]` (NOT `sys.argv[2]`)**

  **What to do**:
  - RED: write `tests/test_boot_config.py` covering: valid file -> dataclass; missing `sys.argv[1]` (only argv[0] present) -> SystemExit code 2; missing file -> SystemExit code 2; malformed JSON -> SystemExit code 2; missing required field (`sequencePath`, `instanceId`, `instancesServerPort`, `instancesServerHost`, `sequenceInfo`) -> ValidationError; optional fields default correctly (`sequenceArgs=[]`, `appConfig={}`, etc.).
  - GREEN: implement `BootConfig` dataclass + `load_boot_config(argv: list[str]) -> BootConfig` in `src/runner_python/boot_config.py`. Field set MUST mirror TS types in `packages/types/src/runtime-executor.ts` exactly. Validation = explicit per-field type checks (no third-party validators).
  - Add a parity contract test: `tests/parity/test_boot_config_parity.py` reading the same JSON file the Node side validates; assert acceptance/rejection matches.

  **Must NOT do**: read any field NOT defined in TS BootConfig; consume env-var fallbacks; load anything async here (synchronous boot only).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: TDD pair touches typing + validation + parity.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13, 14 | Blocked By: 1, 5

  **References**:
  - Pattern: `packages/runner-node/src/boot-config.ts:18-39, 47-58, 146-168` - Node-side validator behaviour to mirror.
  - Type: `packages/types/src/runtime-executor.ts` (T1) - canonical schema.
  - Pattern: `packages/python-runner/runner.py` - current env-var-driven boot (DO NOT mirror; replace).

  **Acceptance Criteria**:
  - [ ] `cd packages/runner-python && pytest tests/test_boot_config.py -v` -> all green.
  - [ ] `pytest tests/parity/test_boot_config_parity.py` -> all green.
  - [ ] `rg -n "os\.environ" packages/runner-python/src/runner_python/boot_config.py` -> empty.
  - [ ] `BootConfig` dataclass field set exactly matches TS `BootConfig` (verified by parity test).

  **QA Scenarios**:
  ```
  Scenario: Happy path - valid JSON
    Tool: Bash
    Steps: write fixture JSON to tmp; cd packages/runner-python && python -c "import sys; from runner_python.boot_config import load_boot_config; print(load_boot_config(['runner', '/tmp/boot.json']))"
    Expected: prints BootConfig(...) with all fields populated
    Evidence: .omo/evidence/task-8-happy.log

  Scenario: Failure - missing sys.argv[1]
    Tool: Bash
    Steps: python -c "from runner_python.boot_config import load_boot_config; load_boot_config(['runner_main'])"
    Expected: SystemExit code 2 with message "boot config path required"
    Evidence: .omo/evidence/task-8-no-argv.log

  Scenario: Failure - malformed JSON
    Tool: Bash
    Steps: echo "not-json" > /tmp/bad.json; python -c "from runner_python.boot_config import load_boot_config; load_boot_config(['runner', '/tmp/bad.json'])"
    Expected: SystemExit code 2 with message containing "JSON"
    Evidence: .omo/evidence/task-8-bad-json.log
  ```

  **Commit**: YES | `feat(runner-python): boot-config dataclass + validator` | Files: `packages/runner-python/src/runner_python/boot_config.py`, `packages/runner-python/tests/test_boot_config.py`, `packages/runner-python/tests/parity/test_boot_config_parity.py`

- [ ] 9. **`packages/runner-python/src/runner_python/fd_streams.py`: TDD pytest+impl for fd wiring - opens fd0 stdin, fd1 stdout, fd2 stderr, fd4 control reader, fd5 monitoring writer; explicitly does NOT touch fd3**

  **What to do**:
  - RED: `tests/test_fd_streams.py` covering: `open_fd_streams()` returns object with `stdin`, `stdout`, `stderr`, `control_in`, `monitoring_out`; `control_in` is non-blocking readable; `monitoring_out` is writable; fd3 is NEVER opened (verify by `os.fstat(3)` raising or returning the closed/inherited IPC fd untouched); writes to `monitoring_out` flush immediately (no buffering of frames).
  - GREEN: implement `src/runner_python/fd_streams.py` using `os.fdopen(4, "rb", buffering=0)` for control_in and `os.fdopen(5, "wb", buffering=0)` for monitoring_out. Wrap with line-oriented helpers preserving CRLF semantics (control_in.readline_crlf(), monitoring_out.write_frame(bytes)).
  - Add unit test for partial-frame buffering on fd4 (sender writes one frame in 3 chunks; reader assembles correctly).

  **Must NOT do**: replace parent process stdio; use asyncio for fd 4/5 here (raw blocking IO is fine for the framing layer; asyncio happens in T13/T14); read fd3.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: low-level IO with framing semantics + non-trivial fd handling.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11, 12 | Blocked By: 5

  **References**:
  - Pattern: `packages/runner-node/src/fd-streams.ts:5-17, 44-54` - Node-side fd contract to mirror.
  - Pattern: `packages/runner/src/executor/process-executor.ts:18` - RUNNER_NODE_STDIO array.
  - Pattern: `packages/python-runner/runner.py` (current) - reference for CRLF framing semantics.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_fd_streams.py` -> all green including partial-frame test.
  - [ ] `rg -n "fd[ _]*=[ ]*3|fd 3|os\.fdopen\(3" packages/runner-python/src/runner_python/fd_streams.py` -> empty (fd3 untouched).
  - [ ] `monitoring_out.write_frame()` test confirms no buffering: a write is immediately observable on the receiver side.

  **QA Scenarios**:
  ```
  Scenario: fd3 is never opened
    Tool: Bash
    Steps: pytest tests/test_fd_streams.py::test_fd3_untouched -v
    Expected: PASSED
    Evidence: .omo/evidence/task-9-fd3.log

  Scenario: Partial frame assembly
    Tool: Bash
    Steps: pytest tests/test_fd_streams.py::test_partial_frame_assembly -v
    Expected: PASSED; reader receives full frame after 3-chunk send
    Evidence: .omo/evidence/task-9-partial.log
  ```

  **Commit**: YES | `feat(runner-python): fd stream wiring with CRLF framing` | Files: `packages/runner-python/src/runner_python/fd_streams.py`, `packages/runner-python/tests/test_fd_streams.py`

- [ ] 10. **`packages/runner-python/src/runner_python/host_channels.py`: TDD pytest+impl for direct host TCP connection to IN/OUT/LOG channels - opens 3 sockets to `instancesServerHost:instancesServerPort` using boot-config metadata; sends `instance_id + channel_code` handshake**

  **What to do**:
  - RED: `tests/test_host_channels.py` covering: `connect_host_channels(boot_config)` opens 3 TCP sockets (one each for IN, OUT, LOG); each socket sends `<instance_id>\n<channel_code>` as ASCII handshake; failure to connect raises `HostChannelConnectError` (named exception); REQUESTS channel is NEVER opened (no 4th socket).
  - GREEN: implement `src/runner_python/host_channels.py`. Use `socket.create_connection((host, port), timeout=5)`. Channel codes from a new `src/runner_python/channel_codes.py` mirroring `packages/python-runner/hardcoded_magic_values.py:CommunicationChannels` for the 3 channels we keep (IN, OUT, LOG).
  - Add a fake host server in `tests/conftest.py` (asyncio TCP server fixture) that records received handshakes per channel.
  - Test: `connect_host_channels(...)` against fake server -> 3 connections established with correct handshake bytes.
  - Test: REQUESTS attempt would fail; assert no socket opens for REQUESTS code.

  **Must NOT do**: open BPMux on REQUESTS; reuse `packages/python-runner/runner.py` connection code; use synchronous blocking sockets in production code (asyncio for IO; sync only in tests where simpler).

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: networking + asyncio + fixture design.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11, 16, 17 | Blocked By: 5

  **References**:
  - Pattern: `packages/python-runner/runner.py` - current TCP-per-channel logic (handshake format).
  - Pattern: `packages/python-runner/hardcoded_magic_values.py` - `CommunicationChannels` enum.
  - Pattern: `packages/runner-node/src/utils.ts:20-22` - canonical channel set on Node side (`{IN, OUT, LOG, REQUESTS}`); Python omits REQUESTS.
  - Type: `BootConfig` from T8.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_host_channels.py` -> all green.
  - [ ] `rg -in "REQUESTS|bpmux" packages/runner-python/src/runner_python/host_channels.py packages/runner-python/src/runner_python/channel_codes.py` -> empty.
  - [ ] Fake-host fixture confirms 3 connections in IN/OUT/LOG order with correct handshake bytes.

  **QA Scenarios**:
  ```
  Scenario: Three channels connect with correct handshake
    Tool: Bash
    Steps: pytest tests/test_host_channels.py::test_three_channels_handshake -v
    Expected: PASSED; recorded handshakes match instance_id + channel_code per channel
    Evidence: .omo/evidence/task-10-handshake.log

  Scenario: No REQUESTS / no BPMux
    Tool: Bash
    Steps: pytest tests/test_host_channels.py::test_no_requests_channel -v
    Expected: PASSED; only 3 sockets opened
    Evidence: .omo/evidence/task-10-no-requests.log
  ```

  **Commit**: YES | `feat(runner-python): host channel TCP wiring (IN/OUT/LOG only)` | Files: `packages/runner-python/src/runner_python/host_channels.py`, `packages/runner-python/src/runner_python/channel_codes.py`, `packages/runner-python/tests/test_host_channels.py`, `packages/runner-python/tests/conftest.py`

- [ ] 11. **`packages/runner-python/src/runner_python/control_codec.py`: TDD pytest+impl for control frame codec - decodes CRLF-terminated JSON arrays `[code, payload]` from fd4; handles partial frames, malformed JSON tolerantly**

  **What to do**:
  - RED: `tests/test_control_codec.py` covering: single complete frame decoded correctly; multiple frames in one buffer split correctly; partial frame (no CRLF yet) yields no output; malformed JSON skipped with structured warning logged (not raised); empty payload accepted (`[code, null]`); unknown code passed through as `(code, payload)` tuple.
  - GREEN: implement `decode_control_frames(buffer: bytes) -> Iterator[tuple[int, Any]]` and `ControlFrameDecoder` class state machine. Use `\r\n` as the strict frame delimiter to match Node `stream-handler.ts`.
  - Add parity test: take `packages/python-runner/runner.py`'s send_encoded_msg framing and confirm decoder accepts it byte-for-byte.

  **Must NOT do**: emit on partial frames; use buffer split() patterns that misbehave on multi-chunk reads; introduce a JSON streaming dep (use stdlib `json`).

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: state machine + framing edge cases + parity.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13, 18 | Blocked By: 9

  **References**:
  - Pattern: `packages/model/src/messages-utils.ts` - Node serializer `[code, payload]`.
  - Pattern: `packages/model/src/stream-handler.ts` - Node JSON framing.
  - Pattern: `packages/python-runner/runner.py:send_encoded_msg` - current Python framing format.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_control_codec.py` -> all green incl. partial-frame, multi-frame, malformed.
  - [ ] Parity test with Node-emitted bytes (canned fixture) decodes identically.

  **QA Scenarios**:
  ```
  Scenario: Multi-frame buffer split
    Tool: Bash
    Steps: pytest tests/test_control_codec.py::test_multiple_frames_in_one_buffer -v
    Expected: PASSED; yields exactly N frames in order
    Evidence: .omo/evidence/task-11-multi-frame.log

  Scenario: Tolerates malformed without crashing
    Tool: Bash
    Steps: pytest tests/test_control_codec.py::test_malformed_skipped -v
    Expected: PASSED; warning logged; subsequent valid frame still decoded
    Evidence: .omo/evidence/task-11-malformed.log
  ```

  **Commit**: YES | `feat(runner-python): control frame CRLF JSON decoder` | Files: `packages/runner-python/src/runner_python/control_codec.py`, `packages/runner-python/tests/test_control_codec.py`

- [ ] 12. **`packages/runner-python/src/runner_python/monitoring_codec.py`: TDD pytest+impl for monitoring frame encoder - serializes `[code, payload]` to CRLF-terminated JSON arrays for fd5; flushes immediately**

  **What to do**:
  - RED: `tests/test_monitoring_codec.py` covering: single frame encoded as `b'[<code>,<payload>]\\r\\n'`; payload with non-ASCII unicode preserved (utf-8); rapid sequential writes preserve order; flush after each write (no buffering aggregation).
  - GREEN: implement `encode_monitoring_frame(code: int, payload: Any) -> bytes` and `MonitoringWriter` class wrapping `monitoring_out` from T9.
  - Parity test: encode same `(code, payload)` pairs and confirm bytes match what `packages/model/src/messages-utils.ts:serializeMessage` produces (canned fixture).

  **Must NOT do**: aggregate frames; use a JSON streaming lib; rely on python's default JSON whitespace (must match Node's `JSON.stringify` byte-for-byte for stable bytes - use `json.dumps(payload, separators=(',', ':'))`).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: encoder + parity test against canned Node bytes.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13, 19 | Blocked By: 9

  **References**:
  - Pattern: `packages/model/src/messages-utils.ts:serializeMessage` - canonical Node encoding.
  - Pattern: `packages/python-runner/runner.py:send_encoded_msg` - current python encoder.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_monitoring_codec.py` -> green.
  - [ ] Parity bytes match Node-emitted bytes for `[PING, {"id":"x"}]`, `[MONITORING, {"healthy":true}]`, `[PANG, {"provides":"x","requires":"y"}]`.
  - [ ] Flush behaviour confirmed: write -> immediate read on receiver side (no >1ms delay in test fixture).

  **QA Scenarios**:
  ```
  Scenario: Byte parity with Node serializer
    Tool: Bash
    Steps: pytest tests/test_monitoring_codec.py::test_node_byte_parity -v
    Expected: PASSED for PING, MONITORING, PANG
    Evidence: .omo/evidence/task-12-parity.log

  Scenario: Order preserved under burst
    Tool: Bash
    Steps: pytest tests/test_monitoring_codec.py::test_burst_order -v
    Expected: PASSED; 100 frames in order
    Evidence: .omo/evidence/task-12-burst.log
  ```

  **Commit**: YES | `feat(runner-python): monitoring frame CRLF JSON encoder` | Files: `packages/runner-python/src/runner_python/monitoring_codec.py`, `packages/runner-python/tests/test_monitoring_codec.py`

- [ ] 13. **`packages/runner-python/src/runner_python/handshake.py`: TDD pytest+impl for ping/pong handshake - sends initial PING on monitoring (fd5) with payload from boot-config, awaits PONG on control (fd4), then sends first healthy MONITORING frame**

  **What to do**:
  - RED: `tests/test_handshake.py` covering: handshake sends PING with `{instanceId, sequenceInfo, system: {processPID}}`; PONG normalizes appConfig/args/logLevel from response; first MONITORING frame emitted only after PONG received; handshake timeout (5s) raises `HandshakeTimeoutError`; malformed PONG rejected with structured error.
  - GREEN: implement `async def perform_handshake(monitoring_writer, control_decoder, boot_config) -> HandshakeResult` returning normalized appConfig/args/logLevel. Use asyncio.
  - Parity test: replay golden fixture from T3 (handshake bytes from current python-runner) and assert handshake module produces equivalent PING bytes.

  **Must NOT do**: rely on TCP for handshake (it's now fd-based); add new RunnerMessageCode values; emit MONITORING before PONG.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: async handshake + parity + timeout semantics.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 14-21 | Blocked By: 8, 10, 11, 12

  **References**:
  - Pattern: `packages/runner-node/src/handshake.ts:5-25` - Node ping payload shape.
  - Pattern: `packages/runner-node/src/bin/runner-node.ts:93-175` - Node handshake sequence.
  - Pattern: `packages/python-runner/runner.py:handshake()` - current Python handshake (now relocated from TCP to fd).
  - Type: `BootConfig` from T8.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_handshake.py` -> green incl. timeout test.
  - [ ] PING bytes match captured golden fixture's PING bytes (modulo PID variability).
  - [ ] First MONITORING frame timing is AFTER PONG (verified by event log).

  **QA Scenarios**:
  ```
  Scenario: Handshake completes with valid PONG
    Tool: Bash
    Steps: pytest tests/test_handshake.py::test_handshake_happy_path -v
    Expected: PASSED; HandshakeResult contains normalized appConfig/args
    Evidence: .omo/evidence/task-13-happy.log

  Scenario: Handshake timeout
    Tool: Bash
    Steps: pytest tests/test_handshake.py::test_handshake_timeout -v
    Expected: PASSED; HandshakeTimeoutError raised after 5s
    Evidence: .omo/evidence/task-13-timeout.log
  ```

  **Commit**: YES | `feat(runner-python): ping/pong handshake on fd5/fd4` | Files: `packages/runner-python/src/runner_python/handshake.py`, `packages/runner-python/tests/test_handshake.py`

### Wave 3 - runner-python sequence runtime (semantics + parity)

- [ ] 14. **`packages/runner-python/src/runner_python/sequence_loader.py`: TDD pytest+impl for sequence module loading - importlib.util loads from `sequencePath`, sets cwd, exposes `run(context, input_stream, *args)` callable**

  **What to do**:
  - RED: `tests/test_sequence_loader.py` covering: loader imports module from absolute file path; loader sets `os.chdir(sequenceDir)` before invocation; loader resolves `run` callable (function or coroutine); loader handles missing `run` with structured error; loader handles ImportError with structured error preserving original traceback; PYTHONPATH augmentation from `boot_config.pythonPath` is applied (sys.path prepend).
  - GREEN: implement `load_sequence(boot_config: BootConfig) -> SequenceModule`. Use `importlib.util.spec_from_file_location("sequence", path)`. Restore previous cwd on cleanup.

  **Must NOT do**: invoke `run()` here (separate task); execute arbitrary __init__ side effects in tests (use isolated fixture sequences); leak sys.path entries beyond the module lifetime.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: importlib correctness + cwd discipline.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 8, 13

  **References**:
  - Pattern: `packages/python-runner/runner.py` - current loader (`importlib.util.spec_from_file_location`).
  - Pattern: `packages/runner-node/src/run-sequence.ts` - Node sequence loader (semantic reference only).
  - Type: `BootConfig.sequencePath`, `BootConfig.pythonPath` from T1, T8.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_sequence_loader.py` -> green.
  - [ ] cwd restored after test cleanup (no test leaks).
  - [ ] Missing `run` callable raises `SequenceLoadError("missing run callable")`.

  **QA Scenarios**:
  ```
  Scenario: Loads run() from fixture sequence
    Tool: Bash
    Steps: pytest tests/test_sequence_loader.py::test_loads_run_callable -v
    Expected: PASSED
    Evidence: .omo/evidence/task-14-load.log

  Scenario: Handles missing run gracefully
    Tool: Bash
    Steps: pytest tests/test_sequence_loader.py::test_missing_run -v
    Expected: PASSED; SequenceLoadError with clear message
    Evidence: .omo/evidence/task-14-missing.log
  ```

  **Commit**: YES | `feat(runner-python): sequence loader with cwd + PYTHONPATH discipline` | Files: `packages/runner-python/src/runner_python/sequence_loader.py`, `packages/runner-python/tests/test_sequence_loader.py`

- [ ] 15. **`packages/runner-python/src/runner_python/app_context.py`: TDD pytest+impl for `AppContext` - exposes `set_stop_handler`, `set_health_check`, `on`, `emit`, `keep_alive`; mirrors current python-runner AppContext semantics**

  **What to do**:
  - RED: `tests/test_app_context.py` covering: `set_stop_handler(handler)` registers; `set_health_check(callable)` overrides default; `on(event, handler)` registers + multi-handler ordering; `emit(event, data)` invokes handlers in registration order; `keep_alive(timeout_ms)` resets stop timer; default health = `{healthy: True}`.
  - GREEN: implement `AppContext` class. Use `pyee` for event registry (preserve current python-runner dep choice). Stop-handler invocation timing returns a coroutine ack.

  **Must NOT do**: implement BPMux clients (`hub`/`space` are Node-only via REQUESTS); implement `localStorage` (not in scope for first Python wrapper - Node-only feature today); change event-name conventions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: event registry + stop handler timing.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 20, 21 | Blocked By: 13

  **References**:
  - Pattern: `packages/python-runner/runner.py` - current AppContext methods (preserve API).
  - Pattern: `packages/runner-node/src/context.ts` - Node AppContext (semantic reference; not API parity).

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_app_context.py` -> green.
  - [ ] `set_stop_handler` registers + `keep_alive(ms)` modifies stop timeout (verified by mock clock).
  - [ ] Public API exactly matches current python-runner AppContext (verified by sequence-API parity test in T21).

  **QA Scenarios**:
  ```
  Scenario: Multi-handler emit order
    Tool: Bash
    Steps: pytest tests/test_app_context.py::test_emit_order -v
    Expected: handlers invoked in registration order
    Evidence: .omo/evidence/task-15-emit.log

  Scenario: keep_alive defers stop
    Tool: Bash
    Steps: pytest tests/test_app_context.py::test_keep_alive -v
    Expected: stop timer reset by keep_alive
    Evidence: .omo/evidence/task-15-keepalive.log
  ```

  **Commit**: YES | `feat(runner-python): AppContext with stop/event/health APIs` | Files: `packages/runner-python/src/runner_python/app_context.py`, `packages/runner-python/tests/test_app_context.py`

- [ ] 16. **`packages/runner-python/src/runner_python/input_stream.py`: TDD pytest+impl for input stream decoding - `text/plain` -> line-split utf-8 strings; `application/octet-stream` -> raw bytes; content-type comes from sequence `requires.contentType`**

  **What to do**:
  - RED: `tests/test_input_stream.py` covering: text/plain -> async iterator yielding str per `\n`; application/octet-stream -> async iterator yielding bytes per chunk; UTF-8 multi-byte split across chunks reassembled correctly; backpressure honoured (no unbounded buffering).
  - GREEN: implement `make_input_stream(socket, content_type)` returning an async iterator.

  **Must NOT do**: decode binary as text; aggregate text chunks into a single string; bypass `requires.contentType`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: async streams + UTF-8 boundary handling.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 10, 13

  **References**:
  - Pattern: `packages/python-runner/runner.py:connect_input_stream` - current decoder logic.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_input_stream.py` -> green incl. UTF-8 multi-byte boundary test.
  - [ ] application/octet-stream test asserts NO line-splitting.

  **QA Scenarios**:
  ```
  Scenario: text/plain line-split
    Tool: Bash
    Steps: pytest tests/test_input_stream.py::test_text_plain_lines -v
    Expected: PASSED; yields one str per line, no trailing newline
    Evidence: .omo/evidence/task-16-text.log

  Scenario: octet-stream raw bytes
    Tool: Bash
    Steps: pytest tests/test_input_stream.py::test_octet_stream_raw -v
    Expected: PASSED; yields raw bytes per chunk, no decoding
    Evidence: .omo/evidence/task-16-binary.log
  ```

  **Commit**: YES | `feat(runner-python): input stream decoder (text + binary)` | Files: `packages/runner-python/src/runner_python/input_stream.py`, `packages/runner-python/tests/test_input_stream.py`

- [ ] 17. **`packages/runner-python/src/runner_python/output_stream.py`: TDD pytest+impl for output stream encoding - `text/plain` -> utf-8 encode; `application/x-ndjson` -> JSON line per item; default raw bytes; emits PANG metadata first**

  **What to do**:
  - RED: `tests/test_output_stream.py` covering: text/plain encodes str -> utf-8 bytes + newline; ndjson encodes dict -> json.dumps + `\n`; raw bytes pass through unchanged; PANG payload `{provides, requires, contentType}` emitted on monitoring before first output chunk; mixed types raise structured error per content-type.
  - GREEN: implement `forward_output_stream(seq_iter, output_socket, monitoring_writer, sequence_provides, sequence_requires)`.

  **Must NOT do**: emit PANG more than once per stream; auto-detect content type (must come from sequence module attrs).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: encoder + PANG ordering + content negotiation.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 10, 12, 13

  **References**:
  - Pattern: `packages/python-runner/runner.py:forward_output_stream` - current encoder.
  - Pattern: `packages/python-runner/runner.py` PANG emission timing.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_output_stream.py` -> green.
  - [ ] PANG-before-first-chunk ordering verified.
  - [ ] ndjson encoding matches `json.dumps(item, separators=(',', ':'))` byte-for-byte (Node parity).

  **QA Scenarios**:
  ```
  Scenario: PANG ordering
    Tool: Bash
    Steps: pytest tests/test_output_stream.py::test_pang_before_chunk -v
    Expected: PASSED; recorded events show PANG monitoring frame before first OUT byte
    Evidence: .omo/evidence/task-17-pang.log

  Scenario: ndjson encoding
    Tool: Bash
    Steps: pytest tests/test_output_stream.py::test_ndjson_encoding -v
    Expected: PASSED; emitted bytes match expected utf-8 JSON-line format
    Evidence: .omo/evidence/task-17-ndjson.log
  ```

  **Commit**: YES | `feat(runner-python): output stream encoder + PANG emission` | Files: `packages/runner-python/src/runner_python/output_stream.py`, `packages/runner-python/tests/test_output_stream.py`

- [ ] 18. **`packages/runner-python/src/runner_python/control_loop.py`: TDD pytest+impl for control codes SET / KILL / STOP / EVENT - reads control frames, dispatches to AppContext or terminator; ignores unknown codes with structured warning**

  **What to do**:
  - RED: `tests/test_control_codes.py` covering: SET -> updates app config; KILL -> raises `HardKillSignal` immediately (no graceful shutdown); STOP -> invokes registered stop handlers with `{timeout, canCallKeepalive}` payload, allows keepAlive within timeout; EVENT -> dispatches via `app_context.emit()`; unknown code -> structured warning logged, no crash.
  - GREEN: implement `async def control_loop(control_decoder, app_context, terminator)`.
  - Add a parity fixture test: replay control frames from golden fixture (T3 KILL/STOP/EVENT scenarios) and assert observable side-effects match.

  **Must NOT do**: ack control frames over fd4 (fd4 is read-only on the wrapper side; acks go via monitoring fd5 if needed); add new control codes; change STOP timeout default.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: control-loop semantics + parity + timeout coordination.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 11, 15

  **References**:
  - Pattern: `packages/python-runner/runner.py:control_loop / handle_*` - current control handling.
  - Pattern: `packages/runner-node/src/lifecycle.ts` - Node-side control handling (semantic reference).

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_control_codes.py` -> green for all 4 codes + unknown.
  - [ ] STOP timeout + keepAlive parity test green.
  - [ ] Parity replay test against fixtures matches recorded behaviour.

  **QA Scenarios**:
  ```
  Scenario: STOP with keepalive
    Tool: Bash
    Steps: pytest tests/test_control_codes.py::test_stop_keepalive -v
    Expected: PASSED; handler called; keepAlive defers SEQUENCE_STOPPED
    Evidence: .omo/evidence/task-18-stop.log

  Scenario: KILL is immediate
    Tool: Bash
    Steps: pytest tests/test_control_codes.py::test_kill_immediate -v
    Expected: PASSED; HardKillSignal observed within 100ms
    Evidence: .omo/evidence/task-18-kill.log

  Scenario: Unknown code tolerated
    Tool: Bash
    Steps: pytest tests/test_control_codes.py::test_unknown_code_warning -v
    Expected: PASSED; warning in log; loop still alive
    Evidence: .omo/evidence/task-18-unknown.log
  ```

  **Commit**: YES | `feat(runner-python): control loop SET/KILL/STOP/EVENT` | Files: `packages/runner-python/src/runner_python/control_loop.py`, `packages/runner-python/tests/test_control_codes.py`

- [ ] 19. **`packages/runner-python/src/runner_python/heartbeat.py`: TDD pytest+impl for 1s monitoring heartbeat - emits MONITORING frame every 1s after handshake; cancels on stop**

  **What to do**:
  - RED: `tests/test_heartbeat.py` covering: first heartbeat at ~1s after handshake (verified with mock clock, ±100ms tolerance); steady 1s cadence over 5 frames; cancellation on stop signal within 200ms; payload `{healthy: <result of health_check>, ...}` matches current python-runner format.
  - GREEN: implement `async def run_heartbeat(monitoring_writer, app_context, interval=1.0)`. Use `asyncio.sleep` + cancellation token.

  **Must NOT do**: change default 1s interval; emit before handshake (T13 owns startup ordering); aggregate multiple heartbeats.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: timing + cancellation + monitoring payload.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 12, 13, 15

  **References**:
  - Pattern: `packages/python-runner/runner.py:setup_heartbeat` - current 1s heartbeat.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_heartbeat.py` -> green incl. cadence + cancellation tests.
  - [ ] Cadence test asserts 5 frames over 5s with <100ms drift per frame.

  **QA Scenarios**:
  ```
  Scenario: 1s steady cadence
    Tool: Bash
    Steps: pytest tests/test_heartbeat.py::test_steady_cadence -v
    Expected: PASSED; 5 frames within 5.5s
    Evidence: .omo/evidence/task-19-cadence.log

  Scenario: Cancellation on stop
    Tool: Bash
    Steps: pytest tests/test_heartbeat.py::test_cancel_on_stop -v
    Expected: PASSED; no further frames after stop signal
    Evidence: .omo/evidence/task-19-cancel.log
  ```

  **Commit**: YES | `feat(runner-python): 1s monitoring heartbeat with cancellation` | Files: `packages/runner-python/src/runner_python/heartbeat.py`, `packages/runner-python/tests/test_heartbeat.py`

- [ ] 20. **`packages/runner-python/src/runner_python/lifecycle.py`: TDD pytest+impl for stop handler timeout + canCallKeepalive parity - mirrors current python-runner stop semantics: STOP delivers `{timeout, canCallKeepalive}`, handlers run, keepAlive permitted within timeout, then SEQUENCE_STOPPED**

  **What to do**:
  - RED: `tests/test_lifecycle.py` covering: STOP payload `{timeout: 5000, canCallKeepalive: true}` reaches handler unchanged; handler can call `context.keep_alive(N)` within timeout to defer SEQUENCE_STOPPED; without keepAlive, SEQUENCE_STOPPED emitted at timeout; with keepAlive, SEQUENCE_STOPPED emitted at new deadline; multiple stop handlers all run before SEQUENCE_STOPPED; sequence stdout/stderr written DURING stop is forwarded BEFORE SEQUENCE_STOPPED frame (lifecycle ordering invariant).
  - GREEN: implement `async def perform_shutdown(app_context, monitoring_writer, stop_payload)`.
  - Parity replay against T3 fixture for `stop-handler` scenario.

  **Must NOT do**: kill handlers if they exceed timeout (let them complete; emit SEQUENCE_STOPPED + a warning frame); change SEQUENCE_STOPPED payload shape.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: lifecycle ordering + timeout coordination + parity replay.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 21 | Blocked By: 15, 18

  **References**:
  - Pattern: `packages/python-runner/runner.py:handle_stop` - current STOP semantics.
  - Pattern: `packages/runner-node/test/lifecycle-parity.spec.ts` - Node parity reference.

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_lifecycle.py` -> green incl. ordering + keepAlive tests.
  - [ ] Parity replay matches recorded fixture lifecycle ordering.

  **QA Scenarios**:
  ```
  Scenario: stdout-before-SEQUENCE_STOPPED ordering
    Tool: Bash
    Steps: pytest tests/test_lifecycle.py::test_stdout_before_stopped -v
    Expected: PASSED; recorded host bytes show stdout chunks precede SEQUENCE_STOPPED frame
    Evidence: .omo/evidence/task-20-ordering.log

  Scenario: keepAlive defers SEQUENCE_STOPPED
    Tool: Bash
    Steps: pytest tests/test_lifecycle.py::test_keepalive_defers -v
    Expected: PASSED; SEQUENCE_STOPPED emitted at new (deferred) deadline
    Evidence: .omo/evidence/task-20-keepalive.log
  ```

  **Commit**: YES | `feat(runner-python): shutdown lifecycle with keepAlive + ordering` | Files: `packages/runner-python/src/runner_python/lifecycle.py`, `packages/runner-python/tests/test_lifecycle.py`

- [ ] 21. **`packages/runner-python/src/runner_python/__main__.py` + `tests/parity/test_golden_replay.py`: BLOCKING parity replay - integrates all Wave-2/3 modules into bootstrap entry; replays every golden fixture from T3 against `runner-python` and asserts byte equivalence on stable bytes**

  **What to do**:
  - GREEN: implement `__main__.py` boot sequence:
    1. `boot_config = load_boot_config(sys.argv)` (T8)
    2. `streams = open_fd_streams()` (T9)
    3. `channels = await connect_host_channels(boot_config)` (T10)
    4. `result = await perform_handshake(streams.monitoring_out, streams.control_in, boot_config)` (T13)
    5. `sequence = load_sequence(boot_config)` (T14)
    6. `app_context = AppContext(channels)` (T15)
    7. start `asyncio.gather(control_loop, run_heartbeat, run_sequence)` (T18, T19)
    8. on stop: `perform_shutdown(...)` (T20)
    9. exit codes: 0 normal, 1 sequence error, 2 boot error, 137 KILL.
  - Write `tests/parity/test_golden_replay.py`: for each fixture in `tests/parity/fixtures/<scenario>/`, spin up runner-python with that scenario's sequence + a recorded fake host, capture host-visible bytes, compare against `recorded.json` byte-for-byte on the `stable_byte_mask` ranges.
  - Parity pass criterion: ALL 13 fixtures from T3 replay equivalently. Failure = task incomplete.

  **Must NOT do**: skip any fixture as "flaky"; relax stable_byte_mask to make tests pass; substitute Node-emitted bytes for the golden truth (golden = current python-runner output).

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: integration entry-point + parity discipline + 13-scenario replay.
  - Skills: none.

  **Parallelization**: Can Parallel: NO (BLOCKING for Wave 4) | Wave 3 | Blocks: 22 | Blocked By: 3, 8-20

  **References**:
  - Pattern: `packages/runner-node/src/bin/runner-node.ts:64-273` - Node bootstrap structure.
  - Pattern: `packages/python-runner/runner.py` - current bootstrap (semantic reference, not API).
  - Fixtures: `packages/runner-python/tests/parity/fixtures/**` (T3).

  **Acceptance Criteria**:
  - [ ] `cd packages/runner-python && pytest tests/parity/test_golden_replay.py -v` -> 13/13 PASSED.
  - [ ] Each scenario produces a `.omo/evidence/task-21-<scenario>-replay.log` showing byte diff = 0 on stable bytes.
  - [ ] `python -m runner_python /tmp/valid-boot.json` runs a fixture sequence end-to-end without traceback.

  **QA Scenarios**:
  ```
  Scenario: All 13 golden fixtures replay byte-equivalently
    Tool: Bash
    Steps: cd packages/runner-python && pytest tests/parity/test_golden_replay.py -v
    Expected: 13 passed
    Evidence: .omo/evidence/task-21-all.log

  Scenario: throw-after-stdout ordering preserved
    Tool: Bash
    Steps: pytest tests/parity/test_golden_replay.py::test_throw_after_stdout -v
    Expected: PASSED; stdout bytes precede SEQUENCE_STOPPED frame in recording
    Evidence: .omo/evidence/task-21-throw-after-stdout.log

  Scenario: heartbeat-cadence parity within ±100ms drift
    Tool: Bash
    Steps: pytest tests/parity/test_golden_replay.py::test_heartbeat_cadence -v
    Expected: PASSED
    Evidence: .omo/evidence/task-21-heartbeat.log
  ```

  **Commit**: YES | `feat(runner-python): bootstrap entry + golden parity replay (13/13)` | Files: `packages/runner-python/src/runner_python/__main__.py`, `packages/runner-python/tests/parity/test_golden_replay.py`

### Wave 4 - Outer-runner Python executor wiring

- [ ] 22. **`packages/runner/src/executor/python-process-executor.ts`: GREEN implementation of Python spawn - mirrors `process-executor.ts` shape; spawns `python3 -m runner_python <bootConfigPath>`; uses RUNNER_NODE_STDIO; STRIPS env vars; returns RuntimeProcessHandles**

  **What to do**:
  - Create `packages/runner/src/executor/python-process-executor.ts`.
  - Export `RUNNER_PYTHON_STDIO` (deep-equal to `RUNNER_NODE_STDIO`).
  - Export `spawnRunnerPython(opts: SpawnOptions): RuntimeProcessHandles`. Internally:
    - resolve python3 binary from `process.env.PYTHON_BIN || "python3"`.
    - construct argv DETERMINISTICALLY:
      - PRODUCTION default (when `opts.runtimeEntry` is empty/undefined): `["-m", "runner_python", opts.bootConfigPath]`. Inside the Python child, `python3 -m runner_python <bootConfigPath>` sets `sys.argv = ["<path-to-runner_python/__main__.py>", "<bootConfigPath>"]`. Boot-config path at `sys.argv[1]`.
      - TEST override (when `opts.runtimeEntry` is a non-empty string): `[opts.runtimeEntry, opts.bootConfigPath]`. Inside the child, `python3 <runtimeEntry> <bootConfigPath>` sets `sys.argv = ["<runtimeEntry>", "<bootConfigPath>"]`. Boot-config path STILL at `sys.argv[1]` (both spawn forms yield the same index in the child - this is the invariant we test).
      - `opts.runtimeEntry` is documented in JSDoc as "TEST-ONLY override path to a Python entry script; leave undefined for production". This is the testability hook T7, T25, T26 rely on.
    - construct child env: copy parent env, then DELETE `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` (strip), then merge `opts.env` overrides.
    - call `child_process.spawn(python3, argv, { stdio: RUNNER_PYTHON_STDIO, env: childEnv, cwd: opts.cwd })`.
    - return handles with `child`, `stdout` (fd1), `stderr` (fd2), `control` (fd4 stream), `monitoring` (fd5 stream).
  - Implement the `RuntimeExecutor` interface from `packages/types/src/runtime-executor.ts` (T1) with `kind: "python3"` and `spawn` bound to the function above.
  - Verify against T7 RED tests; tests should now PASS.

  **Must NOT do**: pass `SEQUENCE_PATH`/`SEQUENCE_INFO`/`RUNNER_CONNECT_INFO` to the child env (must be stripped); add a `runner-python-launcher.ts` mirroring `runner-node-launcher.ts` (Python entry resolution is `python3 -m runner_python`, no dist-vs-src dance).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: spawn implementation + env stripping + RuntimeExecutor adoption.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 24, 25 | Blocked By: 7, 21

  **References**:
  - Pattern: `packages/runner/src/executor/process-executor.ts:18-39, 69-110` - Node sibling.
  - Pattern: `packages/runner/src/executor/runner-node-launcher.ts:54-76` - resolution style (we omit it for Python).
  - Type: `packages/types/src/runtime-executor.ts` (T1).

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava test/executor/python-process-executor.spec.ts` -> all PASS (T7 RED -> GREEN), including the no-REQUESTS and fd3-IPC assertions added in T7.
  - [ ] `wc -l packages/runner/src/executor/python-process-executor.ts` -> <120.
  - [ ] env stripping confirmed by T7 test: `cd packages/runner && SEQUENCE_PATH=/x SEQUENCE_INFO='{}' RUNNER_CONNECT_INFO='{}' npx ava test/executor/python-process-executor.spec.ts -m "*env strip*"` -> PASS.
  - [ ] `rg -n "REQUESTS|bpmux" packages/runner/src/executor/python-process-executor.ts` -> empty (Python path never references REQUESTS).
  - [ ] `rg -n "argv" packages/runner/src/executor/python-process-executor.ts | rg "'-m', 'runner_python'"` -> at least one match (deterministic argv structure).

  **QA Scenarios**:
  ```
  Scenario: T7 RED -> GREEN
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/python-process-executor.spec.ts
    Expected: all tests pass
    Evidence: .omo/evidence/task-22-green.log

  Scenario: env vars stripped
    Tool: Bash
    Steps: SEQUENCE_PATH=/test/path npx ava test/executor/python-process-executor.spec.ts -m "*env strip*"
    Expected: PASSED
    Evidence: .omo/evidence/task-22-env-strip.log
  ```

  **Commit**: YES | `feat(runner): python-process-executor with env stripping` | Files: `packages/runner/src/executor/python-process-executor.ts`

- [ ] 23. **`packages/runner/src/executor/select.ts`: GREEN implementation of `selectExecutor(config)` - reads `engines.python3` and returns the matching RuntimeExecutor instance**

  **What to do**:
  - Create `packages/runner/src/executor/select.ts`.
  - Export `selectExecutor(config: { engines?: Record<string, string> }): RuntimeExecutor`.
  - Logic:
    - if `config.engines?.python3` -> return Python executor (instance backed by `spawnRunnerPython` from T22).
    - else -> return Node executor (instance backed by `spawnRunnerNode` from `process-executor.ts`).
  - Refactor `packages/runner/src/executor/process-executor.ts` to ALSO export a default `nodeExecutor: RuntimeExecutor` instance (without breaking existing `spawnRunnerNode` named export).
  - Verify against T6 RED tests; tests should now PASS.

  **Must NOT do**: introduce a registry/plugin loader for executors (just a switch on `engines`); remove existing `spawnRunnerNode` export (compat for existing callers).

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small file, branch + return.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 24 | Blocked By: 6, 22

  **References**:
  - Pattern: `packages/adapters-common/src/utils.ts:16-23` - `engines.python3` detection idiom (read-only reference).
  - Type: `packages/types/src/runtime-executor.ts` (T1).
  - Pattern: `packages/runner/src/executor/process-executor.ts` - existing exports to preserve.

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava test/executor/select-executor.spec.ts` -> all PASS (T6 RED -> GREEN).
  - [ ] `packages/runner/src/executor/process-executor.ts` still exports `spawnRunnerNode` (no breakage).
  - [ ] Existing `cd packages/runner && npx ava` other suites still pass (regression).

  **QA Scenarios**:
  ```
  Scenario: T6 RED -> GREEN
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/select-executor.spec.ts
    Expected: all tests pass
    Evidence: .omo/evidence/task-23-green.log

  Scenario: No regression
    Tool: Bash
    Steps: cd packages/runner && npx ava
    Expected: all suites green
    Evidence: .omo/evidence/task-23-regression.log
  ```

  **Commit**: YES | `feat(runner): selectExecutor branching on engines.python3` | Files: `packages/runner/src/executor/select.ts`, `packages/runner/src/executor/process-executor.ts`

- [ ] 24. **`packages/runner/src/bin/start-runner.ts`: Refactor to call `selectExecutor()` instead of direct `spawnRunnerNode` - outer runner now language-agnostic**

  **What to do**:
  - Edit `packages/runner/src/bin/start-runner.ts`.
  - At the spawn site (lines 149-176 today), replace `resolveRunnerNodeEntry(__dirname)` + `spawnRunnerNode(...)` with `selectExecutor(sequenceConfig).spawn({ runtimeEntry: <resolved>, bootConfigPath, env: childEnv })`.
  - For Node path: `runtimeEntry = resolveRunnerNodeEntry(__dirname).entry` (preserve behaviour).
  - For Python path: `runtimeEntry = ""` (empty string). The Python executor builds its own argv as `["-m", "runner_python", bootConfigPath]` in T22 and ignores `runtimeEntry`.
  - Read `sequenceConfig` from the existing boot data (already constructed from env in current start-runner.ts).
  - Preserve all other behaviour: pipe wiring fd0/1/2/4/5, lifecycle handling, exit-code mapping.

  **Must NOT do**: change adapter env contract (`INSTANCES_SERVER_PORT`, `INSTANCES_SERVER_HOST`, `INSTANCE_ID`); change boot-config writing path; change `packages/runner/package.json` `main`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: critical-path file; one wrong branch breaks Node sequences.
  - Skills: none.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 25, 26, 27, 28-33 | Blocked By: 22, 23

  **References**:
  - Pattern: `packages/runner/src/bin/start-runner.ts:99-201` - current spawn flow.
  - Pattern: `packages/runner/src/executor/runner-node-launcher.ts:54-76` - Node entry resolution (still used).

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava` -> all green (Node regression preserved).
  - [ ] `cd packages/runner-node && npx ava` -> all green (no breakage of inner runtime).
  - [ ] `rg -n "spawnRunnerNode\(" packages/runner/src/bin/start-runner.ts` -> empty (call site replaced).
  - [ ] `rg -n "selectExecutor\(" packages/runner/src/bin/start-runner.ts` -> exactly 1 match.

  **QA Scenarios**:
  ```
  Scenario: Node sequence still launches via outer runner
    Tool: Bash
    Steps: cd packages/runner && npx ava test/transport/split-runner-communication-runtime.spec.ts
    Expected: all tests pass (Node path unchanged)
    Evidence: .omo/evidence/task-24-node-regression.log

  Scenario: Python sequence launches via outer runner (smoke)
    Tool: Bash
    Steps: write minimal Python sequence fixture; INSTANCE_ID=test SEQUENCE_PATH=/tmp/seq INSTANCES_SERVER_PORT=0 INSTANCES_SERVER_HOST=127.0.0.1 SEQUENCE_INFO='{}' RUNNER_CONNECT_INFO='{}' yarn start; observe runner-python child spawned
    Expected: child process matches "python3 -m runner_python"
    Evidence: .omo/evidence/task-24-python-spawn.log
  ```

  **Commit**: YES | `refactor(runner): route spawn through selectExecutor` | Files: `packages/runner/src/bin/start-runner.ts`

- [ ] 25. **`packages/runner/test/executor/passthrough-python.spec.ts`: AVA test - outer runner forwards fd4/fd5 raw bytes to/from runner-python with no JSON transformation (mirror of existing Node passthrough test)**

  **What to do**:
  - Create `packages/runner/test/executor/passthrough-python.spec.ts`.
  - Use the TEST `runtimeEntry` override on `spawnRunnerPython` pointing to `test/fixtures/python/echo_fd4_to_fd5.py` (reads bytes from fd4, prepends prefix `b"ECHO:"`, writes to fd5).
  - Assert: bytes written to host CONTROL channel reach fd4 unchanged (no JSON parse/repack); bytes written to fd5 reach host MONITORING channel unchanged.
  - Do NOT exercise the full handshake; this is transport-level passthrough only.

  **Must NOT do**: depend on the full runner-python bootstrap (use a minimal Python script as fixture child).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: transport-level test design.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 28-33 | Blocked By: 22, 24

  **References**:
  - Pattern: `packages/runner/test/transport/five-pipe-transport.spec.ts` - five-pipe transport test style.

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava test/executor/passthrough-python.spec.ts` -> green.
  - [ ] Test asserts byte-for-byte equality (no JSON.parse anywhere in the path).

  **QA Scenarios**:
  ```
  Scenario: fd4/fd5 byte passthrough
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/passthrough-python.spec.ts -v
    Expected: PASSED
    Evidence: .omo/evidence/task-25-passthrough.log
  ```

  **Commit**: YES | `test(runner): assert fd4/fd5 byte passthrough for python child` | Files: `packages/runner/test/executor/passthrough-python.spec.ts`

- [ ] 26. **`packages/runner/test/executor/python-env-strip.spec.ts`: AVA test - outer runner DOES NOT inject `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` into runner-python child env**

  **What to do**:
  - Create `packages/runner/test/executor/python-env-strip.spec.ts`.
  - Reuse the `test/fixtures/python/printenv.py` fixture from T7 (writes `os.environ` keys, one per line, to stdout, then exits 0).
  - Test: outer runner is configured with all 3 env vars set in its OWN process env; spawn the python fixture child via `selectExecutor({engines: {python3: "3.9"}}).spawn({ runtimeEntry: "test/fixtures/python/printenv.py", bootConfigPath: "/tmp/dummy.json" })`; capture child stdout; assert keys `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` are NOT present in child env.
  - Negative test: keys ARE present in the parent (outer runner) process env (sanity check).

  **Must NOT do**: assume Node runner-node child has the same stripping (Node currently does receive these and routes them into boot-config; only the Python wrapper is stripped of these specific runner-owned keys).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: env hygiene test + clear delineation between Node + Python paths.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 28-33 | Blocked By: 22, 24

  **References**:
  - Pattern: `packages/runner-python/src/runner_python/boot_config.py` (T8) - source of truth that runner-python reads boot config only from argv.

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava test/executor/python-env-strip.spec.ts` -> green.
  - [ ] Both positive (parent has) and negative (child stripped) assertions pass.

  **QA Scenarios**:
  ```
  Scenario: Python child env strips runner-owned vars
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/python-env-strip.spec.ts -v
    Expected: PASSED
    Evidence: .omo/evidence/task-26-strip.log
  ```

  **Commit**: YES | `test(runner): assert python child env strips SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO` | Files: `packages/runner/test/executor/python-env-strip.spec.ts`

- [ ] 27. **`packages/runner/test/executor/python-stdout-ordering.spec.ts`: AVA test - stdout-before-SEQUENCE_STOPPED ordering for Python sequence (throw-after-stdout fixture)**

  **What to do**:
  - Create `packages/runner/test/executor/python-stdout-ordering.spec.ts`.
  - Spin up runner-python with a fixture sequence that prints to stdout then raises.
  - Capture host STDOUT bytes + monitoring frames.
  - Assert: all stdout bytes appear in host STDOUT BEFORE the terminal SEQUENCE_STOPPED frame on host MONITORING.
  - Use timestamps from the test recording, not relative ordering only.

  **Must NOT do**: use mocks for this critical invariant - must use real spawned runner-python.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` - Reason: critical lifecycle invariant; flake-prone if naively written.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 28-33 | Blocked By: 22, 24

  **References**:
  - Pattern: `packages/runner/test/executor/runner-lifecycle-ordering.spec.ts` - Node-side ordering test.
  - Pattern: `packages/runner-python/tests/test_lifecycle.py` (T20) - inner-side ordering test.

  **Acceptance Criteria**:
  - [ ] `cd packages/runner && npx ava test/executor/python-stdout-ordering.spec.ts` -> green.
  - [ ] Test uses real spawn (not mock); fixture sequence is on disk.

  **QA Scenarios**:
  ```
  Scenario: stdout precedes SEQUENCE_STOPPED for Python sequence
    Tool: Bash
    Steps: cd packages/runner && npx ava test/executor/python-stdout-ordering.spec.ts -v
    Expected: PASSED; recorded host bytes show stdout chunks before SEQUENCE_STOPPED frame
    Evidence: .omo/evidence/task-27-ordering.log
  ```

  **Commit**: YES | `test(runner): stdout-before-SEQUENCE_STOPPED ordering for python sequences` | Files: `packages/runner/test/executor/python-stdout-ordering.spec.ts`

### Wave 5 - Adapter branch removal

- [ ] 28. **`packages/adapter-process/src/process-instance-adapter.ts`: Remove `engines.python3` control-flow branches (lines 89-126); always spawn `packages/runner`; relocate `PYTHONPATH` injection into runner-python boot config (`pythonPath` field)**

  **What to do**:
  - Edit `packages/adapter-process/src/process-instance-adapter.ts`.
  - DELETE the `if ("python3" in config.engines)` block at lines 89-102 (resolves `@scramjet/python-runner` and constructs Python argv).
  - REPLACE the runner command construction with a single, language-agnostic `[require.resolve("@scramjet/runner"), ...debugFlags]` invocation regardless of `engines`.
  - DELETE `getPythonpath()` method (lines 114-126); MOVE the equivalent logic to a new `buildBootConfigPythonPath(config: SequenceConfig): string | undefined` helper (returns the same string for python3 sequences, undefined for Node).
  - Pipe the result into a new `pythonPath` field on the boot-config write path in start-runner.ts (this is consumed by T14 sequence loader). NOTE: this requires extending `start-runner.ts` to accept `pythonPath` in its boot-config payload and forwarding it - coordinate with T24 since both edit start-runner.ts.
  - REMOVE PYTHONPATH from the `getRunnerEnvVariables` env injection (lines 156-169); leave EXPOSE_HOST and other generic envs.

  **Must NOT do**: remove `language` field from stored sequence config (telemetry must survive); break the existing `--runtime-adapter=process` Node path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: deletion + relocation of related logic touching multiple files.
  - Skills: none.

  **Parallelization**: Can Parallel: NO (touches start-runner.ts overlap with T24) | Wave 5 | Blocks: 33 | Blocked By: 24

  **References**:
  - Pattern: `packages/adapter-process/src/process-instance-adapter.ts:89-126, 156-169` - lines to remove/refactor.
  - Pattern: `packages/types/src/runtime-executor.ts` (T1) - `pythonPath` field added there.
  - Pattern: `packages/adapter-docker/src/docker-instance-adapter.ts:206-237` - clean adapter env style (no Python branch) to mirror.

  **Acceptance Criteria**:
  - [ ] `rg -n "python3|python-runner|PYTHONPATH" packages/adapter-process/src/process-instance-adapter.ts` -> empty (control-flow gone; PYTHONPATH-as-env injection gone).
  - [ ] `rg -n "engines\.python3|\"python3\" in" packages/adapter-process/src/` -> empty.
  - [ ] `cd packages/adapter-process && yarn build && npx ava` -> green.
  - [ ] Process adapter spawns same `@scramjet/runner` for both Node and Python sequences (verified by grep on the runner command builder).

  **QA Scenarios**:
  ```
  Scenario: No engines.python3 branches remain
    Tool: Bash
    Steps: rg -n "python3" packages/adapter-process/src/
    Expected: empty
    Evidence: .omo/evidence/task-28-no-branch.log

  Scenario: Process adapter still builds and tests pass
    Tool: Bash
    Steps: cd packages/adapter-process && yarn build && npx ava
    Expected: build success, tests pass
    Evidence: .omo/evidence/task-28-build.log
  ```

  **Commit**: YES | `refactor(adapter-process): remove engines.python3 control-flow branches` | Files: `packages/adapter-process/src/process-instance-adapter.ts`, `packages/runner/src/bin/start-runner.ts` (boot-config pythonPath wiring)

- [ ] 29. **`packages/adapter-process/package.json`: Remove `@scramjet/python-runner` dependency - adapter no longer references the package directly**

  **What to do**:
  - Edit `packages/adapter-process/package.json`.
  - Delete the line `"@scramjet/python-runner": "^1.1.0",` from `dependencies` (line 20).
  - Run `yarn install` from repo root to refresh lockfile.

  **Must NOT do**: also remove `@scramjet/runner` (we still depend on it); touch other packages here.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: one-line dep removal.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 33 | Blocked By: 28

  **References**:
  - Pattern: `packages/adapter-process/package.json:17-24` - current deps.

  **Acceptance Criteria**:
  - [ ] `rg -n "@scramjet/python-runner" packages/adapter-process/package.json` -> empty.
  - [ ] `cd packages/adapter-process && yarn build` -> success (no missing-dep error).

  **QA Scenarios**:
  ```
  Scenario: Build succeeds without dep
    Tool: Bash
    Steps: yarn install && cd packages/adapter-process && yarn build
    Expected: success
    Evidence: .omo/evidence/task-29-build.log
  ```

  **Commit**: YES | `chore(adapter-process): drop @scramjet/python-runner dep` | Files: `packages/adapter-process/package.json`

- [ ] 30. **`packages/adapter-docker/src/docker-sequence-adapter.ts`: Scope `engines.python3` usage to image-only selection at lines 262-264 (KEEP that branch as infrastructure-only image variant selection per roadmap line 39); verify NO OTHER `engines.python3` control-flow branches exist in `docker-sequence-adapter.ts` or `docker-instance-adapter.ts`; update Python-related log line at 57-60 to use `language` field**

  **What to do**:
  - Edit `packages/adapter-docker/src/docker-sequence-adapter.ts`.
  - At lines 262-264, the current code is:
    ```ts
    container.image = "python3" in engines
      ? this.dockerConfig.runnerImages.python3
      : this.dockerConfig.runnerImages.node;
    ```
  - This is the ONE allowed exception per Metis directive: image variant selection IS infrastructure, not control flow. KEEP this branch.
  - Per the user-confirmed scope, this task is therefore NARROWER than originally drafted: verify by ast-grep that NO OTHER `engines.python3` references exist in `docker-sequence-adapter.ts` or `docker-instance-adapter.ts` outside of image selection at line 262-264 and the `language: detectLanguage(...)` at line 281.
  - Update the Python-related log line at line 57-60 to use `language` rather than implying a separate runner code path.

  **Must NOT do**: remove the image-variant selection (it's infrastructure-only and SURVIVES per roadmap line 39 + image-config decision); remove `runnerImages.python3` config key.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: subtle scope (keep image selection, remove control flow).
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 33 | Blocked By: 24

  **References**:
  - Pattern: `packages/adapter-docker/src/docker-sequence-adapter.ts:57-60, 257-264, 281` - existing branches.
  - Roadmap: `docs/roadmap/014-feature-request-python-runner-wrapper.md:38-42` - image variant survival confirmed.

  **Acceptance Criteria**:
  - [ ] `rg -n "python3" packages/adapter-docker/src/docker-sequence-adapter.ts` -> at most 2 lines (image selection at 262-264, log at 57-60).
  - [ ] `rg -n "python3" packages/adapter-docker/src/docker-instance-adapter.ts` -> empty.
  - [ ] `cd packages/adapter-docker && yarn build && npx ava` -> green.

  **QA Scenarios**:
  ```
  Scenario: Image variant still selects correctly
    Tool: Bash
    Steps: write a unit fixture sequence config with engines.python3; assert docker-sequence-adapter computes container.image = runnerImages.python3
    Expected: PASSED
    Evidence: .omo/evidence/task-30-image-select.log

  Scenario: No other python3 control-flow
    Tool: Bash
    Steps: rg -n "if .*python3" packages/adapter-docker/src/
    Expected: only image-selection ternary at line 262-264
    Evidence: .omo/evidence/task-30-no-control-flow.log
  ```

  **Commit**: YES | `refactor(adapter-docker): scope engines.python3 to image-only selection` | Files: `packages/adapter-docker/src/docker-sequence-adapter.ts`

- [ ] 31. **`packages/adapter-docker/package.json`: Remove `@scramjet/python-runner` dependency - docker adapter no longer references it**

  **What to do**:
  - Edit `packages/adapter-docker/package.json`.
  - Delete the `"@scramjet/python-runner": "^1.1.0"` line at line 23.
  - Run `yarn install`.

  **Must NOT do**: remove `@scramjet/runner` or `@scramjet/pre-runner`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: one-line dep removal.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 33 | Blocked By: 30

  **References**:
  - Pattern: `packages/adapter-docker/package.json:21-23`.

  **Acceptance Criteria**:
  - [ ] `rg -n "@scramjet/python-runner" packages/adapter-docker/package.json` -> empty.
  - [ ] `cd packages/adapter-docker && yarn build` -> success.

  **QA Scenarios**:
  ```
  Scenario: Build succeeds without dep
    Tool: Bash
    Steps: yarn install && cd packages/adapter-docker && yarn build
    Expected: success
    Evidence: .omo/evidence/task-31-build.log
  ```

  **Commit**: YES | `chore(adapter-docker): drop @scramjet/python-runner dep` | Files: `packages/adapter-docker/package.json`

- [ ] 32. **`packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`: Apply same scope-narrowing as docker - keep image selection (`runnerImages.python3` via line 192-194), remove any other engines.python3 control flow if present**

  **What to do**:
  - Edit `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`.
  - At lines 192-194, the current code:
    ```ts
    const runnerImage = config.engines.python3
      ? this.adapterConfig.runnerImages.python3
      : this.adapterConfig.runnerImages.node;
    ```
  - KEEP this branch (infrastructure-only image selection, per roadmap line 39).
  - Verify by ast-grep that NO OTHER `engines.python3` references exist outside this image selection.
  - If `kubernetes-config-decoder.ts:14-17` is the only remaining python3 reference, that's expected and required (config schema must keep both image slots).

  **Must NOT do**: remove `runnerImages.python3` config schema key; rename CLI flag.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: subtle scope (keep image selection).
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 33 | Blocked By: 24

  **References**:
  - Pattern: `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts:179-194`.
  - Pattern: `packages/adapter-kubernetes/src/kubernetes-config-decoder.ts:14-17` - schema field stays.

  **Acceptance Criteria**:
  - [ ] `rg -n "python3" packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts` -> at most 1 line (image selection).
  - [ ] `cd packages/adapter-kubernetes && yarn build && npx ava` -> green.

  **QA Scenarios**:
  ```
  Scenario: K8s image variant still selects correctly
    Tool: Bash
    Steps: unit test asserting kubernetes-instance-adapter computes runnerImage from engines.python3
    Expected: PASSED
    Evidence: .omo/evidence/task-32-image-select.log
  ```

  **Commit**: YES | `refactor(adapter-kubernetes): scope engines.python3 to image-only selection` | Files: `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`

- [ ] 33. **`scripts/check-runtime-wrapper-invariants.sh`: Run T4 ast-grep + ripgrep verification - no `engines.python3` control-flow branches remain in adapters; image-only references are the only allowed survivors**

  **What to do**:
  - Run `bash scripts/check-runtime-wrapper-invariants.sh` (T4) against the post-Wave-5 tree.
  - Each guard must report PASS.
  - If any FAIL: investigate the violation, fix the source file (not the script), re-run.
  - This is a BLOCKING gate before Wave 6.

  **Must NOT do**: relax the script's whitelist to make it pass; bypass the script and proceed to Wave 6.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: invocation + verification.
  - Skills: none.

  **Parallelization**: Can Parallel: NO (BLOCKING) | Wave 5 | Blocks: 34-38 | Blocked By: 4, 28-32

  **References**:
  - Pattern: `scripts/check-runtime-wrapper-invariants.sh` (T4).

  **Acceptance Criteria**:
  - [ ] `bash scripts/check-runtime-wrapper-invariants.sh` exits 0.
  - [ ] All 6 guard lines show PASS.

  **QA Scenarios**:
  ```
  Scenario: All guards pass post-Wave-5
    Tool: Bash
    Steps: bash scripts/check-runtime-wrapper-invariants.sh
    Expected: exit 0; "GUARD <N>: PASS" x 6
    Evidence: .omo/evidence/task-33-guards.log
  ```

  **Commit**: NO (verification only; no source changes)

### Wave 6 - Image + CI

- [ ] 34. **`packages/runner-python/Dockerfile`: Move + adapt `packages/python-runner/Dockerfile` to `packages/runner-python/Dockerfile` with outer `packages/runner` as ENTRYPOINT - python deps + runner-python source baked in; outer-runner is what actually starts**

  **What to do**:
  - Create `packages/runner-python/Dockerfile`.
  - Base: `python:3.9-slim-bullseye` (preserve current).
  - Install: `git`, `gosu`, `tini` (preserve current).
  - Install Node.js (LTS) - NEW, required because outer runner is Node-based and is now the entrypoint.
  - Copy `packages/runner/dist` (or src + node_modules) into the image.
  - Copy `packages/runner-python/src/runner_python/` into the image.
  - Copy `packages/runner-python/requirements.txt` and `pip install -r requirements.txt`.
  - Copy boot scripts (`unpack.sh`, `wait-for-sequence-and-start.sh`, `docker-entrypoint.sh`) - adapt them to T36.
  - ENTRYPOINT: `tini -- docker-entrypoint.sh`. The entrypoint script delegates to `node /opt/runner/dist/bin/start-runner.js` (or equivalent), NOT `python runner.py`.

  **Must NOT do**: copy `packages/python-runner/runner.py` (deleted in T40); leave the old `python runner.py` ENTRYPOINT path; pin Node version inconsistently with `packages/runner` requirements.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Dockerfile design touching two language toolchains.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 39, 42-45 | Blocked By: 33, 21

  **References**:
  - Pattern: `packages/python-runner/Dockerfile:1-26` - current image (template only).
  - Pattern: `packages/runner/Dockerfile` - Node-side image (for Node install steps + outer runner copy).

  **Acceptance Criteria**:
  - [ ] `docker build -f packages/runner-python/Dockerfile -t scramjetorg/runner-py:dev .` succeeds from repo root.
  - [ ] Image inspected: ENTRYPOINT is `tini -- docker-entrypoint.sh`; CMD or shell delegates to outer runner Node executable.
  - [ ] `docker run --rm scramjetorg/runner-py:dev node --version` prints a Node LTS version.
  - [ ] `docker run --rm scramjetorg/runner-py:dev python3 -c "import runner_python; print(runner_python.__name__)"` prints `runner_python`.

  **QA Scenarios**:
  ```
  Scenario: Image builds successfully
    Tool: Bash
    Steps: docker build -f packages/runner-python/Dockerfile -t scramjetorg/runner-py:dev .
    Expected: build success; final layer tagged
    Evidence: .omo/evidence/task-34-build.log

  Scenario: Both runtimes available in image
    Tool: Bash
    Steps: docker run --rm scramjetorg/runner-py:dev sh -c "node --version && python3 -c 'import runner_python; print(\"ok\")'"
    Expected: prints Node version then "ok"
    Evidence: .omo/evidence/task-34-runtimes.log
  ```

  **Commit**: YES | `build(runner-python): port Dockerfile to outer-runner entrypoint` | Files: `packages/runner-python/Dockerfile`

- [ ] 35. **`packages/runner-python/Dockerfile-tf-gpu`: Adapt the GPU image variant equivalently - same outer-runner ENTRYPOINT, but base on `tensorflow/tensorflow:latest-gpu` plus runner-python**

  **What to do**:
  - Create `packages/runner-python/Dockerfile-tf-gpu`.
  - Mirror T34 changes but base on `tensorflow/tensorflow:latest-gpu` (preserve current `packages/python-runner/Dockerfile-tf-gpu` base).
  - Keep extra `pip install GPUtil numpy` step.
  - Same ENTRYPOINT structure as T34.

  **Must NOT do**: diverge ENTRYPOINT logic from T34; introduce TF-specific runner code paths.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: parallel Dockerfile.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 39 | Blocked By: 34

  **References**:
  - Pattern: `packages/python-runner/Dockerfile-tf-gpu` - template.
  - Pattern: `packages/runner-python/Dockerfile` (T34) - shared structure.

  **Acceptance Criteria**:
  - [ ] `docker build -f packages/runner-python/Dockerfile-tf-gpu -t scramjetorg/runner-py-tf-gpu:dev .` succeeds (note: requires GPU-capable build env, mark as conditional in CI).
  - [ ] Local non-GPU build still completes the layers up to the GPU-conditional ones.

  **QA Scenarios**:
  ```
  Scenario: GPU image builds (or fails gracefully on non-GPU host)
    Tool: Bash
    Steps: docker build -f packages/runner-python/Dockerfile-tf-gpu -t scramjetorg/runner-py-tf-gpu:dev .
    Expected: success on GPU host; documented failure on non-GPU host
    Evidence: .omo/evidence/task-35-gpu-build.log
  ```

  **Commit**: YES | `build(runner-python): port Dockerfile-tf-gpu to outer-runner entrypoint` | Files: `packages/runner-python/Dockerfile-tf-gpu`

- [ ] 36. **`packages/runner-python/{docker-entrypoint.sh, unpack.sh, wait-for-sequence-and-start.sh}`: Port boot scripts - delegate to outer Node runner instead of `python runner.py`; preserve `/package` ready-marker semantics**

  **What to do**:
  - Create `packages/runner-python/docker-entrypoint.sh`:
    - Same `gosu ${RUNNER_USER:-runner}` user-switch.
    - On `start-runner` arg: invoke `exec node /opt/runner/dist/bin/start-runner.js` (or equivalent path - confirm against T34 image layout).
    - All other args: pass through to `exec "$@"` (preserve current).
  - Port `unpack.sh` unchanged (sequence-package extraction is language-agnostic).
  - Port `wait-for-sequence-and-start.sh`: same `/package/.ready` polling, then exec `start-runner` (which now goes to Node outer runner).

  **Must NOT do**: invoke `python runner.py`; change `/package/.ready` marker semantics; reorder unpack vs ready steps.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: shell scripts with subtle ordering + container-init concerns.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 39 | Blocked By: 34

  **References**:
  - Pattern: `packages/python-runner/docker-entrypoint.sh, unpack.sh, wait-for-sequence-and-start.sh` - templates.

  **Acceptance Criteria**:
  - [ ] `docker run --rm scramjetorg/runner-py:dev start-runner --help` (or equivalent) shows the outer-runner help, not Python errors.
  - [ ] `bash -n packages/runner-python/*.sh` parses cleanly.

  **QA Scenarios**:
  ```
  Scenario: Entrypoint dispatches to Node runner
    Tool: Bash
    Steps: docker run --rm --entrypoint /bin/sh scramjetorg/runner-py:dev -c "cat /usr/local/bin/docker-entrypoint.sh | grep -E 'node|runner.py'"
    Expected: shows node invocation, NOT runner.py
    Evidence: .omo/evidence/task-36-entrypoint.log
  ```

  **Commit**: YES | `build(runner-python): port boot scripts to outer-runner dispatch` | Files: `packages/runner-python/docker-entrypoint.sh`, `packages/runner-python/unpack.sh`, `packages/runner-python/wait-for-sequence-and-start.sh`

- [ ] 37. **`.github/workflows/build-docker-runner-python.yml`: Update CI to build the new Dockerfile path - `packages/runner-python/Dockerfile` instead of `packages/python-runner/Dockerfile`**

  **What to do**:
  - Edit `.github/workflows/build-docker-runner-python.yml`.
  - Change Dockerfile path from `packages/python-runner/Dockerfile` to `packages/runner-python/Dockerfile`.
  - Update build context if needed (likely repo root remains).
  - Update image tag continuity: `scramjetorg/runner-py:<tag>` stays the same.
  - Add a build step for `Dockerfile-tf-gpu` regardless of current inclusion (T35 produces the new path).
  - Update `.github/workflows/publish-release.yml` similarly (lines 31-108 reference both runner and runner-py images).

  **Must NOT do**: rename the published image tag (`scramjetorg/runner-py` stays - this is operator-facing infra); change CI matrix beyond the Dockerfile path.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: YAML path edits.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 39 | Blocked By: 34, 35

  **References**:
  - Pattern: `.github/workflows/build-docker-runner-python.yml:26-48`.
  - Pattern: `.github/workflows/publish-release.yml:31-108`.

  **Acceptance Criteria**:
  - [ ] `rg -n "packages/python-runner" .github/workflows/` -> empty.
  - [ ] `rg -n "packages/runner-python" .github/workflows/build-docker-runner-python.yml` -> at least one match.
  - [ ] CI workflow YAML validates: `actionlint .github/workflows/build-docker-runner-python.yml` clean (or equivalent).

  **QA Scenarios**:
  ```
  Scenario: Workflow references new path
    Tool: Bash
    Steps: rg -n "Dockerfile" .github/workflows/build-docker-runner-python.yml
    Expected: matches under packages/runner-python/
    Evidence: .omo/evidence/task-37-workflow.log

  Scenario: Local CI dry-run (act) builds the image
    Tool: Bash
    Steps: act -W .github/workflows/build-docker-runner-python.yml -P ubuntu-latest=node:18
    Expected: build step succeeds (or documented act-specific limitations)
    Evidence: .omo/evidence/task-37-act.log
  ```

  **Commit**: YES | `ci: update build-docker-runner-python.yml for new path` | Files: `.github/workflows/build-docker-runner-python.yml`, `.github/workflows/publish-release.yml`

- [ ] 38. **`bdd/lib/host-utils.ts`: Update `--runner-py-image` flag continuity - flag stays but image now refers to `scramjetorg/runner-py` built from `packages/runner-python/Dockerfile`**

  **What to do**:
  - Edit `bdd/lib/host-utils.ts:187-192`.
  - Confirm the `--runner-py-image=scramjetorg/runner-py:${RUNNER_IMGS_TAG}` invocation still works against the new build (line 191 of `bdd/lib/host-utils.ts`).
  - Update the `RUNNER_IMGS_TAG` env var setup in `.github/workflows/_main_sth-build-test-node-18.yml` to use the locally-built tag from T34/T37 (`dev` for CI runs, the published tag for release runs). Set `RUNNER_IMGS_TAG=dev` for every `test-bdd-ci-sth-*-python*` job.

  **Must NOT do**: rename the flag; remove the flag.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small TS edit.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 42-45 | Blocked By: 37

  **References**:
  - Pattern: `bdd/lib/host-utils.ts:187-192`.

  **Acceptance Criteria**:
  - [ ] `--runner-py-image` flag still passed to STH start command in BDD test runs.
  - [ ] Image string continues to resolve to a built image after T34/T37.

  **QA Scenarios**:
  ```
  Scenario: BDD runs invoke STH with --runner-py-image
    Tool: Bash
    Steps: yarn test:bdd-ci-sth-process-python -- --dry-run | grep "runner-py-image"
    Expected: flag present in command
    Evidence: .omo/evidence/task-38-flag.log
  ```

  **Commit**: YES | `test(bdd): preserve --runner-py-image flag wiring` | Files: `bdd/lib/host-utils.ts`

### Wave 7 - Cutover (deletion + lockfile)

- [ ] 39. **`scripts/scan-python-runner-references.sh`: BLOCKING repo-wide reference scan - ripgrep for `@scramjet/python-runner`, `packages/python-runner`, `runner.py` (in production paths), `__pypackages__` (in production paths); deletion task is GATED on output being empty**

  **What to do**:
  - Create `scripts/scan-python-runner-references.sh`.
  - Run:
    1. `rg -l '@scramjet/python-runner'` filtered to exclude `CHANGELOG.md`, `docs/roadmap/`, `.omo/`. Must be empty.
    2. `rg -l 'packages/python-runner'` same exclusions. Must be empty.
    3. `rg -l 'runner\.py'` filtered to exclude docs/roadmap/historical content. Must be empty in production source.
    4. `rg -l '__pypackages__'` filtered to exclude `packages/runner-python/` (allowed there) and `.gitignore` patterns. Must be empty elsewhere.
  - Script exits non-zero if any check finds matches.
  - Print per-check PASS/FAIL summary.

  **Must NOT do**: bypass the script; relax filters to make it pass; modify source files here.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: needs careful filter design + manual sanity check on results.
  - Skills: none.

  **Parallelization**: Can Parallel: NO (BLOCKING) | Wave 7 | Blocks: 40 | Blocked By: 4, 33, 34-38

  **References**:
  - Pattern: `scripts/check-runtime-wrapper-invariants.sh` (T4) - similar guard pattern.

  **Acceptance Criteria**:
  - [ ] `bash scripts/scan-python-runner-references.sh` exits 0.
  - [ ] Script output shows 4 PASS lines.

  **QA Scenarios**:
  ```
  Scenario: All 4 checks pass after Wave 6
    Tool: Bash
    Steps: bash scripts/scan-python-runner-references.sh
    Expected: exit 0
    Evidence: .omo/evidence/task-39-scan.log

  Scenario: Script detects planted reference
    Tool: Bash
    Steps: echo "// uses @scramjet/python-runner" >> packages/host/src/lib/csi-controller.ts; bash scripts/scan-python-runner-references.sh; rv=$?; git checkout packages/host/src/lib/csi-controller.ts
    Expected: rv != 0
    Evidence: .omo/evidence/task-39-detection.log
  ```

  **Commit**: YES | `chore: add deletion-gate reference scan for python-runner` | Files: `scripts/scan-python-runner-references.sh`

- [ ] 40. **[BLOCKING] `packages/python-runner/`: DELETE the directory - hard cutover, no shim**

  **What to do**:
  - Confirm T39 exits 0 immediately before this task. If not, return to fix references first.
  - `git rm -r packages/python-runner/`.
  - Remove any references in root `package.json` workspaces if they explicitly listed the path (likely not - workspaces use glob).
  - Do NOT remove the directory if T39 has not been re-verified GREEN within the last 5 minutes.

  **Must NOT do**: delete before T39 passes; preserve any file from `packages/python-runner/` (clean-slate per user decision).

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: one git rm.
  - Skills: `git-master` - Reason: git rm + verify clean removal.

  **Parallelization**: Can Parallel: NO | Wave 7 | Blocks: 41, 42-45 | Blocked By: 39

  **References**:
  - none (deletion task).

  **Acceptance Criteria**:
  - [ ] `git ls-files packages/python-runner` -> empty.
  - [ ] `ls packages/python-runner` -> `No such file or directory`.
  - [ ] `git status` shows the deletion staged.

  **QA Scenarios**:
  ```
  Scenario: Directory removed cleanly
    Tool: Bash
    Steps: ls packages/python-runner 2>&1
    Expected: "No such file or directory"
    Evidence: .omo/evidence/task-40-deletion.log

  Scenario: T39 verified immediately before deletion
    Tool: Bash
    Steps: bash scripts/scan-python-runner-references.sh && git rm -r packages/python-runner/
    Expected: scan exit 0 then rm success
    Evidence: .omo/evidence/task-40-gate.log
  ```

  **Commit**: YES | `chore: delete packages/python-runner (replaced by runner-python)` | Files: `packages/python-runner/**` (deletion)

- [ ] 41. **`yarn.lock`: Refresh lockfile after dep + package removals - ensures no orphaned references to `@scramjet/python-runner`**

  **What to do**:
  - From repo root: `yarn install`.
  - Inspect `yarn.lock`: confirm no `@scramjet/python-runner` entries remain.
  - If the workspace pattern picked up `packages/runner-python` cleanly, the lockfile additions should show `@scramjet/runner-python` (workspace member, no version pin).

  **Must NOT do**: edit `yarn.lock` by hand; commit `node_modules`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: yarn invocation + lockfile inspection.
  - Skills: none.

  **Parallelization**: Can Parallel: NO | Wave 7 | Blocks: 42-45 | Blocked By: 40

  **References**:
  - none.

  **Acceptance Criteria**:
  - [ ] `rg -n "@scramjet/python-runner" yarn.lock` -> empty.
  - [ ] `yarn install` clean (no warnings about missing workspaces).
  - [ ] `yarn workspaces list` includes `@scramjet/runner-python`, does NOT include `@scramjet/python-runner`.

  **QA Scenarios**:
  ```
  Scenario: Lockfile clean
    Tool: Bash
    Steps: yarn install && rg -n "@scramjet/python-runner" yarn.lock
    Expected: install success; rg empty
    Evidence: .omo/evidence/task-41-lockfile.log
  ```

  **Commit**: YES | `chore: refresh lockfile after python-runner removal` | Files: `yarn.lock`

### Wave 8 - BDD verification

- [ ] 42. **`bdd/features/e2e/E2E-014-python.feature`: Run against runner-python via process adapter - all 7 Python-specific scenarios must pass**

  **What to do**:
  - Run `yarn test:bdd-ci-sth-process-python`.
  - All 7 scenarios from `E2E-014-python.feature` must pass: stderr exceptions, text input lines, binary input no-split, health override, logger in context, topic rename, async generator output.
  - On failure: capture failing scenario log into `.omo/evidence/task-42-<scenario>.log`, diagnose against parity fixture, fix in either the wrapper or the test (NOT both).

  **Must NOT do**: skip any scenario; modify the feature file (only fix wrapper if real bug found).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: BDD runs + diagnosis loop.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 8 | Blocks: F1-F4 | Blocked By: 41

  **References**:
  - Pattern: `bdd/features/e2e/E2E-014-python.feature:1-68`.

  **Acceptance Criteria**:
  - [ ] `yarn test:bdd-ci-sth-process-python` exit 0.
  - [ ] All 7 scenarios in cucumber report: passed.

  **QA Scenarios**:
  ```
  Scenario: All E2E-014 process scenarios pass
    Tool: Bash
    Steps: yarn test:bdd-ci-sth-process-python
    Expected: 7/7 passed
    Evidence: .omo/evidence/task-42-e2e-014-process.log
  ```

  **Commit**: NO (verification only; no source changes)

- [ ] 43. **`bdd/features/e2e/E2E-014-python.feature` (docker): Run against runner-python via docker adapter - all 7 scenarios green against the rebuilt `scramjetorg/runner-py:dev` image**

  **What to do**:
  - Run `yarn test:bdd-ci-sth-docker-python` with `RUNNER_IMGS_TAG=dev` (or whatever tag T34/T37 produces).
  - Same coverage as T42 but via docker adapter.

  **Must NOT do**: reuse stale `scramjetorg/runner-py:1.1.0` from a registry (must use locally-built image from T34).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: docker BDD orchestration.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 8 | Blocks: F1-F4 | Blocked By: 41

  **References**:
  - Pattern: `bdd/features/e2e/E2E-014-python.feature`.
  - Pattern: `.github/workflows/_main_sth-build-test-node-18.yml` - `test-bdd-ci-sth-docker-python` job def.

  **Acceptance Criteria**:
  - [ ] `RUNNER_IMGS_TAG=dev yarn test:bdd-ci-sth-docker-python` exit 0.
  - [ ] 7/7 scenarios green.

  **QA Scenarios**:
  ```
  Scenario: All E2E-014 docker scenarios pass
    Tool: Bash
    Steps: docker build -f packages/runner-python/Dockerfile -t scramjetorg/runner-py:dev . && RUNNER_IMGS_TAG=dev yarn test:bdd-ci-sth-docker-python
    Expected: 7/7 passed
    Evidence: .omo/evidence/task-43-e2e-014-docker.log
  ```

  **Commit**: NO (verification only)

- [ ] 44. **`bdd/features/e2e/E2E-015-unified.feature` Python paths: Run unified scenarios for Python sequence (process + docker) - all relevant scenarios green**

  **What to do**:
  - Run `yarn test:bdd-ci-sth-process-unified-python` and `yarn test:bdd-ci-sth-docker-unified-python`.
  - All Python-tagged scenarios in `E2E-015-unified.feature` must pass: run with input/output, stdin/stdout, args, killable, stop handler, default health, topics, events.

  **Must NOT do**: skip docker variant; relax scenarios.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: 2 BDD jobs + diagnosis.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 8 | Blocks: F1-F4 | Blocked By: 41

  **References**:
  - Pattern: `bdd/features/e2e/E2E-015-unified.feature:1-81`.

  **Acceptance Criteria**:
  - [ ] Both `yarn test:bdd-ci-sth-process-unified-python` and `yarn test:bdd-ci-sth-docker-unified-python` exit 0.
  - [ ] All Python-tagged scenarios green in both runs.

  **QA Scenarios**:
  ```
  Scenario: Unified Python scenarios pass on process
    Tool: Bash
    Steps: yarn test:bdd-ci-sth-process-unified-python
    Expected: all passed
    Evidence: .omo/evidence/task-44-unified-process.log

  Scenario: Unified Python scenarios pass on docker
    Tool: Bash
    Steps: RUNNER_IMGS_TAG=dev yarn test:bdd-ci-sth-docker-unified-python
    Expected: all passed
    Evidence: .omo/evidence/task-44-unified-docker.log
  ```

  **Commit**: NO (verification only)

- [ ] 45. **`bdd/features/e2e/E2E-010-cli.feature` TC-021: Run "Test Start sequence in python with startup-config" - validates Python sequences boot via startup-config integration**

  **What to do**:
  - Run `yarn test:bdd --name="TC-021 Test Start sequence in python with startup-config"`.
  - Scenario at `E2E-010-cli.feature:180-185`.
  - Asserts Python sequence launches successfully via the startup-config feature integration.

  **Must NOT do**: skip if startup-config infra is unrelated; relax assertions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: targeted BDD run + diagnosis.
  - Skills: none.

  **Parallelization**: Can Parallel: YES | Wave 8 | Blocks: F1-F4 | Blocked By: 41

  **References**:
  - Pattern: `bdd/features/e2e/E2E-010-cli.feature:180-185`.

  **Acceptance Criteria**:
  - [ ] `yarn test:bdd --name="TC-021 Test Start sequence in python with startup-config"` exit 0.
  - [ ] Scenario report: passed.

  **QA Scenarios**:
  ```
  Scenario: TC-021 passes against runner-python
    Tool: Bash
    Steps: yarn test:bdd --name="TC-021 Test Start sequence in python with startup-config"
    Expected: passed
    Evidence: .omo/evidence/task-45-tc-021.log
  ```

  **Commit**: NO (verification only)



## Final Verification Wave (MANDATORY - after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit - oracle
  - Verify every task in this plan was completed.
  - Verify Definition of Done command list passes from a clean checkout.
  - Verify Metis invariants (CRLF framing, channel ownership, ordering, heartbeat, control parity, boot-config-only, no BPMux for Python) are each backed by a passing test.

- [ ] F2. Code Quality Review - unspecified-high
  - `yarn lint` clean.
  - `yarn build:packages` clean.
  - No leftover commented blocks, dead exports, or AI-slop patterns.
  - TS types in `runtime-executor.ts` and Python dataclasses in `runner-python` mirror exactly.

- [ ] F3. Scripted Agent QA - unspecified-high
  - Run `scripts/final-verify-python-e2e.sh` (created as part of this F3 task) which is fully agent-executable:
    1. Launch STH with `--runtime-adapter=process` in a background process; wait for ready; `si seq deploy` a Python fixture sequence; `si inst output -` to capture output; assert expected lines; `si inst stop -`; verify exit; tear down. Save transcript to `.omo/evidence/F3-process.log`.
    2. Repeat for `--runtime-adapter=docker` -> `.omo/evidence/F3-docker.log`.
    3. Kubernetes: if `KUBECONFIG` env is set and `kubectl cluster-info` succeeds, run the equivalent against `--runtime-adapter=kubernetes`; otherwise the script MUST exit 0 with `.omo/evidence/F3-k8s-skipped.log` containing "Kubernetes verification skipped: KUBECONFIG not set or cluster unreachable". This is the only allowed conditional - all condition states still produce a deterministic agent-checkable artifact.
    4. Run a throw-after-stdout Python fixture via the process adapter; parse `.omo/evidence/F3-process-ordering.log`; assert stdout bytes appear in the transcript BEFORE the SEQUENCE_STOPPED line (regex assertion).
  - All steps are scripted; no human input required. Verification Strategy "ZERO HUMAN INTERVENTION" is preserved.

- [ ] F4. Scope Fidelity Check - deep
  - Diff the implementation against this plan's IN/OUT scope.
  - Flag any out-of-scope changes (cleanup creep, executor framework bloat, image overhaul, adapter telemetry refactors, etc.).
  - Confirm `runnerImages.python3`, `--runner-py-image`, `--k8s-runner-py-image` still function.

## Commit Strategy
Signed atomic commits, one per task or per tightly-coupled task group. Conventional Commits.
1. `feat(types): add shared RuntimeExecutor and BootConfig types` (T1.1)
2. `docs(architecture): add runner-runtime-wrappers contract doc` (T1.2)
3. `test(runner-python): capture golden parity fixtures from python-runner` (T1.3)
4. `chore(runner): add ast-grep static checks for forbidden runtime-wrapper patterns` (T1.4)
5. `feat(runner-python): scaffold package with pytest infra` (T1.5)
6. `test(runner): RED tests for selectExecutor and python-process-executor` (T1.6, T1.7)
7. `feat(runner-python): boot-config parser, fd wiring, host channels` (T2.x)
8. `feat(runner-python): sequence runtime, AppContext, IO, control codes, heartbeat` (T3.1-3.7)
9. `test(runner-python): golden parity replay against runner-python` (T3.8)
10. `feat(runner): python-process-executor + selectExecutor + start-runner wiring` (T4.1-4.3)
11. `test(runner): assert child env strips SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO and stdout-before-STOPPED ordering` (T4.4-4.6)
12. `refactor(adapter-process): remove engines.python3 control-flow branches` (T5.1)
13. `chore(adapter-process): drop @scramjet/python-runner dep` (T5.2)
14. `refactor(adapter-docker): scope engines.python3 to image-only selection` (T30)
15. `chore(adapter-docker): drop @scramjet/python-runner dep` (T5.4)
16. `refactor(adapter-kubernetes): scope engines.python3 to image-only selection` (T32)
17. `test(runner): ast-grep verify no python3 branches remain in adapters` (T5.6)
18. `build(runner-python): port Dockerfile to outer-runner entrypoint` (T6.1, T6.2, T6.3)
19. `ci: update build-docker-runner-python.yml for new path` (T6.4)
20. `test(bdd): update host-utils for image-flag continuity` (T6.5)
21. `chore: repo-wide reference scan gate before python-runner deletion` (T7.1)
22. `chore: delete packages/python-runner` (T7.2)
23. `chore: refresh lockfile after python-runner removal` (T7.3)
24. `test(bdd): green E2E-014, E2E-015, E2E-010 TC-021 against runner-python` (T8.x)
(roadmap status update is intentionally NOT a separate task; the architecture doc created in T2 references 014 by cross-link, and roadmap mark-complete is a manual post-execution operator action outside this plan's scope)

## Success Criteria
- All Definition-of-Done commands pass.
- F1-F4 final verification waves all APPROVE.
- User explicitly approves the consolidated F1-F4 results.

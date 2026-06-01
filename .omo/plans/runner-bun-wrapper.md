# Bun Runner Wrapper

## TL;DR

> **Quick Summary**: Add `runner-bun` as a third runtime wrapper (alongside `runner-node` and `runner-python`) to the Scramjet Transform Hub `packages/runner` executor architecture, enabling Bun-backed sequence execution with full protocol compatibility.
>
> **Deliverables**:
> - `packages/types/src/runtime-executor.ts`: `RuntimeKind` extended with `"bun"`
> - `packages/runner-bun/`: New package with Bun runtime wrapper entry, boot-config validation, Dockerfile
> - `packages/runner/src/executor/bun-process-executor.ts`: Bun process executor (parallel to `python-process-executor.ts`)
> - `packages/runner/src/executor/runner-bun-launcher.ts`: Bun entry resolution (parallel to `runner-node-launcher.ts`)
> - `packages/runner/src/executor/select.ts`: executor selection with Bun branch
> - `packages/runner/src/bin/start-runner.ts`: Bun entry resolution when bun executor selected
> - Config types, defaults, CLI flags, adapter image selection, decoder updates
> - Tests for selection, executor contract, env stripping
> - `scramjetorg/runner-bun` Docker image
>
> **Estimated Effort**: Large (20+ files across 10 packages)
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Task 1 (types) → Task 3 (executor) + Task 4 (launcher) → Task 8 (start-runner) → Task 17 (docker image) → F1-F4

---

## Context

### Original Request
Feature request in `docs/roadmap/015-feature-request-bun-runner-wrapper.md`: Add Bun as a runtime wrapper managed by `packages/runner`, keeping the host/adapters oblivious. The host continues launching the same `packages/runner` executable; runtime selection happens inside via the executor interface.

### Interview Summary
**Key Discussions**:
- Docker image base: `oven/bun:1-slim` + Node.js via nodesource (user confirmed)
- Wrapper language: TypeScript (Bun runs TS natively)
- Engine key: `engines.bun` (follows `engines.python3` pattern)
- Selection precedence: bun > python3 > node (bun checked first)
- Spawn command: `bun <runner-bun-entry> <bootConfigPath>`
- Environment stripping: Same as Python — strip SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO
- Adapter image selection: IN scope — add `runnerImages.bun` to configs, update Docker/K8s selection
- K8s config decoder: Add `bun: JsonDecoder.string` to runnerImages object decoder

**Research Findings**:
- `RuntimeKind = "node" | "python3"` at `packages/types/src/runtime-executor.ts:8`
- `selectExecutor` checks `config.engines?.python3` at `packages/runner/src/executor/select.ts:17`
- Python executor spawns `python3 -m runner_python <bootConfigPath>`, strips 3 env vars
- Node executor spawns `node <entry> <bootConfigPath>` with 6-slot stdio
- Docker image selection at `docker-sequence-adapter.ts:262-264`: `"python3" in engines ? python3 : node`
- K8s image selection at `kubernetes-instance-adapter.ts:192-194`: `config.engines.python3 ? python3 : node`
- K8s config decoder at `kubernetes-config-decoder.ts:14-17` uses `JsonDecoder.object`
- Default config at `default-config.ts:30-33,58-61`: `runnerImages: { python3, node }`
- Image config at `image-config.json`: `runner: { node, python3 }`
- CLI options in `hub.ts:137-168`: `--runner-image/--runner-py-image` and `--k8s-runner-image/--k8s-runner-py-image`
- Config types at `sth-configuration.ts:115,136-139`: `runnerImages: { python3: string, node: string }`

### Metis Review
**Key Gaps Addressed**:
- **Selection precedence**: bun > python3 > node with no fallback behavior
- **Engine contract**: `engines.bun` presence (truthy) triggers bun selection
- **Config surface**: Added explicit checklist of every config entry point
- **Env stripping**: Reuse Python's env-strip pattern exactly
- **Container validation**: Added smoke test for `bun --version` + `node --version` inside built image

---

## Work Objectives

### Core Objective
Add a new `runner-bun` runtime wrapper to `packages/runner` that can execute Bun-backed sequences with the same boot-config protocol, stdio layout, and host-visible semantics as the existing Node and Python wrappers.

### Concrete Deliverables
- `RuntimeKind` extended with `"bun"`
- `packages/runner-bun/` package with bootstrap entry and boot-config validation
- `packages/runner/src/executor/bun-process-executor.ts` — Bun spawn executor
- `packages/runner/src/executor/runner-bun-launcher.ts` — Bun entry resolution
- `packages/runner/src/executor/select.ts` — selection logic updated
- `packages/runner/src/bin/start-runner.ts` — conditional entry resolution
- Config types, defaults, image-config, CLI flags updated
- Docker and K8s adapter image selection updated
- `K8SAdapterConfiguration` decoder updated with `bun` field
- `detectLanguage` updated for Bun engines
- Tests for executor selection, bun process executor, env stripping
- `scramjetorg/runner-bun` Docker image

### Definition of Done
- [ ] All unit tests pass (`npm test` in affected packages)
- [ ] `selectExecutor({ engines: { bun: "1.x" } })` returns bun executor
- [ ] Bun executor spawns `bun <entry> <bootConfigPath>` with correct stdio layout
- [ ] Bun executor strips SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO from child env
- [ ] Docker adapter selects `runnerImages.bun` when `"bun" in engines`
- [ ] K8s adapter selects `runnerImages.bun` when `config.engines.bun`
- [ ] K8s config decoder accepts `bun` in `runnerImages`
- [ ] `config-service.ts` merges `image-config.json` `runner.bun` into defaults
- [ ] All Node/Python tests continue to pass unchanged

### Must Have
- Bun sequences runnable through `packages/runner` with executor protocol
- Boot config passed via file (NOT env vars)
- 6-slot stdio layout (fd0-fd5) identical to Node/Python
- SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO stripped from child env
- Docker and K8s adapters select the correct image for Bun
- Config types, defaults, decoders, CLI accept `bun` runner image
- No breaking changes to existing Node/Python paths

### Must NOT Have (Guardrails)
- NO changes to the host/adapter spawning logic (still spawns `packages/runner`)
- NO changes to existing Node/Python runner behavior
- NO Bun package-install or build-pipeline changes
- NO hidden fallback from Bun to Node — fail fast if Bun cannot run
- NO protocol changes to boot config or fd layout
- NO generic multi-runtime refactoring beyond what's needed to add Bun
- NO CI/release pipeline changes beyond Docker image building
- NO documentation updates beyond what's in the plan

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (AVA for TS tests, pytest for Python parity)
- **Automated tests**: TDD (tests written alongside implementation)
- **Framework**: AVA for `packages/runner` executor tests; `bun test` for `packages/runner-bun` internal tests

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Library/Module**: Use Bash (bun test / npx ava) to run tests
- **Config changes**: Use Bash to run the config service and verify output
- **Docker image**: Use Bash to build and inspect the image
- **Adapter logic**: Use Bash to run adapter unit tests

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - types + config scaffolding, MAX PARALLEL):
├── Task 1: RuntimeKind + config types update [quick]
├── Task 2: Bun executor (bun-process-executor.ts) [quick]
├── Task 3: Bun launcher (runner-bun-launcher.ts) [quick]
├── Task 4: selectExecutor update [quick]
└── Task 5: Runner-bun package scaffolding [quick]

Wave 2 (Config + adapter plumbing, MAX PARALLEL):
├── Task 6: Config types + defaults + image-config [quick]
├── Task 7: CLI flags in hub.ts [quick]
├── Task 8: K8s config decoder update [quick]
├── Task 9: Docker adapter image selection [quick]
├── Task 10: K8s adapter image selection [quick]
└── Task 11: detectLanguage update [quick]

Wave 3 (Runner integration, MAX PARALLEL):
├── Task 12: start-runner.ts bun entry resolution [unspecified-high]
├── Task 13: Runner-bun bootstrap entry + boot-config [unspecified-high]
└── Task 14: Runner-bun package.json + tsconfig [quick]

Wave 4 (Tests):
├── Task 15: select-executor tests [quick]
├── Task 16: bun-process-executor tests [unspecified-low]
├── Task 17: bun-env-strip tests [unspecified-low]
└── Task 18: integration/regression verification [unspecified-high]

Wave 5 (Docker + final):
├── Task 19: Runner-bun Dockerfile + docker-entrypoint [quick]
├── Task 20: Build + smoke test runner-bun image [deep]
├── Task 21: Adapter integration tests for bun image selection [unspecified-low]
└── Task 22: Full regression test run [unspecified-high]

Wave FINAL (Parallel review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

---

## TODOs

- [ ] 1. **Extend `RuntimeKind` and `SpawnOptions` with `"bun"`**

  **What to do**:
  - In `packages/types/src/runtime-executor.ts`:
    - Change `RuntimeKind` from `"node" | "python3"` to `"node" | "python3" | "bun"`
    - Add JSDoc comment documenting the new kind
  - No changes needed to `BootConfig` or `SpawnOptions` — they're already generic
  - Add `BunSpawnOptions` type alias: `export interface BunSpawnOptions extends SpawnOptions {}` (mirrors `PythonSpawnOptions`)

  **Must NOT do**:
  - Do not change the shape of `BootConfig` or `SpawnOptions`
  - Do not add Bun-specific fields to boot config

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3, 4, 15
  - **Blocked By**: None

  **References**:
  - `packages/types/src/runtime-executor.ts:8` — current `RuntimeKind` type definition
  - `packages/types/src/runtime-executor.ts:68` — `PythonSpawnOptions` as pattern for `BunSpawnOptions`

  **Acceptance Criteria**:
  - [ ] `RuntimeKind` accepts `"bun"` as a valid value
  - [ ] TypeScript compilation passes without errors
  - [ ] `BunSpawnOptions` is exported from `@scramjet/types`

  **QA Scenarios**:
  ```
  Scenario: RuntimeKind accepts "bun"
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit packages/types/src/runtime-executor.ts
      2. Check for compilation errors
    Expected Result: No type errors
    Evidence: .omo/evidence/task-1-runtime-kind-compiles.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-1-runtime-kind-compiles.txt`

  **Commit**: NO (groups with 2)

- [ ] 2. **Create `bun-process-executor.ts`**

  **What to do**:
  - Create `packages/runner/src/executor/bun-process-executor.ts` following the pattern of `python-process-executor.ts`
  - Export `RUNNER_BUN_STDIO` constant: `["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const`
  - Export `spawnRunnerBun(opts: SpawnOptions): RuntimeProcessHandles`:
    - Read `process.env.BUN_BIN || "bun"` for the bun executable (mirrors `PYTHON_BIN`)
    - Spawn with `bun <opts.runtimeEntry> <opts.bootConfigPath>`
    - Strip `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` from child env
    - If `opts.env` is provided, merge it after stripping
    - Use same 6-slot stdio layout
    - Return `{ child, stdout, stderr, control, monitoring }` matching `RuntimeProcessHandles`
  - Export `bunExecutor: RuntimeExecutor` instance

  **Must NOT do**:
  - Do not add IPC message sending
  - Do not add ts-node / transpilation flags (Bun runs TS natively)
  - Do not mutate `process.env`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 12, 15, 16, 17
  - **Blocked By**: Task 1 (RuntimeKind)

  **References**:
  - `packages/runner/src/executor/python-process-executor.ts` — exact pattern to follow (full file, 75 lines)
  - `packages/runner/src/executor/process-executor.ts:18` — stdio layout constant pattern
  - `packages/types/src/runtime-executor.ts:71-82` — `RuntimeProcessHandles` return type

  **Acceptance Criteria**:
  - [ ] File created at `packages/runner/src/executor/bun-process-executor.ts`
  - [ ] Exports `RUNNER_BUN_STDIO`, `spawnRunnerBun`, `bunExecutor`
  - [ ] `spawnRunnerBun` spawns with `bun` executable
  - [ ] Child env does NOT contain `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`
  - [ ] Uses same 6-slot stdio layout
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: bun executor exports correct shape
    Tool: Bash
    Steps:
      1. Run: cat packages/runner/src/executor/bun-process-executor.ts
      2. Verify exports: RUNNER_BUN_STDIO, spawnRunnerBun, bunExecutor
    Expected Result: All three exports exist with correct types
    Evidence: .omo/evidence/task-2-executor-exports.txt

  Scenario: TypeScript compilation passes
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit -p packages/runner/tsconfig.build.json
    Expected Result: No compilation errors
    Evidence: .omo/evidence/task-2-executor-compiles.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-2-executor-exports.txt`
  - [ ] `task-2-executor-compiles.txt`

  **Commit**: NO (groups with 1)

- [ ] 3. **Create `runner-bun-launcher.ts`**

  **What to do**:
  - Create `packages/runner/src/executor/runner-bun-launcher.ts` following the pattern of `runner-node-launcher.ts`
  - Export `ResolvedRunnerBunEntry` interface with `{ entry: string; needsTsNode: boolean }`
  - Export `resolveRunnerBunEntry(callerDir: string): ResolvedRunnerBunEntry`:
    - Try `require.resolve("@scramjet/runner-bun/package.json")` for production path
    - Fall back to walking up from `callerDir` to find sibling `runner-bun/` directory
    - Look for `dist/bin/runner-bun.js` (compiled) or `src/bin/runner-bun.ts` (source-tree dev)
    - Return `{ entry, needsTsNode: false }` — Bun runs TS natively, no ts-node needed
  - Set `needsTsNode` to `false` always since Bun natively runs TypeScript

  **Must NOT do**:
  - Do NOT set `needsTsNode: true` — Bun runs TS natively
  - Do not use `ts-node` or `tsx` flags

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 12
  - **Blocked By**: Task 1 (RuntimeKind)

  **References**:
  - `packages/runner/src/executor/runner-node-launcher.ts` — exact pattern to follow (full file, 76 lines)
  - `packages/runner-node/src/bin/runner-node.ts` — entry that launcher resolves to

  **Acceptance Criteria**:
  - [ ] File created at `packages/runner/src/executor/runner-bun-launcher.ts`
  - [ ] Exports `resolveRunnerBunEntry`
  - [ ] Returns absolute path to runner-bun entry
  - [ ] `needsTsNode` is always `false`
  - [ ] Falls back gracefully when runner-bun is not installed

  **QA Scenarios**:
  ```
  Scenario: resolveRunnerBunEntry returns absolute path
    Tool: Bash
    Steps:
      1. Run: grep -n "export function resolveRunnerBunEntry" packages/runner/src/executor/runner-bun-launcher.ts
    Expected Result: Function exists
    Evidence: .omo/evidence/task-3-launcher-function.txt

  Scenario: never sets needsTsNode
    Tool: Bash
    Steps:
      1. Run: grep "needsTsNode" packages/runner/src/executor/runner-bun-launcher.ts
    Expected Result: needsTsNode is always false
    Evidence: .omo/evidence/task-3-notsnodo.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-3-launcher-function.txt`
  - [ ] `task-3-notsnodo.txt`

  **Commit**: NO (groups with 1, 2)

- [ ] 4. **Update `selectExecutor` in `select.ts`**

  **What to do**:
  - In `packages/runner/src/executor/select.ts`:
    - Import `bunExecutor` from `./bun-process-executor`
    - Update `selectExecutor` to check `config.engines?.bun` FIRST (highest priority)
    - Then check `config.engines?.python3` (as before)
    - Default to `nodeExecutor` (as before)
  - Result: `bun` > `python3` > `node` precedence

  **Must NOT do**:
  - Do not change `nodeExecutor` or `pythonExecutor`
  - Do not add fallback logic — if bun is requested, must use bun

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `packages/runner/src/executor/select.ts` — current implementation (23 lines)

  **Acceptance Criteria**:
  - [ ] `selectExecutor({ engines: { bun: "1.x" } })` returns `bunExecutor`
  - [ ] `selectExecutor({ engines: { python3: "3.9" } })` returns `pythonExecutor`
  - [ ] `selectExecutor({ engines: {} })` returns `nodeExecutor`
  - [ ] `selectExecutor({ engines: { bun: "1.x", python3: "3.9" } })` returns `bunExecutor` (bun wins)

  **QA Scenarios**:
  ```
  Scenario: selection precedence is bun > python3 > node
    Tool: Bash
    Steps:
      1. Read the select.ts file
      2. Verify the if-check order: bun first, then python3, default node
    Expected Result: bun checked first
    Evidence: .omo/evidence/task-4-selection-order.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-4-selection-order.txt`

  **Commit**: NO (groups with 1, 2, 3)

- [ ] 5. **Scaffold `packages/runner-bun/` package**

  **What to do**:
  - Create `packages/runner-bun/` directory with:
    - `package.json` — name `@scramjet/runner-bun`, version `1.1.0`, private: true
    - Add scripts: `"test": "bun test"`, `"build"`, `"clean"`
    - Add dependencies matching `@scramjet/runner-node`:
      - `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/bpmux`, `@scramjet/client-utils`, `@scramjet/model`, `@scramjet/obj-logger`, `@scramjet/symbols`, `@scramjet/utility`, `scramjet`
    - Add devDependencies: `@scramjet/types`, `bun-types` (if available)
    - Create `tsconfig.json` (can be minimal, Bun ignores it mostly)
    - Create `src/bin/runner-bun.ts` — minimal placeholder entry

  **Must NOT do**:
  - Do not add actual entry logic yet (that's Task 13)
  - Do not add Dockerfile yet (that's Task 19)
  - Do not register in workspaces — `packages/*` glob includes it automatically per root `package.json`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 13, 14, 19
  - **Blocked By**: None

  **References**:
  - `packages/runner-node/package.json` — exact dependencies to mirror
  - `packages/runner-node/tsconfig.json` — tsconfig pattern
  - `packages/runner-node/src/bin/runner-node.ts` — entry structure pattern

  **Acceptance Criteria**:
  - [ ] `packages/runner-bun/package.json` created with correct name, version, deps
  - [ ] `packages/runner-bun/src/bin/runner-bun.ts` exists
  - [ ] `packages/runner-bun/package.json` is included in workspaces via `packages/*` glob

  **QA Scenarios**:
  ```
  Scenario: package.json is valid
    Tool: Bash
    Steps:
      1. Run: node -e "JSON.parse(require('fs').readFileSync('packages/runner-bun/package.json','utf8'))"
    Expected Result: No error (valid JSON)
    Evidence: .omo/evidence/task-5-package-json-valid.txt

  Scenario: src/bin/runner-bun.ts exists
    Tool: Bash
    Steps:
      1. Run: ls packages/runner-bun/src/bin/runner-bun.ts
    Expected Result: File exists
    Evidence: .omo/evidence/task-5-bin-entry-exists.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-5-package-json-valid.txt`
  - [ ] `task-5-bin-entry-exists.txt`

  **Commit**: YES
  - Message: `feat(runner-bun): scaffold runner-bun package and executor infrastructure`
  - Files: packages/types/src/runtime-executor.ts, packages/runner/src/executor/bun-process-executor.ts, packages/runner/src/executor/runner-bun-launcher.ts, packages/runner/src/executor/select.ts, packages/runner-bun/package.json, packages/runner-bun/src/bin/runner-bun.ts

- [ ] 6. **Update config types, defaults, and image-config for `runnerImages.bun`**

  **What to do**:
  - In `packages/types/src/sth-configuration.ts`:
    - Line 115: Add `bun: string` to `K8SAdapterConfiguration.runnerImages`
    - Lines 136-139: Add `bun: string` to `DockerAdapterConfiguration.runnerImages`
  - In `packages/sth-config/src/default-config.ts`:
    - Lines 30-33: Add `bun: ""` to `docker.runnerImages`
    - Lines 58-61: Add `bun: ""` to `kubernetes.runnerImages`
  - In `packages/sth-config/src/image-config.json`:
    - Add `"bun": "scramjetorg/runner-bun:1.1.0"` to `runner` object

  **Must NOT do**:
  - Do not change existing `node` or `python3` entries
  - Do not add optional/default logic — trust existing config merge pattern

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11)
  - **Blocks**: Task 21
  - **Blocked By**: Task 1

  **References**:
  - `packages/types/src/sth-configuration.ts:115,136-139` — existing runnerImages types
  - `packages/sth-config/src/default-config.ts:30-33,58-61` — existing defaults
  - `packages/sth-config/src/image-config.json:4-6` — existing image tags

  **Acceptance Criteria**:
  - [ ] `K8SAdapterConfiguration.runnerImages` includes `bun: string`
  - [ ] `DockerAdapterConfiguration.runnerImages` includes `bun: string`
  - [ ] `default-config.ts` has `bun: ""` in both docker and kubernetes runnerImages
  - [ ] `image-config.json` has `"bun": "scramjetorg/runner-bun:1.1.0"`
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: runnerImages.bun in type definitions
    Tool: Bash
    Steps:
      1. grep "bun" packages/types/src/sth-configuration.ts
    Expected Result: bun appears in runnerImages
    Evidence: .omo/evidence/task-6-config-types-bun.txt

  Scenario: runnerImages.bun in defaults
    Tool: Bash
    Steps:
      1. grep "bun" packages/sth-config/src/default-config.ts
    Expected Result: bun appears in both docker and kubernetes runnerImages
    Evidence: .omo/evidence/task-6-defaults-bun.txt

  Scenario: runnerImages.bun in image-config
    Tool: Bash
    Steps:
      1. node -e "console.log(JSON.stringify(require('./packages/sth-config/src/image-config.json').runner))"
    Expected Result: Output includes "bun" key
    Evidence: .omo/evidence/task-6-image-config-bun.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-6-config-types-bun.txt`
  - [ ] `task-6-defaults-bun.txt`
  - [ ] `task-6-image-config-bun.txt`

  **Commit**: NO (groups with 7, 8, 9, 10, 11)

- [ ] 7. **Add Bun CLI flags in `hub.ts`**

  **What to do**:
  - In `packages/sth/src/bin/hub.ts`:
    - Add `--runner-bun-image` CLI option (string, default from image-config)
    - Add `--k8s-runner-bun-image` CLI option (string, default from image-config)
    - Line 137-140: Add `bun: options.runnerBunImage` to `docker.runnerImages`
    - Line 166-169: Add `bun: options.k8sRunnerBunImage` to `kubernetes.runnerImages`

  **Must NOT do**:
  - Do not change existing image flag parsing
  - Follow the exact same pattern as `--runner-py-image` / `--k8s-runner-py-image`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  - `packages/sth/src/bin/hub.ts:137-140,166-169` — existing `runnerImages` wiring for `python3`
  - Search for `runnerPyImage` in hub.ts for the pattern to follow

  **Acceptance Criteria**:
  - [ ] `--runner-bun-image` CLI option exists
  - [ ] `--k8s-runner-bun-image` CLI option exists
  - [ ] Both options propagate to config properly

  **QA Scenarios**:
  ```
  Scenario: CLI flags exist
    Tool: Bash
    Steps:
      1. grep "runner-bun-image" packages/sth/src/bin/hub.ts
    Expected Result: Both --runner-bun-image and --k8s-runner-bun-image appear
    Evidence: .omo/evidence/task-7-cli-flags.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-7-cli-flags.txt`

  **Commit**: NO (groups with 6)

- [ ] 8. **Update K8s config decoder for `runnerImages.bun`**

  **What to do**:
  - In `packages/adapter-kubernetes/src/kubernetes-config-decoder.ts`:
    - Add `bun: JsonDecoder.string` to the `runnerImages` object decoder
    - Update the decoder label from `"K8SImagesDecoder"` to include bun

  **Must NOT do**:
  - Do not change the existing `python3` or `node` decoder entries
  - Do not make `bun` optional — same as other images

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Task 6

  **References**:
  - `packages/adapter-kubernetes/src/kubernetes-config-decoder.ts:14-17` — existing decoder structure

  **Acceptance Criteria**:
  - [ ] K8s config decoder accepts `bun` field in `runnerImages`
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: decoder includes bun
    Tool: Bash
    Steps:
      1. grep "bun" packages/adapter-kubernetes/src/kubernetes-config-decoder.ts
    Expected Result: bun: JsonDecoder.string present in runnerImages object
    Evidence: .omo/evidence/task-8-decoder-bun.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-8-decoder-bun.txt`

  **Commit**: NO (groups with 6, 7, 9, 10, 11)

- [ ] 9. **Update Docker adapter image selection for Bun**

  **What to do**:
  - In `packages/adapter-docker/src/docker-sequence-adapter.ts`:
    - Line 262-264: Update image selection logic to ternary chain:
      ```ts
      container.image = "bun" in engines
          ? this.dockerConfig.runnerImages.bun
          : "python3" in engines
              ? this.dockerConfig.runnerImages.python3
              : this.dockerConfig.runnerImages.node;
      ```
    - Line 58-59: Add `"bun runner image"` to the logger.info init trace

  **Must NOT do**:
  - Do not change existing `python3` or `node` behavior
  - Do not change the `detectLanguage` usage on line 281 (Task 11 handles that)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 21
  - **Blocked By**: Task 6

  **References**:
  - `packages/adapter-docker/src/docker-sequence-adapter.ts:58-59,262-264` — exact lines to change

  **Acceptance Criteria**:
  - [ ] Docker adapter selects `runnerImages.bun` when `"bun" in engines`
  - [ ] Docker adapter still selects `runnerImages.python3` when `"python3" in engines` (no bun)
  - [ ] Docker adapter still selects `runnerImages.node` when no bun/python3
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: image selection branches updated
    Tool: Bash
    Steps:
      1. grep -A5 "container.image" packages/adapter-docker/src/docker-sequence-adapter.ts
    Expected Result: Shows ternary chain with bun, python3, node
    Evidence: .omo/evidence/task-9-docker-image-selection.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-9-docker-image-selection.txt`

  **Commit**: NO (groups with 6, 7, 8, 10, 11)

- [ ] 10. **Update K8s adapter image selection for Bun**

  **What to do**:
  - In `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`:
    - Lines 192-194: Update image selection logic to ternary chain:
      ```ts
      const runnerImage = config.engines.bun
          ? this.adapterConfig.runnerImages.bun
          : config.engines.python3
              ? this.adapterConfig.runnerImages.python3
              : this.adapterConfig.runnerImages.node;
      ```

  **Must NOT do**:
  - Do not change existing python3 or node behavior
  - Do not touch the K8s sequence adapter (it logs runnerImages but doesn't select)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 21
  - **Blocked By**: Tasks 6, 8

  **References**:
  - `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts:192-194` — exact lines to change

  **Acceptance Criteria**:
  - [ ] K8s adapter selects `runnerImages.bun` when `config.engines.bun` is present
  - [ ] K8s adapter still selects `runnerImages.python3` when `config.engines.python3` (no bun)
  - [ ] K8s adapter still selects `runnerImages.node` when no bun/python3
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: K8s image selection branches updated
    Tool: Bash
    Steps:
      1. grep -B2 -A5 "runnerImage" packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts | head -20
    Expected Result: Shows ternary chain with bun, python3, node
    Evidence: .omo/evidence/task-10-k8s-image-selection.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-10-k8s-image-selection.txt`

  **Commit**: NO (groups with 6, 7, 8, 9, 11)

- [ ] 11. **Update `detectLanguage` for Bun engines**

  **What to do**:
  - In `packages/adapters-common/src/utils.ts`:
    - Line 17-20: Add check for `"bun"` in `packageJson.engines`:
      ```ts
      if ("bun" in packageJson.engines) return "js";
      ```
    - Place it before the `python3` check (or after — both return, order doesn't matter)
    - Bun files are JS/TS so returning "js" is correct

  **Must NOT do**:
  - Do not create a new language label for Bun (it's JavaScript/TypeScript)
  - Do not change existing `python3` or `node` detection

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `packages/adapters-common/src/utils.ts:16-23` — exact function to modify

  **Acceptance Criteria**:
  - [ ] `detectLanguage({ engines: { bun: "1.x" } })` returns `"js"`
  - [ ] `detectLanguage({ engines: { python3: "3.9" } })` still returns `"py"`
  - [ ] `detectLanguage({ engines: { node: ">=16" } })` still returns `"js"`
  - [ ] TypeScript compilation passes

  **QA Scenarios**:
  ```
  Scenario: detectLanguage returns "js" for bun
    Tool: Bash
    Steps:
      1. grep -A3 "bun.*engines" packages/adapters-common/src/utils.ts
    Expected Result: Shows bun returning "js"
    Evidence: .omo/evidence/task-11-detect-language-bun.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-11-detect-language-bun.txt`

  **Commit**: YES
  - Message: `feat(config): add bun to config types, defaults, CLI, adapters, decoder, detectLanguage`
  - Files: packages/types/src/sth-configuration.ts, packages/sth-config/src/default-config.ts, packages/sth-config/src/image-config.json, packages/sth/src/bin/hub.ts, packages/adapter-kubernetes/src/kubernetes-config-decoder.ts, packages/adapter-docker/src/docker-sequence-adapter.ts, packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts, packages/adapters-common/src/utils.ts

- [ ] 12. **Update `start-runner.ts` for bun entry resolution**

  **What to do**:
  - In `packages/runner/src/bin/start-runner.ts`:
    - Import `resolveRunnerBunEntry` from `"../executor/runner-bun-launcher"`
    - After selecting executor, resolve bun entry when engines.bun is set:
      ```ts
      const entry = engines.bun
          ? resolveRunnerBunEntry(__dirname)
          : resolveRunnerNodeEntry(__dirname);
      ```
    - The executor spawn already uses `entry.entry` generically — no spawn change needed
    - When bun is selected, do NOT set `NODE_OPTIONS` for ts-node

  **Must NOT do**: No changes to Node/Python resolution path

  **Recommended Agent Profile**: Category: `unspecified-high`, Skills: `[]`
  **Wave**: 3; **Depends on**: Tasks 2, 3, 4

  **References**: `packages/runner/src/bin/start-runner.ts:153-178`

  **Acceptance Criteria**: Bun engine resolves runner-bun entry; Node/Python unchanged

  **QA**: `grep "resolveRunnerBunEntry" packages/runner/src/bin/start-runner.ts` → exists
  **Evidence**: `task-12-start-runner-bun.txt`
  **Commit**: groups with 13, 14

- [ ] 13. **Implement runner-bun bootstrap entry**

  **What to do**:
  - Create `packages/runner-bun/src/bin/runner-bun.ts` following `runner-node/src/bin/runner-node.ts`
  - Export `bootstrap(overrides?)` that:
    - Reads boot config from `process.argv[2]`
    - Creates fd4/fd5 streams
    - Connects to host via HostClient
    - Loads sequence module natively (no transpilation)
    - Runs sequence with lifecycle management
    - Writes monitoring frames and exit code
  - Add `if (require.main === module) bootstrap()`

  **Must NOT do**: No ts-node; no Python-specific fields

  **Recommended Agent Profile**: Category: `unspecified-high`, Skills: `[]`
  **Wave**: 3; **Depends on**: Task 5

  **References**: `packages/runner-node/src/bin/runner-node.ts` (273 lines)

  **Acceptance Criteria**: bootstrap function exists, reads argv[2], creates fd streams, connects to host

  **QA**: `grep "bootstrap" packages/runner-bun/src/bin/runner-bun.ts` → function declared
  **Evidence**: `task-13-bootstrap-exists.txt`
  **Commit**: groups with 12, 14

- [ ] 14. **Implement runner-bun boot-config validation**

  **What to do**:
  - Create `packages/runner-bun/src/boot-config.ts` mirroring `runner-node/src/boot-config.ts`
  - Export: `parseBootConfigPathFromArgv`, `validateBootConfig`, `readBootConfig`
  - Validate: `sequencePath`, `instanceId`, `instancesServerPort/Host`, etc.
  - Same interface and rules as runner-node

  **Must NOT do**: No Bun-specific boot config fields

  **Recommended Agent Profile**: Category: `quick`, Skills: `[]`
  **Wave**: 3; **Depends on**: Task 5

  **References**: `packages/runner-node/src/boot-config.ts` (168 lines)

  **Acceptance Criteria**: All 3 functions exported; validation rules match runner-node

  **QA**: `grep "export function" packages/runner-bun/src/boot-config.ts` → all 3 present
  **Evidence**: `task-14-boot-config-exports.txt`

  **Commit**: YES (groups 12-14): `feat(runner-bun): implement bootstrap entry, boot-config, start-runner integration`

- [ ] 15. **Add bun selection tests to select-executor.spec.ts**

  **What to do**:
  - Add tests:
    - `"selectExecutor returns bun when engines.bun is set"` → `executor.kind === "bun"`
    - `"selectExecutor prefers bun over python3 when both set"`
    - `"selectExecutor prefers bun over node when both set"`

  **Must NOT do**: Don't modify existing tests

  **Recommended Agent Profile**: Category: `quick`, Skills: `[]`
  **Wave**: 4; **Depends on**: Tasks 1, 2, 4

  **References**: `packages/runner/test/executor/select-executor.spec.ts`

  **Acceptance Criteria**: 3 new tests pass with `npx ava`

  **QA**: `npx ava packages/runner/test/executor/select-executor.spec.ts` → all pass
  **Evidence**: `task-15-select-tests-pass.txt`
  **Commit**: groups with 18

- [ ] 16. **Create bun-process-executor contract tests**

  **What to do**:
  - Create `packages/runner/test/executor/bun-process-executor.spec.ts` following `python-process-executor.spec.ts`
  - Tests:
    - `"RUNNER_BUN_STDIO layout matches RUNNER_NODE_STDIO"`
    - `"spawnRunnerBun returns RuntimeProcessHandles shape"`
    - `"child missing boot config exits non-zero"`
    - `"env strips SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO"`
    - `"boot-config path arrives at argv[2]"`
    - `"NO REQUESTS channel opened"`
    - `"fd3 is IPC and not written to"`

  **Must NOT do**: Don't test actual sequence execution

  **Recommended Agent Profile**: Category: `unspecified-low`, Skills: `[]`
  **Wave**: 4; **Depends on**: Tasks 2, 3, 4

  **References**: `packages/runner/test/executor/python-process-executor.spec.ts` (131 lines)

  **Acceptance Criteria**: 7 tests compile and run

  **QA**: `npx tsc --noEmit packages/runner/test/executor/bun-process-executor.spec.ts` → no errors
  **Evidence**: `task-16-bun-tests-compile.txt`
  **Commit**: groups with 18

- [ ] 17. **Create bun-env-strip test**

  **What to do**:
  - Create `packages/runner/test/executor/bun-env-strip.spec.ts` mirroring `python-env-strip.spec.ts`
  - Test: outer runner strips SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO from bun child env
  - Create Bun test fixture (simple script that prints its env)

  **Must NOT do**: Don't modify python-env-strip test

  **Recommended Agent Profile**: Category: `unspecified-low`, Skills: `[]`
  **Wave**: 4; **Depends on**: Tasks 2, 4

  **References**: `packages/runner/test/executor/python-env-strip.spec.ts` (53 lines)

  **Acceptance Criteria**: Test verifies 3 env vars stripped

  **QA**: `ls packages/runner/test/executor/bun-env-strip.spec.ts` → exists
  **Evidence**: `task-17-bun-env-strip-exists.txt`
  **Commit**: groups with 18

- [ ] 18. **Integration test: full regression verification**

  **What to do**:
  - Run full test suite for affected packages
  - Verify: all existing Node/Python selection tests unchanged
  - Verify: all new bun executor tests pass
  - Verify: TypeScript compiles for all affected packages

  **Must NOT do**: Don't require Docker/K8s

  **Recommended Agent Profile**: Category: `unspecified-high`, Skills: `[]`
  **Wave**: 4; **Depends on**: Tasks 6-17

  **Acceptance Criteria**: All tests pass; no regressions

  **QA**: `npx ava packages/runner/test/executor/*.spec.ts` → all pass
  **Evidence**: `task-18-regression-pass.txt`

  **Commit**: YES (groups 15-18): `test(runner): add bun executor selection, contract, env-strip tests`

- [ ] 19. **Create runner-bun Dockerfile and entrypoint**

  **What to do**:
  - Create `packages/runner-bun/Dockerfile` (pattern: `runner-python/Dockerfile`):
    - `FROM oven/bun:1-slim`
    - Install Node.js via nodesource (same as runner-python)
    - Copy outer runner JS tree (same builder stages)
    - Copy runner-bun source files
    - Install bun dependencies
    - `ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]`
    - `CMD ["start-runner"]`
  - Create `packages/runner-bun/docker-entrypoint.sh` (mirror runner-python)
  - Create `packages/runner-bun/unpack.sh` and `wait-for-sequence-and-start.sh`

  **Must NOT do**: Don't use npm/yarn for bun deps

  **Recommended Agent Profile**: Category: `quick`, Skills: `[]`
  **Wave**: 5; **Depends on**: Task 5

  **References**: `packages/runner-python/Dockerfile` (110 lines)

  **Acceptance Criteria**: Dockerfile and entrypoint created

  **QA**: `ls packages/runner-bun/Dockerfile packages/runner-bun/docker-entrypoint.sh` → files exist
  **Evidence**: `task-19-dockerfile-exists.txt`
  **Commit**: groups with 20

- [ ] 20. **Build and smoke test runner-bun Docker image**

  **What to do**:
  - Build the image: `docker build -f packages/runner-bun/Dockerfile -t scramjetorg/runner-bun:dev .`
  - Smoke tests:
    - `docker run --rm scramjetorg/runner-bun:dev bun --version`
    - `docker run --rm scramjetorg/runner-bun:dev node --version`
    - `docker run --rm scramjetorg/runner-bun:dev which start-runner`

  **Must NOT do**: Don't push to registry

  **Recommended Agent Profile**: Category: `deep`, Skills: `[]`
  **Wave**: 5; **Depends on**: Tasks 13, 14, 19

  **Acceptance Criteria**: Image builds; bun and node both work

  **QA**: `docker run --rm scramjetorg/runner-bun:dev bun --version` → outputs version
  **Evidence**: `task-20-bun-version.txt`, `task-20-node-version.txt`

  **Commit**: YES (groups 19-20): `feat(docker): add runner-bun Docker image with Bun + Node.js`

- [ ] 21. **Add adapter bun image selection tests**

  **What to do**:
  - Docker adapter: verify `engines: { bun: "1.x" }` selects `runnerImages.bun`
  - K8s adapter: verify `config.engines.bun` selects `runnerImages.bun`
  - K8s config decoder: verify JSON with `bun` field decodes successfully
  - Add tests in adapter test files or inline assertions

  **Must NOT do**: Don't require actual Docker/K8s runtime

  **Recommended Agent Profile**: Category: `unspecified-low`, Skills: `[]`
  **Wave**: 5; **Depends on**: Tasks 6, 8, 9, 10

  **Acceptance Criteria**: Tests verify bun image selection

  **QA**: `grep -rl "bun" packages/adapter-*/test/` → tests exist
  **Evidence**: `task-21-adapter-tests.txt`
  **Commit**: groups with 22

- [ ] 22. **Full regression test run**

  **What to do**:
  - Run full test suites: ava executor tests, transport tests
  - TypeScript compilation check on all affected packages
  - Lint check on changed files

  **Must NOT do**: Don't skip tests

  **Recommended Agent Profile**: Category: `unspecified-high`, Skills: `[]`
  **Wave**: 5; **Depends on**: All previous

  **Acceptance Criteria**: All tests pass; no regressions; TS compiles

  **QA**:
  ```
  npx ava packages/runner/test/executor/*.spec.ts
  npx ava packages/runner/test/transport/*.spec.ts
  npx tsc --noEmit -p packages/runner/tsconfig.build.json
  ```
  **Evidence**: `task-22-full-regression.txt`

  **Commit**: YES (groups 21-22): `test(adapters): add bun image selection, verify full regression`

---

## Final Verification Wave (MANDATORY)

---

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test` / `npm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1-5**: `feat(runner-bun): scaffold runner-bun package and executor infrastructure`
  Files: packages/types/src/runtime-executor.ts, packages/runner/src/executor/bun-process-executor.ts, packages/runner/src/executor/runner-bun-launcher.ts, packages/runner/src/executor/select.ts, packages/runner-bun/package.json, packages/runner-bun/src/bin/runner-bun.ts
- **6-11**: `feat(config): add bun to config types, defaults, CLI, adapters, decoder, detectLanguage`
  Files: packages/types/src/sth-configuration.ts, packages/sth-config/src/default-config.ts, packages/sth-config/src/image-config.json, packages/sth/src/bin/hub.ts, packages/adapter-kubernetes/src/kubernetes-config-decoder.ts, packages/adapter-docker/src/docker-sequence-adapter.ts, packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts, packages/adapters-common/src/utils.ts
- **12-14**: `feat(runner-bun): implement bootstrap entry, boot-config, and start-runner integration`
  Files: packages/runner-bun/src/bin/runner-bun.ts, packages/runner-bun/src/boot-config.ts, packages/runner/src/bin/start-runner.ts
- **15-18**: `test(runner): add bun executor selection, contract, and env-strip tests`
  Files: packages/runner/test/executor/select-executor.spec.ts, packages/runner/test/executor/bun-process-executor.spec.ts, packages/runner/test/executor/bun-env-strip.spec.ts
- **19-20**: `feat(docker): add runner-bun Docker image and smoke test`
  Files: packages/runner-bun/Dockerfile, packages/runner-bun/docker-entrypoint.sh
- **21-22**: `chore: final regression verification for runner-bun wrapper`
  Files: adapter test files
- **F1-F4**: `chore(review): final verification gate`

---

## Success Criteria

### Verification Commands
```bash
# Typecheck
npx tsc --noEmit -p packages/runner/tsconfig.build.json
npx tsc --noEmit -p packages/types/tsconfig.build.json

# Unit tests (packages/runner executor tests)
npx ava packages/runner/test/executor/select-executor.spec.ts
npx ava packages/runner/test/executor/bun-*.spec.ts

# Unit tests (packages/runner-bun)
cd packages/runner-bun && bun test

# Docker image build
docker build -f packages/runner-bun/Dockerfile -t scramjetorg/runner-bun:dev .

# Docker image smoke test
docker run --rm scramjetorg/runner-bun:dev bun --version
docker run --rm scramjetorg/runner-bun:dev node --version

# Regression (existing tests pass)
npx ava packages/runner/test/executor/select-executor.spec.ts
npx ava packages/runner/test/executor/python-process-executor.spec.ts
npx ava packages/runner/test/executor/passthrough-python.spec.ts
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Docker image builds with both bun and node
- [ ] Adapter image selection tests pass

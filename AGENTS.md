# Agent Notes

## First reads
- Read `codemap.md` before code changes; it lists the real entrypoints and package responsibilities.
- For deep work in a package, read that package's `codemap.md` when present.

## Package manager
- Use `npm`, not `yarn`, for agent-run commands in this repo.
- A root `package-lock.json` exists, but many historical scripts/CI snippets still mention `yarn`; do not copy those blindly. Prefer `npm ci`, `npm install`, `npm run <script>`, or the underlying `node scripts/...` command.

## High-value commands
- Install deps: `npm ci` for a clean install, `npm install` when updating the lockfile.
- Build packages only: `npm run build:packages` (`scripts/build-all.js -v -w modules --ts-config tsconfig.build.json`).
- Full build is expensive: `npm run build` includes packages and Docker builds.
- Unit/package tests: `npm run test:packages-no-concurrent` is the CI-safe serial variant; `npm run test:packages` runs package tests concurrently.
- BDD smoke paths: `npm run test:bdd-ci-api-node`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, or `npm run test:bdd`.
- Biome lint/format: `npm run lint`, `npm run lint:quick`, `npm run lint:fix`, `npm run format`, or the lower-level `npm run biome:check`/`npm run biome:lint`/`npm run biome:format` scripts. `lint` runs Biome linting; formatting remains an explicit `format` operation to avoid broad format churn.
- Biome scripts set `RAYON_NUM_THREADS=12` by default. This passed on the 24-core agent host under the repo virtual-memory cap with ~98 MB max RSS, while 24/default parallelism failed from native allocation pressure; do not silently raise the cap.
- Runtime invariant check: `npm run check:runtime-invariants`.
- Dev hub: `npm run start:dev`; built hub: `npm run start` after building `dist/`.

## Monorepo wiring
- Workspaces are `packages/*` plus `bdd/`; custom workspace groups in `package.json` include `modules`, `runners`, and `bdd`.
- `scripts/run-script.js` runs a package script across workspaces; it defaults to 16 concurrent jobs (override with `-j <jobs>`). It runs every selected package after failures, then exits nonzero with aggregated failures; use `--fail-fast` or `SCRAMJET_RUN_SCRIPT_FAIL_FAST=1` to stop scheduling after the first failure. Other useful flags: `-w <group>`, `-s <package path|name>`, `-d <package>`, `-e <command>`.
- `scripts/build-all.js` builds TypeScript solution configs and pre-packs packages into `dist/`; useful flags: `-w <group>`, `-d <package>`, `--ts-config <file>`, `--no-install`, `--no-distws`.
- Main STH CLI source is `packages/sth/src/bin/hub.ts`; published/root bin points to `dist/sth/bin/hub.js`.
- Adapter-launched runner entrypoint is `packages/runner/src/bin/start-runner.ts`; executor selection is in `packages/runner/src/executor/select.ts`.
- Runtime wrapper packages (`runner-node`, `runner-python`) are protocol references for child process execution.

## Testing and generated files
- Most package tests use AVA with `ts-node/register` and match `**/*.spec.ts`.
- Run supported repo/package test commands with their default environment. Prefer a supported runner over raw test-process invocation.
- AVA package tests run through `scripts/run-ava.js` — the **sole supported** AVA/package-test entrypoint. All package `test`/`test:ava` scripts route through it. Default profile: `--max-old-space-size=2048`, JIT with WASM caps (8192 pages, 256 MB committed code/code space), `TS_NODE_TRANSPILE_ONLY=1`, concurrency 2, runner timeout 600000 ms. `SCRAMJET_TEST_PROFILE=fast` uses 16 AVA workers and an 8 MiB concurrent-mode budget; `SCRAMJET_TEST_PROFILE=phase-final` enables the unchanged strict 524288-byte guard and serial execution. Fast mode never enables concurrent GC measurements; an explicitly enabled guard remains serial. Opt in to jitless with `SCRAMJET_AVA_JITLESS=1`, or ts-node typechecking with `TS_NODE_TRANSPILE_ONLY=0`; package source TypeScript builds remain the correctness gate. Other overrides:
  - `SCRAMJET_AVA_FETCH=0` — adds `--no-experimental-fetch`
  - `SCRAMJET_AVA_WORKERS` — AVA concurrency (default 2)
  - `SCRAMJET_AVA_TIMEOUT` — runner-level timeout ms (default 600000)
  - `SCRAMJET_AVA_MAX_OLD_SPACE_SIZE` — override heap limit (default 2048)
  - `SCRAMJET_AVA_GUARD=1` — opt-in bypass guard (warns on direct `npx ava` without runner; only protects runner-spawned/preloaded processes)
- Profile aliases: `npm run test:packages:fast` and `npm run test:packages:phase-final`; the latter is the package-level proof path and does not raise timeouts or thresholds.
- Runner regression tests: `npm run test:runner` (scripts/test/*.spec.js).
- BDD tests use `scripts/run-bdd.js` (supported entrypoint) or `scripts/run-bdd-docker.js` (internal). The **supported** BDD path under host memory constraints is `--mode=docker` (default), which runs Cucumber inside a Docker container with memory 1536m, CPUs 2, timeout 600000 ms, grace 10000 ms. Direct mode (`--mode=direct`) is for diagnostic/local runs only — under strict host ulimit, step definitions may fail from ssh2/poly1305 WASM allocation.
- BDD root npm scripts (`test:bdd*`, `test:bdd-ci*`) route through the supported runner.
- Leak detection: `reportLeakedProcesses()` runs at exit for BDD runner paths, reporting leftover STH/Host/runner/Manager/MultiManager/cucumber processes. Cleanup is current-run scoped.
- `packages/types` generates exposed type files via `packages/types/scripts/generate.js`; its `build:only` runs that generator.
- BDD tests often require built `dist/`, Docker images, and env like `RUNTIME_ADAPTER=process|docker`, `SCRAMJET_SPAWN_JS=1`, `SCRAMJET_TEST_LOG=1`, `SCP_ENV_VALUE=GH_CI`.
- Docker-adapter BDD also needs runner image artifacts/tags; avoid running full Docker BDD unless the task requires it.

## Memory guard mode

Strict per-test/per-scenario memory-growth guardrails are available for AVA package tests,
BDD scenarios, and sequence-test harnesses.  The guard measures `heapUsed + external + arrayBuffers`
after forced GC and fails when growth exceeds a configurable threshold.

### AVA memory guard

Enable via `SCRAMJET_AVA_MEMORY_GUARD=1` or the common fallback `SCRAMJET_MEMORY_GUARD=1`.
The runner (`scripts/run-ava.js`) injects `--expose-gc` and forces serial execution when
guard mode is enabled.

**Commands:**
```bash
# Run focused AVA guard unit/live tests (the primary guard-validation surface):
ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" \
  node scripts/run-ava.js \
    scripts/test/ava-options.spec.js \
    scripts/test/ava-memory-guard.spec.js \
    scripts/test/ava-memory-guard-hook-order.spec.js

# Run the live guard smoke surface under strict guard mode:
ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" \
  SCRAMJET_AVA_MEMORY_GUARD=1 \
  node scripts/run-ava.js scripts/test/ava-memory-guard-live.spec.js
```

**Environment variables (AVA):**
| Variable | Default | Description |
|---|---|---|
| `SCRAMJET_MEMORY_GUARD` | — | Set to `1` to enable common memory guard |
| `SCRAMJET_AVA_MEMORY_GUARD` | — | AVA-specific override (enables/disables) |
| `SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES` | 524288 | Common heap threshold (bytes) |
| `SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES` | — | AVA-specific threshold override (overrides common) |
| `SCRAMJET_MEMORY_SKIP` | — | Set to `1` to skip all measurement |
| `SCRAMJET_MEMORY_SKIP_REASON` | — | Non-empty reason required when `SKIP=1` |

**Per-test exceptions:** Call `allowAvaMemoryGrowth(t, { threshold, reason })` inside a test body
to raise the threshold for that specific test.  Both a positive numeric threshold and a non-empty
reason string are required.

**Per-file exceptions:** Pass `{ threshold: <bytes> }` as the second argument to
`createAvaMemoryGuard(baseTest, options)`.

**`Buffer.concat` rule:** `Buffer.concat` and chunk collection remain allowed for assertions.
Retained buffers, chunks, captured frames, streams, and large response bodies must be cleared
before final measurement using `registerAvaMemoryCleanup(t, fn)`.

**Adoption:** Each package test file that wants strict measurement must opt in explicitly:
```typescript
const baseTest = require("ava");
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../scripts/lib/ava-memory-guard");
const test = createAvaMemoryGuard(baseTest);
// Use registerAvaMemoryCleanup(t, () => { /* free refs */ }) for cleanup visible to guard.
```

### BDD memory guard

Enable via `SCRAMJET_BDD_MEMORY_GUARD=1` or `SCRAMJET_MEMORY_GUARD=1`.  The runner injects
`--expose-gc` for both direct and Docker modes.  Hooks are loaded automatically by `bdd/cucumber.js`.

**Commands:**
```bash
# Focused BDD memory guard unit tests (no real scenarios; no Docker needed):
ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" \
  node scripts/run-ava.js \
    scripts/test/bdd-options.spec.js \
    scripts/test/bdd-memory-guard.spec.js \
    scripts/test/run-bdd.spec.js \
    scripts/test/bdd-memory-registry.spec.js --serial

# Direct-mode BDD scenario run under memory guard (diagnostic/local only):
SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js --mode=direct -- --name="E2E-001 TC-002"

# Docker-mode BDD scenario run under memory guard (supported path):
SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js -- --name="E2E-001 TC-002"
```

**Environment variables (BDD):**
| Variable | Default | Description |
|---|---|---|
| `SCRAMJET_BDD_MEMORY_GUARD` | — | BDD-specific guard enable/disable |
| `SCRAMJET_MEMORY_GUARD` | — | Common guard fallback |
| `SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES` | — | Per-scenario heap threshold override |
| `SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES` | 524288 | Common heap threshold (512 KiB) |
| `SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES` | 209715200 | Child process RSS threshold (200 MiB) |
| `SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES` | 1073741824 | Docker container working-set threshold (1 GiB) |
| `SCRAMJET_MEMORY_SKIP` | — | Set to `1` to skip (requires `SKIP_REASON`) |
| `SCRAMJET_MEMORY_SKIP_REASON` | — | Non-empty reason when `SKIP=1` |

**Threshold semantics:**
- **Parent heap** (512 KiB default): measures `heapUsed + external + arrayBuffers` in the
  Cucumber Node process after forced GC and per-scenario cleanup.  Strict — must adopt
  cleanup patterns and scoped exceptions.
- **Child process RSS** (200 MiB default): sampled from `/proc/<pid>/status VmRSS` for
  spawned Hub, Host, Manager, MultiManager, and runner processes.  Higher threshold reflects
  legitimate child process memory.
- **Docker container working set** (1 GiB default): computed as `usage - inactive_file`
  from Docker stats, with raw-usage fallback.  Covers runner containers.

**Skip/exception rules:**
- Environment skips require `SCRAMJET_MEMORY_SKIP=1` AND a non-empty `SCRAMJET_MEMORY_SKIP_REASON`.
  Reasonless skips throw during installation.
- Broad package-wide or feature-wide silent skips are forbidden.
- Per-scenario exceptions are not currently supported via env; use `SCRAMJET_MEMORY_SKIP` with
  a reason for emergency overrides.

### Sequence-test memory support

- **`ByteCapture.clear()`**, **`OutputCapture.clear()`**, **`LogCapture.clear()`**,
  **`MonitoringCapture.clear()`**: release retained chunks, parsed frames, pending waiters,
  and text so the AVA guard can measure cleanly.
- **`createSequenceTest().close()`**: clears output, log, and monitoring captures.
- **`SequenceAssertions.memoryWithinLimit({ threshold })`**: opt-in assertion for
  runner/process monitoring-frame memory values (`memoryUsage`, `memoryMaxUsage`).
  Threshold must be a positive finite number.  Diagnostics distinguish these
  child-process values from parent harness heap measurements.

### Track completion requirement

Every Conductor track final summary **must** list the memory-guarded commands that were run,
the thresholds used, any skips/exceptions with reasons, and follow-ups for deferred coverage.
See `conductor/workflow.md` for details.

## Type split packages
- `@scramjet/types` is **deprecated** in favor of `@scramjet/runtime-types`, `@scramjet/sequence-types`, and `@scramjet/api-types`. Existing imports continue to resolve through the compatibility barrel.
- Sequence authors should import `SequenceAppContext` from `@scramjet/sequence-types`. Internal packages use `@scramjet/runtime-types` for runtime-neutral contracts and `@scramjet/api-types` for API DTOs/client stubs.
- Split-package boundary enforcement: `npm run check:typings-split`.
- Sequence AppContext API validation: `npm run test:sequence-appcontext`.
- BDD AppContext coverage: `npm run test:bdd-appcontext`.

## Sequence-test package status
- `@scramjet/sequence-test` is supported for scoped local sequence fixture/hub-harness/AppContext validation. It must not be treated as the default replacement for package tests, BDD tests, adapter tests, or runtime invariant checks unless explicitly directed.
- Keep using each package's existing AVA tests plus package build/lint validation unless the task explicitly asks for `@scramjet/sequence-test`.
- Do not replace package tests, BDD tests, adapter tests, or runtime invariant checks with `@scramjet/sequence-test` unless explicitly directed.

## Toolchain constraints
- TypeScript base is strict CommonJS targeting ES2019, with `allowJs`, decorators, declarations, and `noUnusedLocals` enabled.
- Lint/format tooling uses Biome during the migration track. Do not run legacy ESLint commands unless the active track explicitly re-enables them.

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.

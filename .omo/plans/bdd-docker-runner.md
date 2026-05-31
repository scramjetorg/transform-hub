# BDD Runner Containerization

## TL;DR

> **Quick Summary**: Replace all `test:bdd*` (and `test:unified-*`) root npm scripts with a thin Node wrapper that runs the existing BDD suite inside an official `node:22` container, hard-isolating runner-node/host crashes from opencode via a 4096M cgroup memory cap and PID-namespace separation. The underlying runner-node/host stable-name bug is NOT fixed.
>
> **Deliverables**:
> - `scripts/run-bdd-docker.js` (new wrapper, detached `docker run` + `docker wait`, signal forwarding, mandatory cleanup, exit-code propagation).
> - Rewritten root `package.json` scripts (4 deleted, 10 rerouted through wrapper).
> - Deleted legacy safe-wrapper scripts (`run-bdd-safe.js`, `test-bdd-safe-selftest.js`, `test-bdd-safe-memory.js`).
> - Updated `bdd/README.md` documenting docker runs, env vars, escape-hatch cleanup.
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves + final verification wave
> **Critical Path**: Task 1 (wrapper) → Task 2 (package.json rewrite) → Final Wave

---

## Context

### Original Request
The prior safe-wrapper attempt (process-group timeout + RSS memory guard) passed synthetic selftests but failed to protect opencode from a real failing BDD scenario. The user identified the failing scenario as: `Node sequence completes successfully under runner-node spawn isolation` (last reproduced via `yarn test:bdd:ts:safe --name="Node sequence completes successfully under runner-node spawn isolation"`). The user directs us to instead run BDD inside an official `node:22` container with `--memory=4096m`, replacing all `test:bdd*` scripts. The container is allowed to crash; opencode must survive. The underlying runner-node/host stable-name bug is explicitly NOT in scope.

### Interview Summary
**Key Discussions**:
- No local Dockerfile; use official `node:22` directly via `docker run`.
- Mount source so container runs against in-tree code.
- Replace all `test:bdd*` (and consistent `test:unified-*`) scripts in the root `package.json`.
- 4096M hard memory cap.
- Container crash isolation is the entire point — do not paper over the underlying bug.

**Research Findings**:
- Root `package.json` defines 12 `test:bdd*` scripts + 2 `test:unified-*` scripts that ultimately invoke `yarn --cwd=./bdd run test:bdd` (cucumber-js).
- `bdd/` uses `dockerode` (`step-definitions/e2e/host-steps.ts`, `step-definitions/hub/config.ts`) → container needs `/var/run/docker.sock` mounted.
- CI workflows `.github/workflows/_main_sth-build-test-node-18.yml` and `release-test.yml` call scripts by name; names MUST be preserved.
- `release-test.yml` references `yarn test:bdd-ci`, but no `test:bdd-ci` script exists anywhere in the repo. Pre-existing brokenness, flagged but out of scope.
- Host is Linux x64 glibc; `node:22` is debian-slim glibc → mounting host `node_modules` is binary-compatible.

### Metis Review
**Identified Gaps** (addressed):
- Corepack interactive prompt → set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`.
- Full `/tmp:/tmp` mount leaks host state → use per-run `mktemp -d /tmp/bdd-runner.XXXXXX` mounted as `/work-tmp` with `HOME` and `TMPDIR` repointed there.
- Signal double-delivery → run `docker run --detach`, capture id, watch via `docker wait`, forward signals via `docker kill --signal=<sig> <id>`.
- Docker GID hardcoding → resolve at runtime via `getent group docker | cut -d: -f3`.
- Missing docker binary → fail fast with exit 127 and actionable message.
- Wrapper-itself-SIGKILL leaves orphans → mandatory `docker rm -f <id>` in finally + documented escape-hatch.
- Container exit code must come from `docker wait`, not the wrapper process; 124 reserved for wrapper wall-clock timeout, 137 for container OOM.
- All CI script names preserved exactly.

---

## Work Objectives

### Core Objective
Replace the in-process BDD invocation path with a docker-based wrapper so that runner-node/host crashes are absorbed by the container's cgroup boundary instead of taking down opencode.

### Concrete Deliverables
- `scripts/run-bdd-docker.js` (new).
- Modified `package.json` (root) — 4 scripts deleted, 10 rerouted.
- Deleted: `scripts/run-bdd-safe.js`, `scripts/test-bdd-safe-selftest.js`, `scripts/test-bdd-safe-memory.js`.
- Updated `bdd/README.md` (docker section replaces safe-wrapper section).

### Definition of Done
- [ ] `yarn test:bdd --name="<previously-crashing-scenario>"` runs inside a container; if the scenario crashes the container, opencode (parent shell) keeps running and reports a non-zero exit code.
- [ ] `docker run` with synthetic OOM allocation exits 137 through the wrapper.
- [ ] `kill -INT <wrapper_pid>` cleans up the named container (no orphan visible via `docker ps`).
- [ ] All preserved CI script names (`test:bdd-ci-hub`, `test:bdd-ci-api`, `test:bdd-ci-api-node`, `test:bdd-ci-api-topic`, `test:bdd-ci-python`, `test:bdd-ci-node`, `test:unified-py`, `test:unified-js`) resolve and invoke the wrapper.
- [ ] No retained references to `run-bdd-safe.js` or deleted scripts anywhere except CHANGELOG/git history.

### Must Have
- 4096M memory cap (`--memory=4096m --memory-swap=4096m`).
- `--network host`.
- `/var/run/docker.sock` mounted.
- `--user $(id -u):$(id -g)` so `bdd/reports/` files are host-user owned.
- `--group-add <docker_gid>` resolved at runtime.
- Mandatory container cleanup in finally block.
- Container id + name printed to STDERR before run.
- Exit code from `docker wait`.
- Signal forwarding via `docker kill --signal=<sig> <id>`.
- All CI script names preserved verbatim.

### Must NOT Have (Guardrails)
- NO fix to the runner-node/host stable-name bug.
- NO local Dockerfile, NO docker build, NO custom image.
- NO `/tmp:/tmp` mount.
- NO hardcoded docker GID.
- NO retry logic anywhere in the wrapper.
- NO changes to `bdd/package.json` or `bdd/cucumber.js`.
- NO changes to `.github/workflows/*` YAML (script-name compatibility is the contract).
- NO additions to the env-passthrough allowlist beyond the documented set (SCRAMJET_*, NO_HOST, TEST_REPORT, DEVELOPMENT, PACKAGES_DIR, SCP_ENV_VALUE, BDD_*, CI).
- NO new test files / selftest scripts committed to the repo. QA happens in the Final Verification Wave only.
- NO renaming or merging of any `test:bdd*` or `test:unified-*` script keys.
- NO containerization of any non-BDD script.
- NO execution of the previously-failing scenario (`Node sequence completes successfully under runner-node spawn isolation`) outside the docker wrapper at ANY point — not during development, not during commits, not during verification. The whole purpose of this plan is crash isolation; running it directly defeats that purpose and risks crashing opencode. The scenario may ONLY be invoked through a `test:bdd*` script (after Task 4), which routes through `scripts/run-bdd-docker.js`. Direct invocations such as `yarn --cwd=./bdd run test:bdd --name="..."`, `cucumber-js --name="..."`, or `node scripts/run-bdd-safe.js` are FORBIDDEN.

### Spec Framework Integration
No SDD framework detected in this repo (no `openspec/`, no `.specify/`). N/A.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (no unit tests for shell/docker plumbing).
- **Automated tests committed**: NONE.
- **Framework**: N/A.
- **QA Mode**: agent-executed scenarios per task + Final Verification Wave executes synthetic OOM / signal / timeout via direct `docker run`.

### QA Policy
Every task includes Agent-Executed QA Scenarios. Evidence stored under `.omo/evidence/task-{N}-{slug}.{ext}`.

- **Wrapper behavior**: Bash + `docker run`/`docker ps`/`docker inspect` — exit codes, container lifecycle, orphan checks.
- **Script rewiring**: Bash — `node -e "JSON.parse(require('fs').readFileSync('package.json'))..."` assertions on script bodies/keys.
- **Docs**: Bash `grep` confirms expected sections/anti-patterns.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately — foundation, no dependencies):
├── Task 1: scripts/run-bdd-docker.js wrapper [unspecified-high]
├── Task 2: Delete legacy safe-wrapper scripts [quick]
└── Task 3: Update bdd/README.md docs [writing]

Wave 2 (After Wave 1 — depends on Task 1 wrapper interface):
└── Task 4: Rewrite root package.json scripts (delete 4, reroute 10) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Wrapper code quality + docker invocation correctness (unspecified-high)
├── Task F3: Real manual QA — synthetic OOM/timeout/signal + real failing scenario crash isolation (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → F1-F4 → user okay
Parallel Speedup: Wave 1 runs 3 tasks concurrently; Task 4 must wait for Task 1.
Max Concurrent: 3 (Wave 1).
```

### Dependency Matrix

- **1**: — → **4, F1-F4**
- **2**: — → **F1-F4**
- **3**: — → **F1-F4**
- **4**: 1 → **F1-F4**
- **F1-F4**: 1, 2, 3, 4 → user okay

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `unspecified-high`, T2 → `quick`, T3 → `writing`
- **Wave 2**: **1** — T4 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + verification = ONE task. Every task has Recommended Agent Profile, Parallelization, References, Acceptance Criteria, QA Scenarios.

- [x] 1. Implement `scripts/run-bdd-docker.js` wrapper

  **What to do**:
  - Create `scripts/run-bdd-docker.js`, executable Node script (shebang `#!/usr/bin/env node`).
  - Resolve config from env: `BDD_NODE_IMAGE` (default `node:22`), `BDD_DOCKER_MEMORY` (default `4096m`), `BDD_DOCKER_CPUS` (default unset), `BDD_TIMEOUT_MS` (default `0` = disabled), `BDD_GRACE_MS` (default `15000`).
  - Parse argv: everything after `--` is passthrough to `yarn --cwd=./bdd run test:bdd`.
  - Pre-flight: `which docker` (or `command -v docker`); if missing, write actionable message to stderr and exit 127.
  - Resolve docker GID: run `getent group docker | cut -d: -f3`; if empty/error, stderr + exit 127.
  - Resolve repo root: walk up from `__dirname` until a directory containing `bdd/cucumber.js` (or use `path.resolve(__dirname, '..')`).
  - Create per-run temp dir: `fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-runner.'))`.
  - Compose container name: `bdd-runner-${process.pid}-${crypto.randomBytes(3).toString('hex')}`.
  - Compose `docker run` argv (in order):
    - `run --detach --rm --init`
    - `--name ${name}`
    - `--network host`
    - `--memory ${BDD_DOCKER_MEMORY} --memory-swap ${BDD_DOCKER_MEMORY}`
    - if `BDD_DOCKER_CPUS`: `--cpus ${BDD_DOCKER_CPUS}`
    - `--user ${uid}:${gid}` (`process.getuid()`, `process.getgid()`)
    - `--group-add ${dockerGid}`
    - `-v ${repoRoot}:/work`
    - `-v /var/run/docker.sock:/var/run/docker.sock`
    - `-v ${tmpDir}:/work-tmp`
    - `-w /work`
    - `-e HOME=/work-tmp -e TMPDIR=/work-tmp -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0`
    - For each var in allowlist `[SCRAMJET_*, NO_HOST, TEST_REPORT, DEVELOPMENT, PACKAGES_DIR, SCP_ENV_VALUE, BDD_*, CI]` present in `process.env`: `-e ${name}=${value}`. Use prefix match for `SCRAMJET_` and `BDD_`.
    - `${BDD_NODE_IMAGE}`
    - `sh -c 'corepack enable && yarn --cwd=./bdd run test:bdd ${shellEscapedPassthroughArgs}'`
  - Print `[run-bdd-docker] container name=${name}` to stderr BEFORE spawning.
  - Spawn `docker run ...` synchronously via `child_process.spawnSync` (capture container id from stdout's first line).
  - Print `[run-bdd-docker] container id=${id}` to stderr.
  - Stream container logs: `child_process.spawn('docker', ['logs', '-f', id], { stdio: ['ignore', 'inherit', 'inherit'] })`.
  - Spawn `docker wait ${id}` via `child_process.spawn`; parse stdout for integer exit code.
  - Install handlers for SIGINT / SIGTERM / SIGHUP: on first signal, call `docker kill --signal=${sig} ${id}`. Start a one-shot timer for `BDD_GRACE_MS` to send `docker kill --signal=KILL ${id}`.
  - If `BDD_TIMEOUT_MS > 0`, start wall-clock timer that triggers the same kill ladder and sets `timedOut=true`.
  - In a finally-equivalent (after `docker wait` resolves or rejects, on any error path): `child_process.spawnSync('docker', ['rm', '-f', id], { stdio: 'ignore' })`. Best-effort delete `tmpDir` via `fs.rmSync(tmpDir, { recursive: true, force: true })`.
  - Exit code: `124` if `timedOut`; else the integer parsed from `docker wait`; else `1` if `docker wait` produced no parseable code.

  **Must NOT do**:
  - No retries.
  - No mount of `/tmp:/tmp`.
  - No hardcoded docker GID.
  - No env var passthrough outside the allowlist.
  - No interactive `-t`.
  - No local Dockerfile, no `docker build`.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — non-trivial process/signal/lifecycle plumbing with multiple correctness traps (signal forwarding, exit-code propagation, cleanup).
  - **Skills**: none required (no domain skill matches docker plumbing precisely; ai-slop-remover applied at QA wave, not here).

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4, F1-F4
  - **Blocked By**: None

  **References**:
  - `scripts/run-bdd-safe.js` (entire file) — existing style for env parsing (`readPositiveInteger`), signal handling shape, `--` argv separator convention. COPY THE STYLE; do not import or extend it (this file will be deleted in Task 2).
  - `bdd/cucumber.js` — confirms cucumber-js invocation; wrapper does NOT need to know its content but uses repo-root detection that relies on its existence.
  - `bdd/step-definitions/e2e/host-steps.ts`, `bdd/step-definitions/hub/config.ts` — confirm dockerode usage, justifying `/var/run/docker.sock` mount.
  - `package.json` (root) lines 49-62 — the `test:bdd*` and `test:unified-*` script bodies the wrapper must end up replacing in Task 4.
  - Docker CLI reference: `docker run --help` for `--memory`, `--memory-swap`, `--network`, `--user`, `--group-add`, `--init`, `--detach`, `--rm`, `--name`; `docker wait`, `docker kill --signal=`, `docker rm -f`.
  - Node API: `child_process.spawn` / `spawnSync`, `os.tmpdir`, `fs.mkdtempSync`, `crypto.randomBytes`, `process.getuid/getgid`, `process.on('SIGINT'|'SIGTERM'|'SIGHUP')`.

  **WHY Each Reference Matters**:
  - `run-bdd-safe.js` — match house style for env parsing and CLI ergonomics so the wrapper feels like a drop-in successor.
  - `cucumber.js` location — anchor for repo-root resolution that won't break if invoked via npm/yarn from a subdir.
  - Step files using dockerode — justify (and document) the socket mount in code comments.

  **Acceptance Criteria**:
  - [ ] `node --check scripts/run-bdd-docker.js` exits 0.
  - [ ] `head -1 scripts/run-bdd-docker.js` is `#!/usr/bin/env node`.
  - [ ] `test -x scripts/run-bdd-docker.js` succeeds (file is executable).
  - [ ] `grep -E "^const (BDD_NODE_IMAGE|BDD_DOCKER_MEMORY|BDD_TIMEOUT_MS|BDD_GRACE_MS)" scripts/run-bdd-docker.js` matches at least 4 lines (env defaults declared).
  - [ ] `grep -c 'docker kill --signal' scripts/run-bdd-docker.js` ≥ 1 (signal forwarding present).
  - [ ] `grep -c 'docker rm -f' scripts/run-bdd-docker.js` ≥ 1 (cleanup present).
  - [ ] `grep -c 'getent group docker' scripts/run-bdd-docker.js` ≥ 1 (gid resolution present).
  - [ ] `grep -c '/tmp:/tmp' scripts/run-bdd-docker.js` = 0 (forbidden mount absent).
  - [ ] `grep -cE "(--detach|'--detach')" scripts/run-bdd-docker.js` ≥ 1 (detached run pattern).

  **QA Scenarios** (MANDATORY):

  ```
  Scenario: Wrapper syntactically valid
    Tool: Bash
    Preconditions: File scripts/run-bdd-docker.js exists.
    Steps:
      1. Run: node --check scripts/run-bdd-docker.js; echo $?
    Expected Result: Exit code 0 on stdout.
    Failure Indicators: Non-zero exit, SyntaxError on stderr.
    Evidence: .omo/evidence/task-1-syntax-check.txt

  Scenario: Missing docker binary → exit 127
    Tool: Bash
    Preconditions: Wrapper file present.
    Steps:
      1. Run: PATH=/nonexistent node scripts/run-bdd-docker.js -- --version 2>&1; echo "EXIT=$?"
    Expected Result: stderr contains "docker" and "not found" (or equivalent); EXIT=127.
    Failure Indicators: Exit 0, or stderr missing actionable message.
    Evidence: .omo/evidence/task-1-no-docker.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-1-syntax-check.txt`
  - [ ] `.omo/evidence/task-1-no-docker.txt`

  **Commit**: YES (groups with itself)
  - Message: `feat(bdd): add docker-based BDD runner wrapper`
  - Files: `scripts/run-bdd-docker.js`
  - Pre-commit: `node --check scripts/run-bdd-docker.js`

- [x] 2. Delete legacy safe-wrapper scripts

  **What to do**:
  - `git rm scripts/run-bdd-safe.js scripts/test-bdd-safe-selftest.js scripts/test-bdd-safe-memory.js`

  **Must NOT do**:
  - Do not delete any other file under `scripts/`.
  - Do not touch `bdd/` files in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick` — single `git rm` command.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:
  - `scripts/run-bdd-safe.js` — being removed (logic superseded by docker wrapper).
  - `scripts/test-bdd-safe-selftest.js` — being removed (synthetic timeout selftest; obsolete).
  - `scripts/test-bdd-safe-memory.js` — being removed (synthetic memory selftest; obsolete).

  **WHY Each Reference Matters**:
  - These three files are the entire footprint of the prior wrapper attempt. They are coupled only to the four `test:bdd:safe*` script keys (also deleted in Task 4), so removal is safe and isolated.

  **Acceptance Criteria**:
  - [ ] `test ! -e scripts/run-bdd-safe.js` exits 0.
  - [ ] `test ! -e scripts/test-bdd-safe-selftest.js` exits 0.
  - [ ] `test ! -e scripts/test-bdd-safe-memory.js` exits 0.
  - [ ] `git status --porcelain scripts/run-bdd-safe.js scripts/test-bdd-safe-selftest.js scripts/test-bdd-safe-memory.js` shows `D ` for each (staged deletion).
  - [ ] `ls scripts/ | wc -l` decreased by exactly 3 vs main.

  **QA Scenarios**:

  ```
  Scenario: Files absent on disk
    Tool: Bash
    Preconditions: Task 2 completed.
    Steps:
      1. Run: for f in scripts/run-bdd-safe.js scripts/test-bdd-safe-selftest.js scripts/test-bdd-safe-memory.js; do test ! -e "$f" && echo "GONE $f" || echo "PRESENT $f"; done
    Expected Result: Three "GONE" lines, zero "PRESENT" lines.
    Failure Indicators: Any "PRESENT" line.
    Evidence: .omo/evidence/task-2-deletion-check.txt

  Scenario: No remaining references in repo (excluding history)
    Tool: Bash
    Preconditions: Task 2 completed.
    Steps:
      1. Run: grep -rn "run-bdd-safe\|test-bdd-safe-selftest\|test-bdd-safe-memory" --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . ; echo "EXIT=$?"
    Expected Result: EXIT=1 (grep no-match) AND no output.
    Failure Indicators: Any match line.
    Evidence: .omo/evidence/task-2-no-references.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-2-deletion-check.txt`
  - [ ] `.omo/evidence/task-2-no-references.txt` (Note: Task 4 also removes references; if this scenario runs before Task 4, expected matches are limited to root `package.json` and will be eliminated after Task 4.)

  **Commit**: YES
  - Message: `chore(bdd): remove legacy safe-wrapper scripts`
  - Files: `scripts/run-bdd-safe.js`, `scripts/test-bdd-safe-selftest.js`, `scripts/test-bdd-safe-memory.js`
  - Pre-commit: `git diff --cached --name-status | grep "^D" | wc -l` equals 3 (or more, if combined with other staged deletions).

- [x] 3. Update `bdd/README.md` to document docker runs

  **What to do**:
  - Replace the existing "safe wrapper" section (currently around lines documenting `yarn test:bdd:safe`, `test:bdd:safe:selftest`, `test:bdd:safe:memory-selftest`) with a new "Running BDD in a container" section.
  - New section must document:
    - Prerequisite: docker daemon running, current user in the `docker` group.
    - Default invocation: `yarn test:bdd` now runs inside `node:22` container with `--memory=4096m`.
    - Env var table: `BDD_NODE_IMAGE`, `BDD_DOCKER_MEMORY`, `BDD_DOCKER_CPUS`, `BDD_TIMEOUT_MS`, `BDD_GRACE_MS` — with defaults and behavior.
    - Env passthrough allowlist enumerated.
    - Escape-hatch one-liner for orphaned containers: `docker ps --filter name=bdd-runner- -q | xargs -r docker kill`
    - Exit-code key: `124` = wrapper wall-clock timeout, `137` = container OOM kill, `127` = wrapper preflight failure, otherwise container's exit code.
    - Known risk: native node addons under `node_modules` must be linux-x64 glibc compatible; document `yarn --cwd=./bdd install` rebuild path if ABI mismatch.
  - Remove all lines mentioning `run-bdd-safe`, `test:bdd:safe`, `test:bdd:safe:selftest`, `test:bdd:safe:memory-selftest`, `BDD_TIMEOUT_MS` legacy notes, `BDD_MEMORY_LIMIT_MB` legacy notes.

  **Must NOT do**:
  - Do not change unrelated README sections (Tags, Naming, Local Quickstart that don't mention the safe wrapper).
  - Do not introduce a Dockerfile reference.

  **Recommended Agent Profile**:
  - **Category**: `writing` — documentation prose with technical accuracy requirements.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:
  - `bdd/README.md` lines ~100-135 (current safe-wrapper documentation block; locate via `grep -n run-bdd-safe bdd/README.md` and `grep -n test:bdd:safe bdd/README.md`).
  - `scripts/run-bdd-safe.js` (still on disk in this wave) — env var documentation block at top of file is the source for what to delete (legacy env vars no longer relevant).
  - Plan Section "Technical Decisions (final — refinements merged)" in `.omo/drafts/bdd-docker-runner.md` — authoritative source for env var names + defaults to document.

  **WHY Each Reference Matters**:
  - The README is user-facing; readers must not see stale safe-wrapper instructions after this change.
  - The legacy script's header block is the easiest place to identify which env vars are being retired.

  **Acceptance Criteria**:
  - [ ] `grep -c run-bdd-docker bdd/README.md` ≥ 1.
  - [ ] `grep -c run-bdd-safe bdd/README.md` = 0.
  - [ ] `grep -c 'test:bdd:safe' bdd/README.md` = 0.
  - [ ] `grep -cE 'BDD_(NODE_IMAGE|DOCKER_MEMORY|DOCKER_CPUS|TIMEOUT_MS|GRACE_MS)' bdd/README.md` ≥ 5 (all five env vars documented).
  - [ ] `grep -c '4096' bdd/README.md` ≥ 1 (memory default documented).
  - [ ] `grep -cE '\b(124|137|127)\b' bdd/README.md` ≥ 3 (exit-code key documented).
  - [ ] `grep -c 'docker ps --filter name=bdd-runner-' bdd/README.md` ≥ 1 (escape hatch documented).

  **QA Scenarios**:

  ```
  Scenario: README content checks pass
    Tool: Bash
    Preconditions: Task 3 completed.
    Steps:
      1. Run a single combined check:
         set -e
         grep -c run-bdd-docker bdd/README.md
         ! grep -q run-bdd-safe bdd/README.md
         ! grep -q 'test:bdd:safe' bdd/README.md
         grep -cE 'BDD_(NODE_IMAGE|DOCKER_MEMORY|DOCKER_CPUS|TIMEOUT_MS|GRACE_MS)' bdd/README.md
         grep -q '4096' bdd/README.md
         grep -q 'docker ps --filter name=bdd-runner-' bdd/README.md
         echo OK
    Expected Result: Final "OK" line printed; numeric counts > 0.
    Failure Indicators: `set -e` aborts before "OK".
    Evidence: .omo/evidence/task-3-readme-checks.txt

  Scenario: Markdown renders without unresolved internal links
    Tool: Bash
    Preconditions: Task 3 completed.
    Steps:
      1. Run: node -e "const md=require('fs').readFileSync('bdd/README.md','utf8'); const m=md.match(/\]\(#[^\)]+\)/g)||[]; for (const link of m) { const anchor=link.slice(3,-1); const slug=anchor.toLowerCase(); const headings=[...md.matchAll(/^#+\s+(.+)$/gm)].map(x=>x[1].toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/\s+/g,'-')); if(!headings.includes(slug)) { console.error('Unresolved anchor:', anchor); process.exit(1); } } console.log('OK');"
    Expected Result: "OK" printed.
    Failure Indicators: "Unresolved anchor" message.
    Evidence: .omo/evidence/task-3-anchor-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-3-readme-checks.txt`
  - [ ] `.omo/evidence/task-3-anchor-check.txt`

  **Commit**: YES
  - Message: `docs(bdd): document docker runner`
  - Files: `bdd/README.md`
  - Pre-commit: bash combined-check from Scenario 1.

- [x] 4. Rewrite root `package.json` scripts (delete 4, reroute 10) through the docker wrapper

  **What to do**:
  - Delete these keys from `scripts`: `test:bdd:safe`, `test:bdd:ts:safe`, `test:bdd:safe:selftest`, `test:bdd:safe:memory-selftest`.
  - Rewrite these keys to invoke the wrapper while preserving env-var semantics and cucumber args:
    - `test:bdd`: `node scripts/run-bdd-docker.js -- --fail-fast`
    - `test:bdd:ts`: `SCRAMJET_SPAWN_TS=1 node scripts/run-bdd-docker.js -- --fail-fast`
    - `test:bdd-ci-hub`: `NO_HOST=true node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-hub`
    - `test:bdd-ci-api`: `yarn test:bdd-ci-api-node` (alias preserved unchanged — already delegates).
    - `test:bdd-ci-api-node`: `node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-api`
    - `test:bdd-ci-api-topic`: `node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-topic`
    - `test:bdd-ci-python`: `node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-instance-python`
    - `test:bdd-ci-node`: `node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-instance-node`
    - `test:unified-py`: `PACKAGES_DIR=../packages/python- node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-unified`
    - `test:unified-js`: `PACKAGES_DIR=../packages/ node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t @ci-unified`
  - Preserve all other (non-BDD) scripts unchanged byte-for-byte.

  **Must NOT do**:
  - Do not rename any script key.
  - Do not merge or split script keys.
  - Do not change scripts outside the BDD/unified set.
  - Do not edit `bdd/package.json`.
  - Do not edit any `.github/workflows/*` file.

  **Recommended Agent Profile**:
  - **Category**: `quick` — straightforward JSON edits with mechanical pattern.

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 wrapper interface).
  - **Parallel Group**: Wave 2 (alone).
  - **Blocks**: F1-F4.
  - **Blocked By**: Task 1.

  **References**:
  - `package.json` lines 49-62 (current script bodies — source of env-var conventions: `NO_HOST=true`, `SCRAMJET_SPAWN_TS=1`, `PACKAGES_DIR=...`).
  - `bdd/cucumber.js` — confirms `-t` tag filter and `--format` flags are valid cucumber-js args (no changes needed inside bdd/).
  - `.github/workflows/_main_sth-build-test-node-18.yml` lines 54, 62, 70, 78, 86, 94, 102, 110, 118, 126, 134 — exact list of script names the CI invokes (all must remain present and functional).
  - `scripts/run-bdd-docker.js` (from Task 1) — wrapper CLI contract: env vars in process.env are passed through via allowlist; cucumber args go after `--`.

  **WHY Each Reference Matters**:
  - Env-var-on-script-line idiom (`NO_HOST=true yarn ...`) must survive the rewrite; the wrapper's allowlist passthrough handles it cleanly.
  - The CI YAML is the contract for script-name preservation.

  **Acceptance Criteria**:
  - [ ] `node -e "const s=require('./package.json').scripts; for (const k of ['test:bdd:safe','test:bdd:ts:safe','test:bdd:safe:selftest','test:bdd:safe:memory-selftest']) if (s[k]) { console.error('leftover',k); process.exit(1); } console.log('OK')"` → "OK".
  - [ ] `node -e "const s=require('./package.json').scripts; const keep=['test:bdd','test:bdd:ts','test:bdd-ci-hub','test:bdd-ci-api','test:bdd-ci-api-node','test:bdd-ci-api-topic','test:bdd-ci-python','test:bdd-ci-node','test:unified-py','test:unified-js']; for (const k of keep) if (!s[k]) { console.error('missing',k); process.exit(1); } console.log('OK')"` → "OK".
  - [ ] `node -e "const s=require('./package.json').scripts; const expectWrapped=['test:bdd','test:bdd:ts','test:bdd-ci-hub','test:bdd-ci-api-node','test:bdd-ci-api-topic','test:bdd-ci-python','test:bdd-ci-node','test:unified-py','test:unified-js']; for (const k of expectWrapped) if (!s[k].includes('scripts/run-bdd-docker.js')) { console.error('not routed',k,'=',s[k]); process.exit(1); } console.log('OK')"` → "OK".
  - [ ] `node -e "const s=require('./package.json').scripts; if (s['test:bdd-ci-api']!=='yarn test:bdd-ci-api-node') { console.error('alias broken'); process.exit(1); } console.log('OK')"` → "OK".
  - [ ] `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` → exit 0 (valid JSON preserved).
  - [ ] `git diff --stat package.json | grep -E '^ package.json' | awk '{print $4}'` (insertions) reasonable (< 40 lines changed total).
  - [ ] Outside scripts block, `git diff package.json` shows no changes (verify with `node -e` comparing parsed `dependencies`, `devDependencies`, `version`, etc. against HEAD).

  **QA Scenarios**:

  ```
  Scenario: All keep-scripts routed through wrapper, all retired-scripts absent
    Tool: Bash
    Preconditions: Task 4 completed.
    Steps:
      1. Run combined node assertions from Acceptance Criteria 1-4.
    Expected Result: Four "OK" lines.
    Failure Indicators: any "leftover", "missing", "not routed", "alias broken" message.
    Evidence: .omo/evidence/task-4-script-assertions.txt

  Scenario: Yarn can resolve each preserved script name (dry-run)
    Tool: Bash
    Preconditions: Task 4 completed; docker NOT required for this dry check (we override PATH).
    Steps:
      1. Run: for k in test:bdd test:bdd:ts test:bdd-ci-hub test:bdd-ci-api test:bdd-ci-api-node test:bdd-ci-api-topic test:bdd-ci-python test:bdd-ci-node test:unified-py test:unified-js; do yarn run --silent --json --help 2>/dev/null >/dev/null; node -e "if(!require('./package.json').scripts['$k']) { console.error('FAIL $k'); process.exit(1) }" && echo "OK $k"; done
    Expected Result: 10 "OK ..." lines.
    Failure Indicators: any "FAIL" line.
    Evidence: .omo/evidence/task-4-yarn-resolve.txt

  Scenario: Non-BDD scripts byte-identical to HEAD
    Tool: Bash
    Preconditions: Task 4 completed.
    Steps:
      1. Run: node -e "const a=require('./package.json').scripts; const b=JSON.parse(require('child_process').execSync('git show HEAD:package.json').toString()).scripts; const bddPrefix=k=>k.startsWith('test:bdd')||k.startsWith('test:unified-'); const keys=new Set([...Object.keys(a),...Object.keys(b)].filter(k=>!bddPrefix(k))); for (const k of keys) if (a[k]!==b[k]) { console.error('drift',k); process.exit(1); } console.log('OK',keys.size,'non-bdd scripts unchanged');"
    Expected Result: "OK N non-bdd scripts unchanged".
    Failure Indicators: "drift" message.
    Evidence: .omo/evidence/task-4-non-bdd-unchanged.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-4-script-assertions.txt`
  - [ ] `.omo/evidence/task-4-yarn-resolve.txt`
  - [ ] `.omo/evidence/task-4-non-bdd-unchanged.txt`

  **Commit**: YES
  - Message: `chore(bdd): route test:bdd* through docker wrapper`
  - Files: `package.json`
  - Pre-commit: All three QA scenario commands above pass.

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user; wait for explicit "okay" before marking work complete.

- [x] F1. **Plan compliance audit** — `oracle`
  Read `.omo/plans/bdd-docker-runner.md` end-to-end. For each "Must Have": verify presence in `scripts/run-bdd-docker.js` and rewritten `package.json` (read files, grep flags). For each "Must NOT Have": grep the working tree (excluding node_modules/dist/.git) — reject with file:line if any forbidden pattern present (e.g., references to `run-bdd-safe`, local Dockerfile, `/tmp:/tmp` mount, hardcoded docker GID). Check evidence files exist in `.omo/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [4/4] | VERDICT: APPROVE/REJECT`

- [x] F2. **Wrapper code quality + docker invocation correctness** — `unspecified-high`
  `node --check scripts/run-bdd-docker.js`. Read wrapper top-to-bottom. Verify: detached `docker run` then `docker wait`; signal handlers for SIGINT/SIGTERM/SIGHUP forward via `docker kill --signal=`; finally block runs `docker rm -f <id>`; docker binary presence check exits 127; docker GID resolved via `getent`; env allowlist matches plan exactly; exit code parsed from `docker wait` stdout. Check for AI slop (verbose comments, `as any`, generic names). Run `node scripts/run-bdd-docker.js --help` (if implemented) or smoke-invoke with `--dry-run` env to confirm command assembly.
  Output: `Syntax [PASS/FAIL] | Signal-Handling [PASS/FAIL] | Cleanup [PASS/FAIL] | Env-Allowlist [PASS/FAIL] | Slop [N issues] | VERDICT`

- [x] F3. **Real QA — crash isolation + synthetic OOM/timeout/signal** — `unspecified-high`
  Execute every QA scenario from every task. Additionally:

  (a) **Baseline docker cgroup OOM** (direct `docker run`, NOT through wrapper — the wrapper's container command is hardcoded to `yarn --cwd=./bdd run test:bdd`, so cannot run arbitrary allocators). Confirms `--memory` cap actually OOM-kills with exit 137:
  ```
  docker run --rm --memory 64m --memory-swap 64m node:22 node -e "const a=[];while(true)a.push(Buffer.alloc(1024*1024))"; echo "EXIT=$?"
  ```
  Assert `EXIT=137`. Evidence: `.omo/evidence/final-qa/oom-baseline.txt`.

  (b) **Wrapper-level wall-clock timeout**. Use an intentionally tiny `BDD_TIMEOUT_MS` that is guaranteed to fire during container creation + cucumber bootstrap, independent of which scenario runs. With `BDD_TIMEOUT_MS=1`, the timer expires before `docker wait` returns; the wrapper sends SIGTERM then SIGKILL to the container and exits 124. The scenario filter is therefore irrelevant — use any tag the suite accepts (e.g., `-t @ci-hub` to keep it valid):
  ```
  BDD_TIMEOUT_MS=1 BDD_GRACE_MS=2000 yarn test:bdd -- -t @ci-hub ; echo "EXIT=$?"
  ```
  Assert `EXIT=124`. Evidence: `.omo/evidence/final-qa/wrapper-timeout.txt`. If `EXIT=0` or any other value, the wrapper's timeout logic is broken — investigate before declaring F3 pass.

  (c) **Wrapper-level signal forwarding + cleanup**. Background a wrapper invocation; the goal is to send SIGINT to the wrapper while the container is alive. Use a known longer-running BDD invocation (e.g., a non-`@ignore` scenario without a tag filter so cucumber does substantial work). If a fast non-matching filter exits before the signal is delivered, fall back to a known scenario name from `bdd/features/` that takes >30s:
  ```
  export BDD_GRACE_MS=15000
  yarn test:bdd -- --name="__placeholder_replace_with_known_long_scenario__" &
  WRAPPER_PID=$!
  # Wait up to 30s for the container to appear; fail fast if it never does
  for i in $(seq 1 30); do
    CONTAINER_BEFORE=$(docker ps --filter name=bdd-runner- --format '{{.Names}}' | head -n1)
    if [ -n "$CONTAINER_BEFORE" ]; then break; fi
    sleep 1
  done
  if [ -z "$CONTAINER_BEFORE" ]; then
    echo "FAIL: container never appeared; wrapper exited before signal could be delivered. Switch the --name to a known longer-running scenario from bdd/features and retry."
    kill -9 "$WRAPPER_PID" 2>/dev/null
    exit 1
  fi
  kill -INT "$WRAPPER_PID"
  wait "$WRAPPER_PID"; SIG_EXIT=$?
  # Wait BDD_GRACE_MS (15s) + 5s safety buffer for cleanup to settle
  sleep 20
  ORPHANS=$(docker ps -a --filter name=bdd-runner- --format '{{.Names}} {{.Status}}')
  test -z "$ORPHANS"   # assert empty
  echo "SIG_EXIT=$SIG_EXIT"
  ```
  Assert: `CONTAINER_BEFORE` is non-empty, post-wait `ORPHANS` is empty, `SIG_EXIT` is non-zero (signal-derived; typically 130 for SIGINT). The placeholder `__placeholder_replace_with_known_long_scenario__` MUST be replaced before running — locate a suitable scenario via `grep -rn "^  Scenario:" bdd/features | head -20` and pick one known to take more than the time it takes for `docker run --detach` to return (typically 1-3s on a warm host). Evidence: `.omo/evidence/final-qa/wrapper-signal.txt`.

  (d) **Real crashing scenario, MUST be executed via the docker wrapper ONLY** (direct invocation is forbidden — see Must NOT Have list). Named in Original Request: "Node sequence completes successfully under runner-node spawn isolation". Steps:
  - Confirm wrapper route: `node -e "const s=require('./package.json').scripts; if (!s['test:bdd:ts'].includes('scripts/run-bdd-docker.js')) { console.error('test:bdd:ts not routed'); process.exit(1); }"` → must succeed before proceeding.
  - Pre-check no orphan containers: `docker ps --filter name=bdd-runner- -q | wc -l` → expect `0`.
  - Run: `yarn test:bdd:ts --name="Node sequence completes successfully under runner-node spawn isolation"` (this script invokes the wrapper after Task 4). If the scenario name has been renamed, locate it via `grep -rn "runner-node spawn isolation" bdd/features` and use the discovered Scenario name; record the resolved name in evidence.
  - During execution, observe a `bdd-runner-*` container appear via `docker ps --filter name=bdd-runner- -q` (proves it ran inside docker, NOT directly on host).
  - Assert opencode shell remains responsive: `echo READY-$?` returns within 1s of wrapper exit, regardless of whether the scenario itself crashed.
  - Post-check no orphan containers: `docker ps -a --filter name=bdd-runner- --format '{{.Names}} {{.Status}}'` → expect empty (the `--rm` flag + mandatory cleanup removed it).
  - Capture wrapper exit code; any value is acceptable (the test may legitimately fail) — the success criterion is that opencode survived AND the container ran AND no orphan remains.
  Forbidden alternatives: do NOT run `yarn --cwd=./bdd run test:bdd --name="..."`, `cucumber-js --name="..."`, or any direct host invocation as a fallback or comparison.

  Save all evidence to `.omo/evidence/final-qa/`.
  Output: `OOM-baseline [PASS/FAIL] | Wrapper-Timeout [PASS/FAIL] | Wrapper-Signal [PASS/FAIL] | Crash-Isolation [PASS/FAIL] | Orphan-Containers [CLEAN/N] | VERDICT`

- [x] F4. **Scope fidelity check** — `deep`
  Diff working tree vs main. For each task spec: verify exact 1:1 with diff — nothing missing, nothing beyond. Check "Must NOT do" compliance per task. Verify CI script names unchanged (preserved verbatim). Verify NO touched files in `bdd/package.json`, `bdd/cucumber.js`, `.github/workflows/*`, `packages/*`. Flag any unaccounted change.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(bdd): add docker-based BDD runner wrapper` — `scripts/run-bdd-docker.js`. Pre-commit: `node --check scripts/run-bdd-docker.js`.
- **2**: `chore(bdd): remove legacy safe-wrapper scripts` — `scripts/run-bdd-safe.js`, `scripts/test-bdd-safe-selftest.js`, `scripts/test-bdd-safe-memory.js`. Pre-commit: `git ls-files scripts/run-bdd-safe.js scripts/test-bdd-safe-*.js` returns empty.
- **3**: `docs(bdd): document docker runner` — `bdd/README.md`. Pre-commit: `grep -c run-bdd-docker bdd/README.md` ≥ 1; `grep -c run-bdd-safe bdd/README.md` = 0.
- **4**: `chore(bdd): route test:bdd* through docker wrapper` — `package.json`. Pre-commit:
  ```
  node -e "const s=require('./package.json').scripts; const aliases={'test:bdd-ci-api':'yarn test:bdd-ci-api-node'}; for (const k of Object.keys(s).filter(k=>k.startsWith('test:bdd')||k.startsWith('test:unified-'))) { if (aliases[k]) { if (s[k]!==aliases[k]) { console.error('alias broken:', k); process.exit(1); } continue; } if (!s[k].includes('run-bdd-docker')) { console.error('not routed:', k); process.exit(1); } }"
  ```

---

## Success Criteria

### Verification Commands
```bash
# Wrapper exists and is syntactically valid
node --check scripts/run-bdd-docker.js   # expect exit 0

# Legacy scripts deleted
test ! -e scripts/run-bdd-safe.js && \
  test ! -e scripts/test-bdd-safe-selftest.js && \
  test ! -e scripts/test-bdd-safe-memory.js   # expect exit 0

# All preserved script names route through wrapper (except the pure-alias `test:bdd-ci-api`)
node -e "const s=require('./package.json').scripts; const wrapped=['test:bdd','test:bdd:ts','test:bdd-ci-hub','test:bdd-ci-api-node','test:bdd-ci-api-topic','test:bdd-ci-python','test:bdd-ci-node','test:unified-py','test:unified-js']; for (const k of wrapped){if(!s[k])throw new Error('missing '+k);if(!s[k].includes('run-bdd-docker'))throw new Error('not routed '+k);} if (s['test:bdd-ci-api']!=='yarn test:bdd-ci-api-node') throw new Error('alias broken: test:bdd-ci-api'); console.log('OK')"

# Retired script keys absent
node -e "const s=require('./package.json').scripts; for (const k of ['test:bdd:safe','test:bdd:ts:safe','test:bdd:safe:selftest','test:bdd:safe:memory-selftest']) if (s[k]) throw new Error('leftover '+k); console.log('OK')"

# No retained references to run-bdd-safe
! grep -rn run-bdd-safe scripts/ package.json bdd/README.md   # expect exit 0 (no matches)

# Synthetic baseline: docker cgroup OOM (NOT through wrapper — wrapper's container command is hardcoded to yarn test:bdd)
docker run --rm --memory 64m --memory-swap 64m node:22 node -e "const a=[];while(true)a.push(Buffer.alloc(1024*1024))"; echo $?
# expect 137

# Wrapper-level timeout via tiny BDD_TIMEOUT_MS that fires during startup, regardless of scenario duration
BDD_TIMEOUT_MS=1 BDD_GRACE_MS=2000 yarn test:bdd -- -t @ci-hub; echo $?
# expect 124

# No orphan containers after both
docker ps -a --filter name=bdd-runner- --format '{{.Names}}'   # expect empty
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] OOM → 137, Timeout → 124, Signal → clean
- [ ] Crashing real scenario does NOT crash opencode
- [ ] CI script names preserved verbatim
- [ ] No orphan `bdd-runner-*` containers after any QA run
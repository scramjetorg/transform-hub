# Workflow

## Development Method

Use a test-conscious incremental workflow for every track. Prefer small, reviewable changes that preserve existing package behavior and runtime protocol compatibility.

## Guiding Principles

1. **The Plan is the Source of Truth:** Track work must be reflected in `plan.md`, including in-progress status, validation notes, skipped checks, and phase outcomes.
2. **Tracks Use Review Surfaces:** New Conductor tracks should start from a dedicated branch and GitHub pull request unless the user explicitly asks to omit that setup.
3. **The Tech Stack is Deliberate:** Changes to build tools, test frameworks, runtime targets, package managers, lint/format tools, release tooling, or major workflow commands must be documented in `conductor/tech-stack.md` before implementation.
4. **Test-Conscious Development:** Add or update focused tests before or alongside behavior changes. When tests-first is impractical for brownfield integration work, record the source inventory or regression target that proves the intended behavior.
5. **Narrow Validation:** Run the smallest reliable command that proves the changed behavior, then escalate only when the affected area crosses package, runtime, adapter, CLI/API, or BDD boundaries.
6. **Shared First:** Reuse and adapt existing shared packages before implementing package-local solutions, and move repeated code into shared packages when reuse emerges.

## Effective Policy Precedence and Plan Progression

Resolved Conductor configuration, including any track-level override, takes
precedence over this document's defaults. When instructions conflict, apply:

1. Effective configuration and track-level overrides.
2. Exception, safety, destructive-operation, and required-user-decision gates.
3. Branching and commit policies.
4. Workflow supervision and automatic progression policies.
5. Delegation policy.
6. This repository workflow where it does not conflict with the preceding rules.

Under automatic supervision, routine confirmation, manual-verification, and
retry procedures in this document do not create a pause unless the effective
automatic progression policy says that user input is required. Follow the
automatic process below for the canonical continuation outcome.

## Task Lifecycle

For each task:

1. Confirm the affected package, entrypoint, and expected behavior.
2. Read the relevant package codemap when present.
3. Check existing shared packages for reusable types, constants, helpers, contracts, or test utilities before adding package-local code.
4. Mark the task in `plan.md` as in progress using `[~]` when executing a Conductor track.
5. Write or update focused tests before or alongside implementation.
6. Implement the smallest change that satisfies the task.
7. Run the most relevant validation command available for the changed area.
8. Update documentation or Conductor artifacts when behavior changes.
9. Mark the task complete in `plan.md` using `[x]` after validation and review.
10. Defer commits until the phase checkpoint for Conductor tracks unless the user or plan explicitly requests task-level commits.

## Track Branch and Pull Request Policy

- When resolved `branching.mode` is `branched`, include dedicated branch and PR setup near the start of Phase 1 and perform it without routine confirmation. A request to omit branched execution must be resolved as a configuration or policy change before implementation continues.
- During Conductor track planning, include an explicit push-before-manual-verification checkpoint in every Conductor manual verification task: complete phase work, create the scoped phase commit, push the review branch, then ask for manual verification.
- Branch from the current branch at planning time unless the user requests a different base.
- Use the PR as the review and checkpoint surface for the track until completion.
- PR titles and descriptions should describe the intended TO-BE state of the complete track, not only the initial plan, specification, or documentation artifact.
- Create PR descriptions as real multiline Markdown. Prefer writing the body to a temporary Markdown file and using `gh pr create --body-file <file>` or `gh pr edit --body-file <file>` instead of passing escaped `\n` strings.
- Push phase checkpoint commits only when the current branch is the dedicated track branch. Never push Conductor track work directly to `main`.
- If an existing track lacks a branch or PR and pushing is needed, create the review surface before pushing. Pause only when the base, target, credentials, or push destination cannot be resolved safely without user input.

## Shared Package Usage and Deduplication

At the start of each phase:

1. Review relevant shared packages for existing reusable exports before adding package-local code. Common examples include `@scramjet/types`, `@scramjet/symbols`, `@scramjet/adapters-common`, `@scramjet/config`, and runtime executor contracts.
2. Record in `plan.md` when shared code is intentionally not used because the behavior is package-specific, adapter-specific, runtime-specific, experimental, or not yet repeated.
3. Prefer adapting existing shared APIs over creating parallel local DTOs, constants, validation helpers, config shapes, protocol helpers, runner contracts, or test utilities.

During the phase:

1. Keep shared code protocol-neutral, adapter-neutral, or runtime-neutral where possible.
2. Keep package-specific behavior as thin adapters around shared primitives when reuse exists.
3. Avoid implementing the same solution independently in multiple packages.

At the end of each phase:

1. Perform a deduplication check across changed packages and tests.
2. Move repeated or clearly reusable code into the appropriate shared package when doing so is safe within the phase scope.
3. Update imports, tests, and documentation to use the shared export.
4. Record the deduplication result in phase validation notes, including whether shared code was added, adapted, intentionally deferred, or not applicable.

## Delegation Guidance

Use delegation to accelerate Conductor work while preserving the active `plan.md` as the source of truth. Delegated work must remain bounded, reviewable, and aligned with the current phase.

Delegate when the task is separable, read-only research can run in parallel, or a focused implementation can be handed off with clear inputs and validation expectations. Do not delegate vague product decisions, phase checkpoint commits, destructive cleanup, or work that requires changing the active plan without review.

Recommended delegation patterns:

- Use `explore` or `explorer` for read-only codebase searches, dependency tracing, file discovery, and pattern lookups.
- Use `fixer` for bounded implementation tasks after scope, expected behavior, and verification are clear.
- Use `librarian` for external documentation, dependency behavior, API references, and public examples.
- Use `reviewer` for formal code, plan, and phase review.
- Use `oracle` only for reviewer-recommended material strategic architecture and trade-off escalations.
- Use `designer` only for UI/UX work.
- Use `general` for mixed multi-step tasks that do not fit a narrower agent.
- Use `councillor` for independent read-only review when a second opinion is useful.

Delegation rules:

1. Provide each delegate with the relevant track goal, affected package, files or directories of interest, expected output, edit permission, and validation expectations.
2. Keep delegated implementation tasks narrow enough to validate with the smallest reliable command.
3. Review delegated findings or edits before marking any `plan.md` task complete.
4. Record meaningful delegated findings, validation results, and unresolved risks in active track notes or the phase validation summary.
5. Do not let delegated agents commit changes unless the current phase checkpoint explicitly authorizes a commit.
6. Do not use delegation to bypass test, coverage, deduplication, documentation, or Conductor checkpoint requirements.
7. Keep prompts specific and bounded; include exact goals, relevant paths, required output format, and whether edits are forbidden or allowed.
8. Explicitly tell delegated agents not to subdelegate unless the task requires it and the delegation boundary is intentional.

### Implementation Delegation

Use the `fixer` agent for less complex implementation tasks when the work is
bounded, mostly local to one package, and can be described with clear expected
changes and verification.

Prefer delegating to `fixer` when all of these are true:

1. The affected package or local area is known.
2. The task can be completed mostly within a single package.
3. The desired behavior is already defined by the track, issue, test, or prior investigation.
4. The expected changes can be described as a bounded set of edits.
5. The verification can be stated as concrete package-level commands or checks.
6. The task does not require product clarification, architecture decisions, or cross-track planning.

Allow the `fixer` agent to perform small local discovery inside the package or
area it was assigned, but do not delegate broad repository exploration or
multi-package design decisions to it.

Split implementation work into multiple `fixer` delegations when the change
touches several packages or interdependent areas. Each delegation should have a
single-package or otherwise tightly bounded scope. After the delegated chunks
complete, the parent agent must perform integration review and run the narrowest
sufficient integration-level validation.

When delegating to `fixer`, provide:

1. A concise task description.
2. The relevant package, files, entrypoints, and constraints.
3. The expected set of changes.
4. The verification command(s) or checks to run.
5. Known failure classifications, known-solution constraints, or files that must not be touched.

Do not delegate to `fixer` when the task requires:

1. Choosing between competing designs.
2. Broad repository exploration before implementation.
3. Changing public contracts, runtime protocol behavior, or operational defaults without prior approval.
4. Resolving unclear product behavior.
5. Editing user-controlled or unrelated files.
6. Handling destructive cleanup or risky migrations.

Delegations should generally be completed once started. If a delegated task
encounters unclear behavior, scope expansion, conflicting worktree changes, or a
non-converging failure, the parent agent should resolve the blocker, ask the user
when required, then either resume the delegation or split it into a clearer
bounded task.

The parent agent remains responsible for reviewing delegated changes, confirming
or running verification, performing integration-level validation after related
delegations complete, updating Conductor artifacts, asking the user when
required, and committing only scoped completed work.

## Testing Requirements

### Memory-Guarded Completion Evidence

Every final Conductor track summary must list the memory-guarded validation that was run for the changed surface. Include:

1. Exact commands, including `ulimit`, `NODE_OPTIONS`, and `SCRAMJET_*_MEMORY_GUARD` environment variables.
2. Effective thresholds: parent heap, AVA/BDD overrides, child process RSS, and Docker working-set limits when applicable.
3. Any skips or exceptions, with non-empty reasons and follow-up owners for deferred coverage.
4. A note when a memory-guarded check was intentionally not applicable, such as docs-only changes.

Use the supported runners only: `scripts/run-ava.js` for AVA/package tests and `scripts/run-bdd.js`/root BDD npm scripts for Cucumber paths.

### AVA Memory Guard Adoption and Review

AVA guard mode and per-test measurement are separate requirements. Setting
`SCRAMJET_AVA_MEMORY_GUARD=1`, `SCRAMJET_MEMORY_GUARD=1`, or using the
`phase-final` profile makes `scripts/run-ava.js` run serially with GC exposed; it
does **not** measure a file that registers tests directly with AVA. Every test file
claimed as memory-guarded must use `createAvaMemoryGuard(baseTest)`.

Use `registerAvaMemoryCleanup(t, fn)` inside the test body to release retained
buffers, chunks, streams, captures, mocks, and large responses before final
measurement. `t.teardown()` runs after the guard measurement and is not sufficient
for guard-visible cleanup.

`allowAvaMemoryGrowth(t, { threshold, reason })` keeps measurement enabled but
**replaces** the default threshold for that test; it is not additional headroom.
Every allowance needs a non-empty reason and must be listed in validation evidence.
The phase-final proof path permits no allowances, per-file threshold overrides, or
memory skips. Environment skips require `SCRAMJET_MEMORY_SKIP_REASON` and must be
recorded with their reason.

Before claiming AVA guard coverage, run the adoption checker against the exact test
files and include its JSON report with the validation record:

```bash
npm run check:ava-memory-guard-adoption -- --json --strict <ava-test-file...>
```

Under `SCRAMJET_TEST_PROFILE=phase-final`, the checker fails for missing adoption,
skips, or allowances. It reports runner mode separately from source-level adoption;
do not call an unadopted test measured merely because the runner guard is enabled.
The AVA guard measures the AVA worker's heap only. Verify child-process and Docker
memory/cleanup with the BDD or sequence-test mechanisms and separate process-level
functional tests.

Review checklist:
- Confirm every claimed test file adopts `createAvaMemoryGuard`.
- Check guard-visible cleanup before accepting an allowance.
- Record the exact command, default threshold, every effective allowance, and skips.
- Review the current source and validation output; do not repeat superseded findings.
- Distinguish parent-heap evidence from spawned-process behavior.


- Maintain greater than 80% meaningful test coverage for changed behavior.
- Prefer package-level tests for focused implementation work.
- Use runtime parity tests for runtime wrapper changes.
- Use BDD smoke tests when behavior crosses hub, adapter, runner, and CLI boundaries.
- Avoid full Docker BDD unless a task specifically requires Docker or Kubernetes behavior.
- Supported AVA runner is `scripts/run-ava.js`; all package AVA tests must route through it.
- Supported BDD runner is `scripts/run-bdd.js`; Docker mode is default and the supported memory-constrained path. Direct mode is diagnostic/local only.

## Validation Commands

Choose the narrowest sufficient validation:

- Default memory guard for agent-run Node/test validation: `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"`. Start tests and Node-based validation under this guard unless the command is run through a repo/package test runner that already owns process setup and memory behavior. Do not wait for an OOM before applying the guard.
- AVA package tests use `scripts/run-ava.js`, which defaults the spawned AVA process to `--max-old-space-size=2048`, JIT with WASM caps (8192 pages, 256 MB committed code/code space), and `TS_NODE_TRANSPILE_ONLY=1`. Use `SCRAMJET_TEST_PROFILE=fast` for 16 AVA workers and an 8 MiB concurrent-mode budget, or `SCRAMJET_TEST_PROFILE=phase-final` for serial package execution and the strict unchanged 524288-byte AVA guard. Fast mode does not run concurrent per-test GC measurements; an enabled guard always serializes AVA. Do not increase timeouts, skip measurement, or add allowances for phase-final evidence.
- BDD tests use `scripts/run-bdd.js` (supported entrypoint) or `scripts/run-bdd-docker.js` (internal). The supported memory-constrained path is Docker mode (default), which runs Cucumber inside a Docker container with 1536m memory, 2 CPUs, 600 s timeout, 10 s grace period. Direct mode (`--mode=direct`) is diagnostic/local only; under strict host ulimit, BDD step definitions load ssh2/poly1305 WebAssembly which may fail to allocate. Post-run leak detection runs automatically on all exit paths.
- Runner regression tests: `npm run test:runner` covers AVA and BDD runner helper tests under memory guard.
- Biome scripts set `RAYON_NUM_THREADS=12` by default. This bounded parallelism has been measured at ~98 MB max RSS for `npm run lint` under the virtual-memory cap on the current 24-core agent host; record any native allocation failure before considering a cap change.
- If a command fails under the default memory guard, classify the failure normally before retrying. Do not silently raise the cap; record the attempted command, cap, failure mode, and reason for any narrower or runner-specific retry.

- Package build: `npm run build:packages`
- Local package tests: `npm run test:packages` (j4, 3.5 GiB aggregate-RSS budget)
- GitHub package tests: `npm run test:packages:ci` (j2, 2.5 GiB aggregate-RSS budget)
- Fast package tests: `npm run test:packages:fast`
- Phase-final package proof: `npm run test:packages:phase-final`
- Lint/check: `npm run lint` for the active Biome lint surface, or a narrower Biome command when the active track calls for changed/staged-file validation. Use explicit format commands for formatting validation. Do not run legacy ESLint commands during the Biome migration track.
- Runtime invariant check: `npm run check:runtime-invariants`
- BDD node smoke: `npm run test:bdd-ci-node`
- BDD python smoke: `npm run test:bdd-ci-python`
- BDD API node smoke: `npm run test:bdd-ci-api-node`

## Failure Recovery Policy

Validate every tool call result, but distinguish incorrect invocation from a
real product or code failure.

### Automatic-supervision pause rule

Under automatic supervision, every halt, pause, or request for guidance in
this section remains subject to the higher-precedence automatic progression and
exception policies. Do not pause solely to request permission to record a known
solution; retain the evidence in active track notes and defer that optional
artifact update if necessary. "Repeated fixes do not converge" is not a fixed
attempt cap: continue safe, evidence-based diagnosis, remediation, and review
until a concrete effective stop condition is identified. Record or defer
unrelated failures that do not invalidate required verification instead of
pausing.

Before deciding on a recovery path for a recurring or recognizable failure,
consult `conductor/known-solutions.md`. If an entry matches the observed
problem, follow its Solution, Constraints, and Ignore-If rules. If no entry
matches, use the general recovery policy below.

When a new repeatable recovery path is discovered:

1. Apply it without user confirmation only when it is safe, local to the active
   task, non-destructive, and within the current track scope.
2. Before adding or updating `conductor/known-solutions.md`, pause and ask the
   user whether the proposed solution should be recorded.
3. Present the observed problem, proposed solution, constraints, and ignore
   conditions in the question.
4. If approved, update `known-solutions.md` with a fixed five-line problem entry.
5. If rejected, continue the current task if possible, but do not record the
   solution as known.

### Test and Validation Failures

When a test, build, lint, or validation command exits non-zero, do not halt
solely because the command failed. Instead:

1. Inspect the failure output, identify the root cause.
2. Determine whether the command was invoked correctly.
3. If the command was invoked incorrectly:
   - Correct the invocation and rerun it.
   - If the incorrect command mutated files or generated artifacts, revert only
     those artifacts before continuing.
4. If the command was invoked correctly:
   - First check whether the test is correct and aligned with the intended
     behavior.
   - If the test is incorrect, fix the test.
   - If the test is correct, fix the implementation.
5. Rerun the narrowest relevant validation after each fix.
6. Halt and ask the user only when:
   - the failure requires product or behavior clarification;
   - repeated fixes do not converge;
   - continuing would require destructive cleanup;
   - unrelated user or worktree changes directly conflict with the fix.

## Validation and Tool Failure Continuation Protocol

When a validation, test, or tool command fails, do not halt automatically. First classify the failure before deciding whether to continue:

1. Identify the failing command or tool invocation.
2. Identify the specific error, symptom, or failing assertion.
3. Identify the likely root cause before taking corrective action.
4. Classify the failure as one of:
   - session-introduced,
   - preexisting but in scope,
   - preexisting and out of scope,
   - environment/tooling/transient,
   - or known in the current session.

Continue without additional user confirmation when fixing session-introduced failures, fixing preexisting in-scope failures, or carrying forward failures already marked known in the current session, provided the fix is safe, local, non-destructive, and within scope. Briefly note when a failure appears preexisting but in scope, or when a known failure is not treated as a blocker.

Pause for user guidance only when the failure appears preexisting and unrelated to the active track/session scope, the root cause cannot be classified after reasonable investigation, or the fix would require scope expansion, architecture changes, or edits to user-controlled files.

Distinguish command failures from tool misuse. Command and test failures with meaningful output follow the classification rules above. Malformed tool invocations, missing permissions, or unavailable tooling should be corrected if the fix is obvious; otherwise pause for guidance. Read-only diagnostic retries are allowed when the original tool choice or arguments were wrong.

When continuing past a non-blocking failure, record it in the track notes, validation summary, or handoff with the failed command, root cause, classification, and whether it was fixed, ignored as known, or deferred.

### Tool Invocation Failures

If a tool fails because it was wrongly invoked, correct the invocation and
continue. Examples include a wrong working directory, wrong package-specific
test command, missing CLI flags, direct command used instead of a package's
configured runner, or stale/generated output selected because the source-tree
invocation was wrong.

If the wrongly invoked tool mutated files, generated output, or changed state:

1. Identify exactly what the bad invocation changed.
2. Revert only those changes.
3. Do not revert unrelated user or agent work.
4. Retry with the corrected invocation.

If the tool failed despite correct invocation, treat it as a real validation
failure and follow the test and validation failure policy above.

## Commit Policy

- For Conductor tracks, commit after each completed phase, not after each task, unless the user or plan explicitly requests task-level commits.
- For non-track work or small standalone tasks, task-level commits remain acceptable when explicitly requested.
- Keep phase commits scoped to the phase.
- Do not commit unrelated working tree changes.
- Include a concise phase summary in the commit message body when helpful.
- Do not use Git notes for routine task or phase summaries.

## Phase Completion Verification and Checkpointing Protocol

At the end of each phase:

1. Review all completed tasks in the phase against the phase goal.
2. Confirm shared packages were reviewed at phase start and reused or adapted where appropriate.
3. Perform the end-of-phase deduplication check and move repeated code into shared packages when safe within scope.
4. Run the validation command(s) appropriate for the phase scope.
5. Confirm docs, tests, and code are aligned.
6. Record any skipped validation and the reason.
7. Create the scoped phase checkpoint commit required by the resolved commit policy.
8. Update `plan.md` with the phase checkpoint commit SHA when a phase commit is created.
9. Push the review branch before asking for manual verification when the track uses a dedicated branch or PR review surface.
10. Apply the resolved supervision policy at manual-verification points. Under automatic supervision, skip generic or routine manual-verification pauses when equivalent automated evidence is available; record that evidence or non-applicability and continue. If a plan acceptance criterion can only be satisfied by the user, treat it as pending required user input: first complete the required phase commit, push, and PR preparation, then ask via `ask_user` with the PR URL and pause. A task's "manual verification" label alone does not make user input required.

## Quality Gates

- No known failing tests caused by the change.
- No undocumented change to runtime selection, adapter behavior, or CLI/API contracts.
- No protocol divergence across supported runtimes unless explicitly planned.
- No hidden operational default changes.


## Automatic process

When effective supervision is automatic:

1. Execute plan tasks in order without routine task or phase approvals. Ordinary specialist output, remediable verification failures, and review findings do not by themselves pause progression.
2. After each task, or a coherent adjacent group that one specialist can safely own, run bounded verification and a configured-review-specialist review. At every phase end, run the full phase review before beginning the next phase.
3. `PASS` verdict: advances immediately. Individual review findings use a `no_issue` disposition for non-blocking observations.
4. `BLOCKED` verdict: the review found issues that require attention. Individual findings carry one of the following dispositions:
   - `blocked`: limited to a concrete user decision or unavailable prerequisite that cannot be remediated without user input. Do not convert `blocked` findings into debt merely to permit progression.
   - `deferred`: may advance only when the reviewer explicitly states that continuation is safe. Record the complete finding and safe-continuation rationale in the effective track `tech-debt.md`.
   - `accepted`: the finding is acknowledged but not acted upon; progression is permitted unless other rules prohibit it.
5. After `PASS` or when all `BLOCKED` findings carry safe `deferred` or `accepted` dispositions, complete the required phase checkpoint and begin the next phase immediately unless cancellation, pause, superseding instruction, or required user input is pending.

## Review Guidance

Reviewer reviews must prioritize a working, repeatable prototype and fast completion over production-grade hardening.

- Confirm that the phase meets its stated acceptance criteria, preserves isolation between named runs, and keeps credentials out of committed files and routine logs.
- Treat production concerns—distributed locking, adversarial multi-host concurrency, exhaustive crash recovery, high-availability, performance tuning, and generalized hardening—as non-blocking follow-up recommendations unless the track specification explicitly requires them.
- Do not block a phase for theoretical races or defense-in-depth improvements unless the track spec specifically requires this level of review.
- Report optional hardening separately from required MVP findings.
- A finding is blocking only when it prevents a subsequent planned phase or directly contradicts the track specification.
- When the MVP acceptance criteria and relevant verification pass, approve the phase rather than requesting production-system guarantees.
- When the reviewer identifies a material strategic question requiring architecture or trade-off advice beyond routine code or plan review, recommend escalation to oracle.

After each reviewer phase review, record every non-`PASS` canonical finding in the effective track `tech-debt.md` with its verdict and disposition. Mark `blocked` findings addressed only after a fresh review resolves it; mark `deferred` only when review explicitly permits safe continuation; never reclassify `blocked` as debt to advance.

## Track completion

After the final phase receives `PASS` or when all `BLOCKED` findings carry safe `deferred` or `accepted` dispositions, run
the configured track-completion verification. If no deferred or non-compliant
work remains, finalize the track immediately without routine confirmation. If
such work remains, summarize the complete findings and ask whether to implement
it now or accept the documented deferrals; pause for that decision. If
implementation is chosen, remediate and re-review before finalization. If
acceptance is chosen, record it and then complete the track.

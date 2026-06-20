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

- During Conductor track planning, include dedicated branch and PR setup near the start of Phase 1 by default unless the user explicitly asks to omit it.
- During Conductor track planning, include an explicit push-before-manual-verification checkpoint in every Conductor manual verification task: complete phase work, create the scoped phase commit, push the review branch, then ask for manual verification.
- Branch from the current branch at planning time unless the user requests a different base.
- Use the PR as the review and checkpoint surface for the track until completion.
- PR titles and descriptions should describe the intended TO-BE state of the complete track, not only the initial plan, specification, or documentation artifact.
- Create PR descriptions as real multiline Markdown. Prefer writing the body to a temporary Markdown file and using `gh pr create --body-file <file>` or `gh pr edit --body-file <file>` instead of passing escaped `\n` strings.
- Push phase checkpoint commits only when the current branch is the dedicated track branch. Never push Conductor track work directly to `main`.
- If an existing track lacks a branch or PR and pushing is needed, create or ask for the review surface before pushing.

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
- Use `oracle` for architecture tradeoffs, complex debugging, code review, simplification, maintainability review, and risk analysis.
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

- Maintain greater than 80% meaningful test coverage for changed behavior.
- Prefer package-level tests for focused implementation work.
- Use runtime parity tests for runtime wrapper changes.
- Use BDD smoke tests when behavior crosses hub, adapter, runner, and CLI boundaries.
- Avoid full Docker BDD unless a task specifically requires Docker or Kubernetes behavior.

## Validation Commands

Choose the narrowest sufficient validation:

- Default memory guard for agent-run Node/test validation: `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"`. Start tests and Node-based validation under this guard unless the command is run through a repo/package test runner that already owns process setup and memory behavior. Do not wait for an OOM before applying the guard.
- If a command fails under the default memory guard, classify the failure normally before retrying. Do not silently raise the cap; record the attempted command, cap, failure mode, and reason for any narrower or runner-specific retry.

- Package build: `npm run build:packages`
- Serial package tests: `npm run test:packages-no-concurrent`
- Lint/check: follow the active track tooling. During the Biome migration track, use Biome commands and do not run legacy ESLint lint commands.
- Runtime invariant check: `npm run check:runtime-invariants`
- BDD node smoke: `npm run test:bdd-ci-node`
- BDD python smoke: `npm run test:bdd-ci-python`
- BDD API node smoke: `npm run test:bdd-ci-api-node`

## Failure Recovery Policy

Validate every tool call result, but distinguish incorrect invocation from a
real product or code failure.

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
7. Create one scoped phase commit when commits are requested or the active track calls for checkpointing.
8. Update `plan.md` with the phase checkpoint commit SHA when a phase commit is created.
9. Push the review branch before asking for manual verification when the track uses a dedicated branch or PR review surface.
10. Ask the user to manually verify the phase before moving to the next phase when the plan includes a Conductor manual verification task.

## Quality Gates

- No known failing tests caused by the change.
- No undocumented change to runtime selection, adapter behavior, or CLI/API contracts.
- No protocol divergence across supported runtimes unless explicitly planned.
- No hidden operational default changes.

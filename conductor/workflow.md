# Workflow

## Development Method

Use a test-conscious incremental workflow for every track. Prefer small, reviewable changes that preserve existing package behavior and runtime protocol compatibility.

## Task Lifecycle

For each task:

1. Confirm the affected package, entrypoint, and expected behavior.
2. Read the relevant package codemap when present.
3. Write or update focused tests before or alongside implementation.
4. Implement the smallest change that satisfies the task.
5. Run the most relevant validation command available for the changed area.
6. Update documentation or Conductor artifacts when behavior changes.
7. Commit after the task is complete with a concise message.

## Testing Requirements

- Maintain greater than 80% meaningful test coverage for changed behavior.
- Prefer package-level tests for focused implementation work.
- Use runtime parity tests for runtime wrapper changes.
- Use BDD smoke tests when behavior crosses hub, adapter, runner, and CLI boundaries.
- Avoid full Docker BDD unless a task specifically requires Docker or Kubernetes behavior.

## Validation Commands

Choose the narrowest sufficient validation:

- Package build: `npm run build:packages`
- Serial package tests: `npm run test:packages-no-concurrent`
- Lint: `npm run lint`
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
matches, use the general recovery policy below. When a new repeatable recovery
path is learned, update `known-solutions.md` with a fixed five-line problem
entry.

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

Continue without additional user confirmation when fixing session-introduced failures, fixing preexisting in-scope failures, or carrying forward failures already marked known in the current session. Briefly note when a failure appears preexisting but in scope, or when a known failure is not treated as a blocker.

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

- Commit after each completed task.
- Keep commits scoped to the task.
- Do not commit unrelated working tree changes.
- Include task summaries in commit messages when helpful.

## Phase Completion Verification and Checkpointing Protocol

At the end of each phase:

1. Review all completed tasks in the phase against the phase goal.
2. Run the validation command(s) appropriate for the phase scope.
3. Confirm docs, tests, and code are aligned.
4. Record any skipped validation and the reason.
5. Ask the user to manually verify the phase before moving to the next phase when the plan includes a Conductor manual verification task.

## Quality Gates

- No known failing tests caused by the change.
- No undocumented change to runtime selection, adapter behavior, or CLI/API contracts.
- No protocol divergence across supported runtimes unless explicitly planned.
- No hidden operational default changes.

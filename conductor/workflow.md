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

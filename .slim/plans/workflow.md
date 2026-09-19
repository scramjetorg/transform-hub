# Effective Planning Workflow

Source: shipped `planning-workflow` skill; no repository-specific planner workflow exists.

1. Research repository intent, constraints, affected paths, and existing test/CI patterns before drafting.
2. Keep requirements optional; create `.slim/plans/requirements.md` only when explicitly requested.
3. Maintain `.slim/plans/index.md`, this workflow record, and one directory per plan containing `index.md`, `review.md`, and phase files.
4. Record objective, scope, non-goals, observable acceptance criteria, dependencies, delivery mode, approved decisions, evidence, and unresolved decisions.
5. Do not implement, execute tests, or create `outcomes.md` during planning. `outcomes.md` is created only by plan completion after actual completion evidence.
6. Phase tasks use `[ ]`, `[~]`, `[x]`, `[!]`, or `[-]` states and at most two nesting levels.

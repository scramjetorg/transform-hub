# Phase 3 — Curated Devel Build Validation

## Outcome

The protected `devel` candidate runs the curated full BDD suite once against its single built output. The later `main` phase independently validates the staged tarball installation before npm publication.

## Tasks

- [ ] Define the curated full-BDD selection and local/CI command interface for the protected `devel` built output.
- [ ] Verify the build identity, source SHA, built package boundary, and digest-pinned GHCR image identity before launching BDD; emit a consumed-input record.
- [ ] Implement bounded full-BDD shards against the single built output, with fail-fast cancellation and no additional build.
- [ ] Claim BDD execution by `(source SHA, build identity, test-matrix revision)` before scheduling shards; persist each shard's signed completion evidence in candidate state.
- [ ] On a workflow rerun, reuse successful shard evidence and schedule only unstarted/interrupted shards; never automatically rerun a completed full matrix. A failed completed shard makes the candidate non-admissible until a new candidate is produced.
- [ ] Define the PR smoke policy separately: deterministic affected-workspace closure and a small risk-area TypeScript smoke matrix using `tsx` or Node with type checking omitted and no package build.
- [ ] Attest successful candidate BDD evidence against source/tree, build identity, staged tarball hashes, and image digests.

## Acceptance Criteria

- The same command shape supports a developer-triggered devel-build proof and CI verification.
- Full BDD executes once per source SHA/build identity and records its exact consumed inputs.
- Retrying infrastructure work cannot duplicate a completed pack or BDD shard for the same candidate state key.

## Validation Evidence

- Curated BDD selection/policy tests and source/build-identity mismatch fixtures.
- Full BDD run against one built candidate output and its consumed-input record.

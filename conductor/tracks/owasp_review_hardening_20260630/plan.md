# Implementation Plan: OWASP Review Hardening

## Phase 1: Track Setup and Security Inventory

- [ ] Task: Create implementation branch during execution
    - [ ] Capture the current branch as the PR base branch.
    - [ ] Create the implementation branch `conductor/owasp_review_hardening_20260630` from the current HEAD.
    - [ ] Do not make granular start-marker commits or open a PR during planning or track creation.
    - [ ] Perform all implementation work on this branch.
    - [ ] Use one evolving implementation commit for checkpoints: create it at the first checkpoint, then amend it for later checkpoints.
    - [ ] Push the branch after each checkpoint commit; after amendments, use `git push --force-with-lease origin conductor/owasp_review_hardening_20260630`.
- [ ] Task: Inventory production package security surfaces with @explorer
    - [ ] Read root `codemap.md` and package codemaps where present before deep package inspection.
    - [ ] Exclude tests, specs, fixtures, mocks, BDD scenarios, and generated build output.
    - [ ] Inventory API surface, upload/storage, runtime/adapters, and config/logging paths.
    - [ ] Record affected packages, files, symbols, and current security-relevant controls.
- [ ] Task: Produce OWASP/ASVS/CWE risk register with @oracle
    - [ ] Map each finding to relevant OWASP/ASVS/CWE themes where practical.
    - [ ] Include severity, confidence, exploit preconditions, compatibility impact, and recommended disposition.
    - [ ] Explicitly list reviewed areas with no applicable finding.
- [ ] Task: Checkpoint inventory work
    - [ ] Stage track/risk-register updates for completed inventory work.
    - [ ] Create the single implementation commit if it does not exist, otherwise amend it without changing the message.
    - [ ] Push the branch, using `--force-with-lease` after any amend.
- [ ] Task: Conductor - Phase Completion 'Track Setup and Security Inventory' (Protocol in workflow.md)
    - [ ] Review phase output against the specification.
    - [ ] Confirm shared package opportunities were considered for later fixes.
    - [ ] Record skipped validation and rationale.

## Phase 2: Decision Checkpoints

- [ ] Task: Decide disposition for API surface findings
    - [ ] For each API surface finding, choose exactly one: Fix, Document, or Ignore.
    - [ ] Record rationale and compatibility expectations in `plan.md` before any related implementation.
    - [ ] If Fix is selected, identify the existing focused validation command to run.
    - [ ] Checkpoint the single implementation commit and push the branch after this decision set is recorded.
- [ ] Task: Decide disposition for upload/storage findings
    - [ ] For each upload/storage finding, choose exactly one: Fix, Document, or Ignore.
    - [ ] Record rationale and compatibility expectations in `plan.md` before any related implementation.
    - [ ] If Fix is selected, identify the existing focused validation command to run.
    - [ ] Checkpoint the single implementation commit and push the branch after this decision set is recorded.
- [ ] Task: Decide disposition for runtime/adapter findings
    - [ ] For each runtime/adapter finding, choose exactly one: Fix, Document, or Ignore.
    - [ ] Record rationale and compatibility expectations in `plan.md` before any related implementation.
    - [ ] If Fix is selected, identify the existing focused validation command to run.
    - [ ] Checkpoint the single implementation commit and push the branch after this decision set is recorded.
- [ ] Task: Decide disposition for config/logging findings
    - [ ] For each config/logging finding, choose exactly one: Fix, Document, or Ignore.
    - [ ] Record rationale and compatibility expectations in `plan.md` before any related implementation.
    - [ ] If Fix is selected, identify the existing focused validation command to run.
    - [ ] Checkpoint the single implementation commit and push the branch after this decision set is recorded.
- [ ] Task: Conductor - Phase Completion 'Decision Checkpoints' (Protocol in workflow.md)
    - [ ] Verify every finding has exactly one disposition before implementation begins.
    - [ ] Confirm no breaking-default, central-auth, CI-tooling, or broad E2E work has entered scope without explicit approval.
    - [ ] Record deferred or ignored risk rationale.

## Phase 3: Execute Selected Fix Decisions

- [ ] Task: Implement selected API surface fixes with @fixer
    - [ ] Execute only findings marked Fix in Phase 2.
    - [ ] Preserve compatibility and avoid central auth implementation unless separately approved.
    - [ ] Reuse shared middleware/config primitives when existing package boundaries support it.
    - [ ] Run identified existing focused validation commands.
    - [ ] After automated verification, record results, amend the single implementation commit, and push the branch.
- [ ] Task: Implement selected upload/storage fixes with @fixer
    - [ ] Execute only findings marked Fix in Phase 2.
    - [ ] Preserve compatibility for existing upload and storage behavior unless separately approved.
    - [ ] Prefer shared path-containment or validation helpers when reuse is clear.
    - [ ] Run identified existing focused validation commands.
    - [ ] After automated verification, record results, amend the single implementation commit, and push the branch.
- [ ] Task: Implement selected runtime/adapter fixes with @fixer
    - [ ] Execute only findings marked Fix in Phase 2.
    - [ ] Preserve adapter behavior and deployment defaults unless separately approved.
    - [ ] Avoid broad Docker/Kubernetes E2E validation unless a selected fix specifically requires it.
    - [ ] Run identified existing focused validation commands.
    - [ ] After automated verification, record results, amend the single implementation commit, and push the branch.
- [ ] Task: Implement selected config/logging fixes with @fixer
    - [ ] Execute only findings marked Fix in Phase 2.
    - [ ] Preserve config schemas and defaults unless separately approved.
    - [ ] Avoid logging sensitive payloads, env values, keys, tokens, certificates, or raw user data where possible without behavior changes.
    - [ ] Run identified existing focused validation commands.
    - [ ] After automated verification, record results, amend the single implementation commit, and push the branch.
- [ ] Task: Conductor - Phase Completion 'Execute Selected Fix Decisions' (Protocol in workflow.md)
    - [ ] Review completed fixes against their recorded decisions.
    - [ ] Run the narrowest sufficient aggregate validation for changed packages.
    - [ ] Run `npm run lint` if code changes cross multiple packages or lint-sensitive surfaces.
    - [ ] Record skipped tests and reasons, especially where existing focused tests are unavailable.
    - [ ] After automated phase verification, amend the single implementation commit and push the branch.

## Phase 4: Execute Selected Document and Ignore Decisions

- [ ] Task: Document selected documentation-only findings with @librarian
    - [ ] Update appropriate project/package docs for findings marked Document.
    - [ ] Include operational assumptions, mitigations, compatibility notes, and OWASP/ASVS/CWE references where useful.
    - [ ] Avoid documenting speculative risks as confirmed vulnerabilities.
    - [ ] After documentation validation, amend the single implementation commit and push the branch.
- [ ] Task: Record ignored findings
    - [ ] For each finding marked Ignore, record the rationale, risk owner/assumption if known, and conditions that would reopen the finding.
    - [ ] Do not modify product code for ignored findings.
    - [ ] Checkpoint the single implementation commit and push the branch after ignored findings are recorded.
- [ ] Task: Conductor - Phase Completion 'Execute Selected Document and Ignore Decisions' (Protocol in workflow.md)
    - [ ] Confirm documentation-only and ignored findings have rationale.
    - [ ] Confirm docs and plan status are aligned.
    - [ ] Record any skipped documentation validation.
    - [ ] After automated phase verification, amend the single implementation commit and push the branch.

## Phase 5: Final Review, Validation, and Branching Policy Finalization

- [ ] Task: Final security review with @oracle
    - [ ] Review the completed findings, decisions, fixes, documentation, and ignored risks.
    - [ ] Confirm no selected fix introduced breaking defaults, central auth work, CI tooling, or broad E2E scope without approval.
    - [ ] Identify any residual high-priority risks that should become follow-up tracks.
- [ ] Task: Final validation
    - [ ] Run the narrowest sufficient final validation based on actual changed packages.
    - [ ] Prefer existing focused package checks; use `npm run test:packages`, `npm run build:packages`, or `npm run lint` only when the change scope justifies them.
    - [ ] Record command, result, skipped checks, and rationale.
    - [ ] After automated final verification, amend the single implementation commit and push the branch.
- [ ] Task: Branching Policy finalization
    - [ ] Ensure the single implementation commit contains all completed implementation work and verification notes.
    - [ ] Push the implementation branch, using `--force-with-lease` if the final checkpoint amended the commit.
    - [ ] Copy `spec.md` to a temporary PR body file and create a draft PR targeting the captured base branch with title `owasp review hardening`.
    - [ ] Post verification results as a PR comment, not in the PR body.
    - [ ] Mark the draft PR ready only after final verification is complete.
- [ ] Task: Conductor - Phase Completion 'Final Review, Validation, and Branching Policy Finalization' (Protocol in workflow.md)
    - [ ] Confirm all phases meet the specification and acceptance criteria.
    - [ ] Confirm the final plan records validation results and deferred risks.
    - [ ] Return the PR URL and concise handoff summary.

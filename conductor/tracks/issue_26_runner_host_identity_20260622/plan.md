# Implementation Plan: Fix Issue 26 - Auto-Derive Unique STH Runner Verser2 Host Identities

## Phase 1: Track Setup and Baseline Discovery

- [ ] Task: Create the Conductor review surface
    - [ ] Branch from the current branch into a dedicated track branch unless the user asks to continue in-place.
    - [ ] Prepare a PR description describing the final intended behavior.
    - [ ] Create or update the PR after the first implementation checkpoint is ready.
- [ ] Task: Confirm affected package entrypoints
    - [ ] Read package codemaps for `packages/sth-config`, `packages/config`, and `packages/host` when present.
    - [ ] Inspect `packages/sth-config/src/default-config.ts` for current runner Host defaults.
    - [ ] Inspect `packages/host/src/lib/runner-verser2-host-config.ts` for peer ID and Host ID derivation.
    - [ ] Inspect Host startup in `packages/host/src/lib/host.ts` to confirm when `host.id` is available relative to runner Host startup and Manager registration.
    - [ ] Inspect `packages/config/src/verser2-config.ts` for CLI/env option descriptions and validation opportunities.
- [ ] Task: Establish focused regression targets
    - [ ] Identify existing tests for runner Verser2 Host config derivation.
    - [ ] Identify existing tests for STH config defaults.
    - [ ] Identify existing tests for config option descriptions or validation warnings if available.
    - [ ] Record any missing test surface before implementation.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Track Setup and Baseline Discovery' (Protocol in workflow.md)

## Phase 2: Contract the Desired Config Behavior with Tests

- [ ] Task: Add or update runner Host config derivation tests
    - [ ] Cover `localBroker.peerId = "auto"` resolving to `sth.<hostId>.runner.broker`.
    - [ ] Cover derived runner Host ID remaining `<resolvedPeerId>.host`.
    - [ ] Cover explicit custom peer IDs remaining unchanged.
    - [ ] Cover missing host ID with `auto` producing a clear failure or being prevented by earlier host ID resolution.
- [ ] Task: Add or update default config tests
    - [ ] Assert the default `verser2.runnerHost.localBroker.peerId` is `auto`.
    - [ ] Ensure unrelated runner Host defaults remain unchanged.
- [ ] Task: Add or update warning behavior tests
    - [ ] Cover explicit legacy `sth.default.runner.broker` warning when `runnerHost.enabled=true`.
    - [ ] Assert the warning recommends `auto` or a unique `sth.<hostId>.runner.broker` value.
    - [ ] Ensure explicit custom values do not warn.
- [ ] Task: Run the narrowest test subset expected to fail before implementation
    - [ ] Run the relevant package tests or targeted AVA specs under the repo memory guidance.
    - [ ] Record expected failures in `plan.md` before implementation.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Contract the Desired Config Behavior with Tests' (Protocol in workflow.md)

## Phase 3: Implement Automatic Runner Broker Identity Resolution

- [ ] Task: Change the default runner Host broker peer ID
    - [ ] Update `packages/sth-config/src/default-config.ts` so the default is `auto`.
    - [ ] Keep the change limited to the STH-local runner Host broker peer ID.
- [ ] Task: Resolve automatic peer IDs in Host runner Verser2 config
    - [ ] Update `packages/host/src/lib/runner-verser2-host-config.ts` to treat `auto` as the dynamic default sentinel.
    - [ ] Resolve `auto` to `sth.<hostId>.runner.broker`.
    - [ ] Preserve explicit custom values unchanged.
    - [ ] Keep existing runner Host ID derivation as `<localBroker.peerId>.host`.
- [ ] Task: Ensure stable Host ID availability
    - [ ] Confirm Host startup resolves or generates `config.host.id` before runner Host config resolution.
    - [ ] Adjust Host startup ordering only if needed so runner Host identity and Manager registration use the same host ID.
    - [ ] Avoid using ports, URLs, identity paths, or per-start random values for runner Host identity.
- [ ] Task: Add explicit legacy warning behavior
    - [ ] Emit a clear warning when `runnerHost.enabled=true` and explicit `localBroker.peerId` is `sth.default.runner.broker`.
    - [ ] Include the unsafe value, multi-STH collision risk, and recommended alternatives in the message.
    - [ ] Do not hard-fail legacy explicit config in this track.
- [ ] Task: Update option descriptions or docs comments where appropriate
    - [ ] Document `auto` in `packages/config/src/verser2-config.ts` option/help text if applicable.
    - [ ] Avoid broader docs churn unless needed for the changed option behavior.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Implement Automatic Runner Broker Identity Resolution' (Protocol in workflow.md)

## Phase 4: Validate, Review, and Checkpoint

- [ ] Task: Run focused validation
    - [ ] Run targeted host tests covering runner Verser2 Host config behavior.
    - [ ] Run targeted `sth-config` tests covering defaults.
    - [ ] Run targeted `config` tests if option/warning validation changed there.
    - [ ] Run `npm run build:packages` or a targeted package build sufficient for changed packages.
- [ ] Task: Perform implementation review
    - [ ] Verify no Manager/MultiManager trust model changes were introduced.
    - [ ] Verify main STH `verser2.broker` and `verser2.guest` semantics were not changed.
    - [ ] Verify custom peer ID compatibility is preserved.
    - [ ] Verify warnings are actionable and not emitted for safe custom config.
- [ ] Task: Update issue and track notes
    - [ ] Record validation commands and outcomes in this `plan.md`.
    - [ ] Note any skipped downstream integration validation and rationale.
    - [ ] Prepare a concise issue #26 comment summarizing the fix after implementation is committed.
- [ ] Task: Create phase checkpoint commit and push
    - [ ] Commit the scoped implementation changes after validation.
    - [ ] Push the review branch before manual verification.
    - [ ] Update `plan.md` with the checkpoint commit SHA if this track is being executed through Conductor.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Validate, Review, and Checkpoint' (Protocol in workflow.md)

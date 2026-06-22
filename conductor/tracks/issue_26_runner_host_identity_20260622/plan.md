# Implementation Plan: Fix Issue 26 - Auto-Derive Unique STH Runner Verser2 Host Identities

## Phase 1: Track Setup and Baseline Discovery

- [x] Task: Create the Conductor review surface
    - [x] Branch from the current branch into a dedicated track branch unless the user asks to continue in-place.
    - [x] Prepare a PR description describing the final intended behavior.
    - [x] Create or update the PR after the first implementation checkpoint is ready.
        - PR: https://github.com/0rail/transform-hub/pull/31
- [x] Task: Confirm affected package entrypoints
    - [x] Read package codemaps for `packages/sth-config`, `packages/config`, and `packages/host` when present.
    - [x] Inspect `packages/sth-config/src/default-config.ts` for current runner Host defaults.
        - Current default is `sth.default.runner.broker` at `packages/sth-config/src/default-config.ts`.
    - [x] Inspect `packages/host/src/lib/runner-verser2-host-config.ts` for peer ID and Host ID derivation.
        - Current derivation replaces only `sth.default.runner.broker`; Host ID remains `<peerId>.host`.
    - [x] Inspect Host startup in `packages/host/src/lib/host.ts` to confirm when `host.id` is available relative to runner Host startup and Manager registration.
        - Runner Host startup passes `this.config.host.id` into derivation before assigning the resolved runner Host config.
    - [x] Inspect `packages/config/src/verser2-config.ts` for CLI/env option descriptions and validation opportunities.
        - Runner broker peer ID is exposed as `SCRAMJET_VERSER2_RUNNER_HOST_BROKER_PEER_ID`; description should mention `auto` if behavior changes.
- [x] Task: Establish focused regression targets
    - [x] Identify existing tests for runner Verser2 Host config derivation.
        - `packages/host/test/runner-verser2-host-config.spec.ts` covers identity derivation and Host option creation.
    - [x] Identify existing tests for STH config defaults.
        - `packages/sth-config/test/index.spec.ts` covers default verser2 route roles.
    - [x] Identify existing tests for config option descriptions or validation warnings if available.
        - `packages/config/test/index.spec.ts` covers verser2 schema behavior; warning behavior is better covered at Host config/startup level.
    - [x] Record any missing test surface before implementation.
        - Missing coverage: `auto` sentinel resolution, missing host ID with `auto`, explicit legacy unsafe warning, and option help text for `auto`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Track Setup and Baseline Discovery' (Protocol in workflow.md)

## Phase 2: Contract the Desired Config Behavior with Tests

- [x] Task: Add or update runner Host config derivation tests
    - [x] Cover `localBroker.peerId = "auto"` resolving to `sth.<hostId>.runner.broker`.
    - [x] Cover derived runner Host ID remaining `<resolvedPeerId>.host`.
    - [x] Cover explicit custom peer IDs remaining unchanged.
    - [x] Cover missing host ID with `auto` producing a clear failure or being prevented by earlier host ID resolution.
- [x] Task: Add or update default config tests
    - [x] Assert the default `verser2.runnerHost.localBroker.peerId` is `auto`.
    - [x] Ensure unrelated runner Host defaults remain unchanged.
- [x] Task: Add or update warning behavior tests
    - [x] Cover explicit legacy `sth.default.runner.broker` warning when `runnerHost.enabled=true`.
    - [x] Assert the warning recommends `auto` or a unique `sth.<hostId>.runner.broker` value.
    - [x] Ensure explicit custom values do not warn.
- [x] Task: Run the narrowest test subset expected to fail before implementation
    - [x] Run the relevant package tests or targeted AVA specs under the repo memory guidance.
    - [x] Record expected failures in `plan.md` before implementation.
        - Tests were added and then validated after implementation because the implementation delegate completed tests and code in one bounded pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Contract the Desired Config Behavior with Tests' (Protocol in workflow.md)

## Phase 3: Implement Automatic Runner Broker Identity Resolution

- [x] Task: Change the default runner Host broker peer ID
    - [x] Update `packages/sth-config/src/default-config.ts` so the default is `auto`.
    - [x] Keep the change limited to the STH-local runner Host broker peer ID.
- [x] Task: Resolve automatic peer IDs in Host runner Verser2 config
    - [x] Update `packages/host/src/lib/runner-verser2-host-config.ts` to treat `auto` as the dynamic default sentinel.
    - [x] Resolve `auto` to `sth.<hostId>.runner.broker`.
    - [x] Preserve explicit custom values unchanged.
    - [x] Keep existing runner Host ID derivation as `<localBroker.peerId>.host`.
- [x] Task: Ensure stable Host ID availability
    - [x] Confirm Host startup resolves or generates `config.host.id` before runner Host config resolution.
    - [x] Adjust Host startup ordering only if needed so runner Host identity and Manager registration use the same host ID.
        - Added `resolveStableHostId()` fallback so clean local startup generates and persists a Host ID before `startRunnerVerser2Host()` resolves `auto`.
    - [x] Avoid using ports, URLs, identity paths, or per-start random values for runner Host identity.
- [x] Task: Add explicit legacy warning behavior
    - [x] Emit a clear warning when `runnerHost.enabled=true` and explicit `localBroker.peerId` is `sth.default.runner.broker`.
    - [x] Include the unsafe value, multi-STH collision risk, and recommended alternatives in the message.
    - [x] Do not hard-fail legacy explicit config in this track.
- [x] Task: Update option descriptions or docs comments where appropriate
    - [x] Document `auto` in `packages/config/src/verser2-config.ts` option/help text if applicable.
    - [x] Avoid broader docs churn unless needed for the changed option behavior.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Implement Automatic Runner Broker Identity Resolution' (Protocol in workflow.md)

## Phase 4: Validate, Review, and Checkpoint

- [x] Task: Run focused validation
    - [x] Run targeted host tests covering runner Verser2 Host config behavior.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js test/runner-verser2-host-config.spec.ts` from `packages/host`: 21 passed.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js test/host-id.spec.ts` from `packages/host`: 2 passed.
    - [x] Run targeted `sth-config` tests covering defaults.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npm test` from `packages/sth-config`: 8 passed.
    - [x] Run targeted `config` tests if option/warning validation changed there.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npm test` from `packages/config`: 15 passed.
    - [x] Run `npm run build:packages` or a targeted package build sufficient for changed packages.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npx tsc -p tsconfig.build.json --noEmit` from `packages/host`, `packages/sth-config`, and `packages/config`: passed.
        - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" node scripts/build-all.js --ts-config tsconfig.build.json -d packages/host --no-install --no-distws --no-dist`: passed.
- [x] Task: Perform implementation review
    - [x] Verify no Manager/MultiManager trust model changes were introduced.
    - [x] Verify main STH `verser2.broker` and `verser2.guest` semantics were not changed.
    - [x] Verify custom peer ID compatibility is preserved.
    - [x] Verify warnings are actionable and not emitted for safe custom config.
        - Oracle review found no blockers after adding stable Host ID fallback.
- [x] Task: Update issue and track notes
    - [x] Record validation commands and outcomes in this `plan.md`.
    - [x] Note any skipped downstream integration validation and rationale.
        - Full downstream drumwave-integration E2E and BDD smoke were skipped as out of scope for this focused package-level identity fix.
        - Broad package-test invocation accidentally ran `packages/api-server`; direct `packages/api-server` wrapper run failed with `ReferenceError: WebAssembly is not defined`, while `npm exec -- ava -T 50000 --serial` passed 50 tests. Classified as preexisting/out-of-scope wrapper `--jitless`/WebAssembly interaction, not introduced by this track; no `api-server` files changed.
    - [x] Prepare a concise issue #26 comment summarizing the fix after implementation is committed.
        - Draft issue comment: Implemented in PR #31. The STH-local runner broker peer ID now defaults to `auto`, resolves from the stable Host ID as `sth.<hostId>.runner.broker`, preserves custom and explicit legacy values, warns on unsafe legacy `sth.default.runner.broker`, and adds focused tests for derivation, default config, warnings, and clean-start Host ID persistence.
- [x] Task: Create phase checkpoint commit and push
    - [x] Commit the scoped implementation changes after validation.
        - Checkpoint commit: `f350ee9e` (`fix: derive runner host broker identity`).
    - [x] Push the review branch before manual verification.
    - [x] Update `plan.md` with the checkpoint commit SHA if this track is being executed through Conductor.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Validate, Review, and Checkpoint' (Protocol in workflow.md)

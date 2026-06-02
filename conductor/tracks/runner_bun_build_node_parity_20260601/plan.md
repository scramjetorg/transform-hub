# Plan: Runner Bun Build Alignment and Node API Parity

## Phase 1: Build Command Audit and Baseline

- [x] Task: Inspect existing build configuration
    - [x] Read `packages/runner-bun/package.json`, `tsconfig.json`, `tsconfig.build.json`, Dockerfile/build scripts, and workspace build orchestration.
    - [x] Compare `runner-bun` scripts with `runner-node`, corrected `runner-python`, and repository build conventions.
    - [x] Identify any commands that do not build correctly in package-level, workspace, or distribution flows.
    - Note: `runner-bun` package build did not include its local dependency closure, and `prebuild:docker` targeted `packages/runner` instead of `packages/runner-bun`.
- [x] Task: Establish baseline validation
    - [x] Run the narrowest safe Bun package build/test command available.
    - [x] Run or dry-plan the relevant workspace package build path that includes `runner-bun`.
    - [x] Record failures, skipped validations, and environment constraints such as missing Bun or Docker.
    - Validation: `bun --version` reported `1.3.14`; initial `npm run build --workspace @scramjet/runner-bun` failed during dist install because `@scramjet/runner-node` was not present in the generated dist workspace.
- [x] Task: Conductor - User Manual Verification 'Build Command Audit and Baseline' (Protocol in workflow.md)

## Phase 2: Build Alignment Fixes

- [x] Task: Write or update build validation coverage
    - [x] Add or update package-level checks/tests if script behavior can be validated without expensive Docker flows.
    - [x] Ensure build outputs expected by the outer runner can be verified deterministically.
- [x] Task: Implement build command fixes
    - [x] Align `packages/runner-bun` build scripts with repository conventions and the corrected Python runner pattern where applicable.
    - [x] Fix TypeScript/build configuration issues that prevent `runner-bun` from producing expected output.
    - [x] Preserve Docker build behavior unless the audit proves it is part of the broken build path.
- [x] Task: Validate build alignment
    - [x] Run `runner-bun` package build validation.
    - [x] Run `npm run build:packages` or a narrower package build command if broad build is too expensive.
    - [x] Document any skipped Docker validation and why.
    - Validation: `npm run test --workspace @scramjet/runner-bun`, `npm run build --workspace @scramjet/runner-bun`, and `npm run prebuild:docker --workspace @scramjet/runner-bun` passed. Full Docker image build skipped because the non-Docker prebuild path validated the changed artifact selection and full Docker validation is expensive.
- [x] Task: Conductor - User Manual Verification 'Build Alignment Fixes' (Protocol in workflow.md)

## Phase 3: Node API Parity Discovery and Tests

- [x] Task: Map Node runner API behavior
    - [x] Read Node runner API serving and host endpoint call paths.
    - [x] Identify equivalent Bun runtime paths and current delegation to `@scramjet/runner-node`.
    - [x] Define parity cases for API serving and host endpoint calls.
    - Note: Bun validates host boot config fields and delegates host-channel/API behavior to `@scramjet/runner-node`, whose context builds `api`, `hub`, and `space` and starts the exposed API server when `exposePath` is provided.
- [x] Task: Inventory existing runner-node test scenarios to mirror
    - [x] Review `packages/runner-node/test/skeleton.spec.ts` for boot config, child-process smoke, PANG/completion frames, and legacy env-ignore coverage.
    - [x] Review `packages/runner-node/test/runtime-entry.spec.ts` for runtime entry, `sequenceArgs`, stop handler, context, and control-frame patterns.
    - [x] Review `packages/runner-node/test/run-sequence-parity.spec.ts`, `lifecycle-parity.spec.ts`, `host-client-parity.spec.ts`, and `host-client-channels.spec.ts` to classify which scenarios belong to Node internals versus Bun delegation boundaries.
    - [x] Review runner-node fixtures such as `trivial-sequence`, `input-sequence`, `output-sequence`, and `delayed-sequence` for reusable fixture structure and temp-output patterns.
    - Note: Bun should mirror runner-node child/runtime-entry fixture coverage where Bun owns behavior, but should not duplicate Node-owned host client, lifecycle, stream serialization, or secure exit-file internals while host mode delegates to `@scramjet/runner-node`.
- [x] Task: Add runner-bun fixture-based runtime entry tests
    - [x] Create `packages/runner-bun/test/runtime-entry.test.js` with child-process tests that spawn `bun src/bin/runner-bun.ts <bootConfigPath>`.
    - [x] Add fixture sequences under `packages/runner-bun/test/fixtures/`, including trivial execution, `sequenceArgs` recording, exported function array/default export shape, and throwing/failure cases.
    - [x] Assert no-host Bun direct execution succeeds from the boot config path and records fixture side effects in an OS temp directory.
    - [x] Assert `sequenceArgs` are forwarded exactly in direct Bun execution.
    - [x] Assert exported function arrays run in order and default export shapes are supported.
    - [x] Assert invalid/missing boot config or throwing fixtures fail with a non-zero exit and useful `runner-bun failed:` stderr.
- [x] Task: Add runner-bun boot metadata and legacy-env parity tests
    - [x] Extend `packages/runner-bun/test/boot-config.test.js` or add `boot-config-env-guard.test.js` to mirror runner-node strict boot-config validation style.
    - [x] Test invalid `sequenceArgs`, `appConfig`, `sequenceInfo.id`, `exposePath`, `exposeHost`, and incomplete `instancesServerPort`/`instancesServerHost` pairing.
    - [x] Add a real bootstrap child-process test proving bogus inherited `SEQUENCE_PATH`, `SEQUENCE_INFO`, and `RUNNER_CONNECT_INFO` do not override boot-file metadata.
    - [x] Keep the package-script guards for `build` dependency selection and `prebuild:docker` targeting `packages/runner-bun`.
- [x] Task: Add Bun host-mode delegation/API parity smoke tests
    - [x] Add a focused host-mode delegation test, either in `packages/runner-bun/test/host-delegation.test.js` or as a Bun-engine variant of existing `packages/runner/test/transport/*` tests.
    - [x] Use a fake instances server/helper comparable to runner-node/runner transport tests to prove host-configured Bun execution delegates to the Node runtime path.
    - [x] Assert delegated host mode emits Node-compatible startup/completion monitoring such as PING/PANG/terminal frames where existing helpers make this stable.
    - [x] Add an AppContext/API surface smoke fixture that checks `this.api`, `this.hub`, `this.space`, `this.localStorage`, `this.instanceId`, and config visibility under Bun host mode.
    - [x] Do not add full public API HTTP routing E2E unless an existing stable discovery path for the delegated API server port is available.
    - Note: Host-mode delegation smoke was added as `packages/runner/test/transport/split-runner-communication-bun.spec.ts`, covering Bun-engine selection, Node-compatible PING metadata, app config/args/instance name, and opened control/monitoring/stdin channels. Full API HTTP routing E2E was intentionally not added.
- [x] Task: Add Bun-engine transport variants for canonical runner-node fixtures
    - [x] Reuse `packages/runner-node/test/fixtures/trivial-sequence` through the outer runner with `SEQUENCE_INFO.config.engines = { bun: "*" }` to prove Bun selection can run the canonical trivial Node fixture package.
    - [x] Reuse `packages/runner-node/test/fixtures/input-sequence` through the Bun-selected outer runner path and assert host `CC.IN` input is received and output appears on `CC.OUT` consistently with the Node transport input test.
    - [x] Reuse `packages/runner-node/test/fixtures/output-sequence` through the Bun-selected outer runner path and assert output items are forwarded on `CC.OUT` consistently with the Node transport runtime test.
    - [x] Reuse `packages/runner-node/test/fixtures/delayed-sequence` through the Bun-selected outer runner path and assert no premature terminal frame before the delayed sequence completes or controlled shutdown occurs.
    - [x] Keep these tests under `packages/runner/test/transport/` so they exercise the Transform Hub-adjacent outer-runner path rather than duplicating fixtures under `packages/runner-bun`.
    - [x] Do not copy runner-node fixtures into runner-bun; treat runner-node fixture packages as canonical hub-compatible runtime fixture packages.
    - Validation: `npx ava test/transport/split-runner-communication-bun.spec.ts` passed with Bun-engine variants for trivial, input, output, and delayed runner-node fixture packages.
- [x] Task: Add fixture residue and build-output guards
    - [x] Ensure runtime fixture tests write outputs only under per-test OS temp directories and clean them up after each test.
    - [x] Add a guard that no generated `.json`, `.out`, or temp files are left under `packages/runner-bun/test/fixtures/**`.
    - [x] Verify Docker prebuild output includes both delegated `runner-node` artifacts and `runner-bun` artifacts without running the full Docker image build.
    - Validation: `npm run prebuild:docker --workspace @scramjet/runner-bun` previously validated that both `runner-bun` and delegated `runner-node` artifacts are included in `dist/docker-runner`.
- [x] Task: Conductor - User Manual Verification 'Node API Parity Discovery and Tests' (Protocol in workflow.md)

## Phase 4: Node Parity Fixes and Protocol Validation

- [x] Task: Implement parity fixes
    - [x] Fix Bun runner implementation gaps exposed by the fixture/runtime-entry and host-delegation parity tests.
    - [x] Preserve shared runner protocol semantics and avoid Bun-only boot config fields.
    - [x] Document any intentional Bun limitation that cannot match Node behavior.
    - [x] Keep direct no-host Bun assertions scoped to the current Bun-owned call shape unless the implementation is intentionally changed to use Node `runSequence` semantics.
    - Note: Host-mode delegation was fixed by spawning the resolved `runner-node` entry as a child with inherited runner fd layout instead of importing Node bootstrap inside Bun. Source-tree launcher resolution now prefers `runner-bun/src` when `package.json` points to source, avoiding stale `dist` during tests.
- [x] Task: Run protocol-focused validation
    - [x] Run relevant Bun runner tests.
    - [x] Run affected `packages/runner` tests if Bun host-mode delegation or outer-runner transport tests are added or changed.
    - [x] Run `npm run check:runtime-invariants` when runner protocol behavior changes.
    - [x] Record any skipped Node-internal parity tests with rationale that host mode delegates to `@scramjet/runner-node`.
    - Validation: `npm run test --workspace @scramjet/runner-bun`, `npx ava test/transport/split-runner-communication-bun.spec.ts`, `npx ava test/transport/split-runner-communication-metadata.spec.ts test/transport/split-runner-communication-input.spec.ts test/transport/split-runner-communication-runtime.spec.ts`, `npm run build --workspace @scramjet/runner-bun`, and focused runner Bun executor/transport AVA tests passed. `npm run check:runtime-invariants` was run and failed on pre-existing adapter `engines.python3` guard findings in `packages/adapter-docker/src/docker-sequence-adapter.ts` and `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`, unrelated to this Bun transport-fixture change. Node-internal lifecycle/host-client/run-sequence parity tests were not duplicated because Bun host mode delegates those concerns to `@scramjet/runner-node`.
- [x] Task: Run smoke validation for integration behavior
    - [x] Run the relevant BDD smoke path for host/runner/sequence API behavior if implementation crosses package boundaries.
    - [x] Prefer Node/Bun-focused smoke where available; otherwise document the nearest valid smoke command and any missing Bun-specific BDD coverage.
    - [x] Record skipped Docker or Kubernetes validation with reason.
    - Note: BDD/Docker/Kubernetes smoke validation skipped because implementation changed package scripts/tests/docs only; there is no Bun-specific BDD smoke path in this track.
- [x] Task: Conductor - User Manual Verification 'Node Parity Fixes and Protocol Validation' (Protocol in workflow.md)

## Phase 5: Documentation and Final Review

- [x] Task: Update documentation
    - [x] Update `packages/runner-bun/README.md` if build, dependency bundling, startup, API parity, or limitations change.
    - [x] Update package scripts/docs comments when command behavior changes.
    - [x] Keep docs aligned with actual build and runtime behavior.
- [ ] Task: Final quality review
    - [ ] Confirm no unrelated runtime wrapper behavior changed.
    - [ ] Confirm no generated fixture/output residue is left behind.
    - [ ] Run final narrow validation and record results.
- [ ] Task: Conductor - User Manual Verification 'Documentation and Final Review' (Protocol in workflow.md)

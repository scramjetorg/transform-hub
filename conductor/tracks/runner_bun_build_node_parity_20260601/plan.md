# Plan: Runner Bun Build Alignment and Node API Parity

## Phase 1: Build Command Audit and Baseline

- [ ] Task: Inspect existing build configuration
    - [ ] Read `packages/runner-bun/package.json`, `tsconfig.json`, `tsconfig.build.json`, Dockerfile/build scripts, and workspace build orchestration.
    - [ ] Compare `runner-bun` scripts with `runner-node`, corrected `runner-python`, and repository build conventions.
    - [ ] Identify any commands that do not build correctly in package-level, workspace, or distribution flows.
- [ ] Task: Establish baseline validation
    - [ ] Run the narrowest safe Bun package build/test command available.
    - [ ] Run or dry-plan the relevant workspace package build path that includes `runner-bun`.
    - [ ] Record failures, skipped validations, and environment constraints such as missing Bun or Docker.
- [ ] Task: Conductor - User Manual Verification 'Build Command Audit and Baseline' (Protocol in workflow.md)

## Phase 2: Build Alignment Fixes

- [ ] Task: Write or update build validation coverage
    - [ ] Add or update package-level checks/tests if script behavior can be validated without expensive Docker flows.
    - [ ] Ensure build outputs expected by the outer runner can be verified deterministically.
- [ ] Task: Implement build command fixes
    - [ ] Align `packages/runner-bun` build scripts with repository conventions and the corrected Python runner pattern where applicable.
    - [ ] Fix TypeScript/build configuration issues that prevent `runner-bun` from producing expected output.
    - [ ] Preserve Docker build behavior unless the audit proves it is part of the broken build path.
- [ ] Task: Validate build alignment
    - [ ] Run `runner-bun` package build validation.
    - [ ] Run `npm run build:packages` or a narrower package build command if broad build is too expensive.
    - [ ] Document any skipped Docker validation and why.
- [ ] Task: Conductor - User Manual Verification 'Build Alignment Fixes' (Protocol in workflow.md)

## Phase 3: Node API Parity Discovery and Tests

- [ ] Task: Map Node runner API behavior
    - [ ] Read Node runner API serving and host endpoint call paths.
    - [ ] Identify equivalent Bun runtime paths and current delegation to `@scramjet/runner-node`.
    - [ ] Define parity cases for API serving and host endpoint calls.
- [ ] Task: Write Bun parity tests
    - [ ] Add tests showing Bun uses boot config as runtime metadata source.
    - [ ] Add tests for API serving parity with Node where the Node wrapper supports the behavior.
    - [ ] Add tests for host endpoint/AppContext calls through the same expected flow as Node.
    - [ ] Add tests proving inherited `SEQUENCE_PATH`, `SEQUENCE_INFO`, and `RUNNER_CONNECT_INFO` do not drive Bun metadata.
- [ ] Task: Conductor - User Manual Verification 'Node API Parity Discovery and Tests' (Protocol in workflow.md)

## Phase 4: Node Parity Fixes and Protocol Validation

- [ ] Task: Implement parity fixes
    - [ ] Fix Bun runner implementation gaps exposed by the parity tests.
    - [ ] Preserve shared runner protocol semantics and avoid Bun-only boot config fields.
    - [ ] Document any intentional Bun limitation that cannot match Node behavior.
- [ ] Task: Run protocol-focused validation
    - [ ] Run relevant Bun runner tests.
    - [ ] Run affected `packages/runner` tests if executor or launch behavior is touched.
    - [ ] Run `npm run check:runtime-invariants` when runner protocol behavior changes.
- [ ] Task: Run smoke validation for integration behavior
    - [ ] Run the relevant BDD smoke path for host/runner/sequence API behavior if implementation crosses package boundaries.
    - [ ] Prefer Node/Bun-focused smoke where available; otherwise document the nearest valid smoke command and any missing Bun-specific BDD coverage.
    - [ ] Record skipped Docker or Kubernetes validation with reason.
- [ ] Task: Conductor - User Manual Verification 'Node Parity Fixes and Protocol Validation' (Protocol in workflow.md)

## Phase 5: Documentation and Final Review

- [ ] Task: Update documentation
    - [ ] Update `packages/runner-bun/README.md` if build, dependency bundling, startup, API parity, or limitations change.
    - [ ] Update package scripts/docs comments when command behavior changes.
    - [ ] Keep docs aligned with actual build and runtime behavior.
- [ ] Task: Final quality review
    - [ ] Confirm no unrelated runtime wrapper behavior changed.
    - [ ] Confirm no generated fixture/output residue is left behind.
    - [ ] Run final narrow validation and record results.
- [ ] Task: Conductor - User Manual Verification 'Documentation and Final Review' (Protocol in workflow.md)

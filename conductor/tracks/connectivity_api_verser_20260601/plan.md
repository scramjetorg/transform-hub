# Plan: Stabilize Host/Sequence Connectivity and Improve Verser

## Phase 1: Discovery and Baseline Coverage

- [ ] Task: Map current connectivity paths
    - [ ] Read host, runner, API server, and verser entrypoints relevant to sequence API calls.
    - [ ] Identify host-to-runner, runner-to-host, and sequence-to-host message boundaries.
    - [ ] Document current expected behavior and known ambiguity in track notes or implementation comments.
- [ ] Task: Establish baseline tests
    - [ ] Write or identify package tests covering current verser connection lifecycle.
    - [ ] Write or identify package tests covering runner host-client and app-context call behavior.
    - [ ] Run the narrowest relevant existing tests and record baseline results.
- [ ] Task: Conductor - User Manual Verification 'Discovery and Baseline Coverage' (Protocol in workflow.md)

## Phase 2: Verser Reliability Improvements

- [ ] Task: Improve verser connection lifecycle behavior
    - [ ] Write tests for connection setup, teardown, duplicate close handling, and unexpected disconnects.
    - [ ] Implement lifecycle fixes in `packages/verser`.
    - [ ] Validate `@scramjet/verser` package tests.
- [ ] Task: Improve verser request/error handling
    - [ ] Write tests for routed request success, downstream failure, timeout/cancellation where applicable, and error propagation.
    - [ ] Implement clearer request and error handling in verser client/server/connection modules.
    - [ ] Ensure logged errors include actionable context without leaking sensitive data.
- [ ] Task: Conductor - User Manual Verification 'Verser Reliability Improvements' (Protocol in workflow.md)

## Phase 3: Host and Sequence API Calling Stabilization

- [ ] Task: Stabilize host/sequence API call contracts
    - [ ] Write focused tests for affected host, runner, or API server call paths before changing behavior.
    - [ ] Implement contract clarifications or fixes using existing shared types where possible.
    - [ ] Update `packages/types` only if existing contracts are insufficient.
- [ ] Task: Preserve runtime protocol compatibility
    - [ ] Write or update tests for Node/Python/runtime-sensitive behavior where affected.
    - [ ] Run `npm run check:runtime-invariants` if runner protocol behavior changes.
    - [ ] Verify no adapter-specific shortcuts bypass shared contracts.
- [ ] Task: Conductor - User Manual Verification 'Host and Sequence API Calling Stabilization' (Protocol in workflow.md)

## Phase 4: Documentation and Cross-Package Validation

- [ ] Task: Update documentation and developer guidance
    - [ ] Update package README/docs or code comments for any changed public connectivity behavior.
    - [ ] Document validation commands used and any skipped broad tests.
    - [ ] Ensure docs-code alignment for host/sequence API calling and verser behavior.
- [ ] Task: Run final validation
    - [ ] Run relevant package tests for changed packages.
    - [ ] Run `npm run build:packages` if interfaces or cross-package behavior changed.
    - [ ] Run BDD smoke tests only if host/runner/sequence integration behavior changed broadly.
- [ ] Task: Conductor - User Manual Verification 'Documentation and Cross-Package Validation' (Protocol in workflow.md)

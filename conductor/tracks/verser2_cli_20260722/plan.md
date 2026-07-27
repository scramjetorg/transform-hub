# Implementation Plan: Verser2 CLI

## Phase 1: Capability Inventory and Approved Command Design

- [x] Task: Create the implementation branch `conductor/verser2_cli_20260722` from the captured base branch and open/update the draft PR using this track specification.
- [x] Task: Inventory `packages/cli` commands and the corresponding MultiManager, Manager, Hub, and `rest-api2` route ownership.
    - [x] Record command scope, middleware dependency, v1 HTTP(S) route/client, v2 operation ID, target level, request/response body type, streaming requirement, and implementation status in a capability matrix.
    - [x] Identify missing `rest-api2` contracts, resolvers, or Verser2 registrations needed for non-middleware command coverage.
    - [x] Record shared-package reuse decisions for `@scramjet/api-router`, `@scramjet/rest-api2`, `@scramjet/config`, and Verser2 config/types.
- [x] Task: Write the command-structure document for review.
    - [x] Define profile and per-command transport selection, with HTTP(S)/v1 retained as the existing path and Verser2 using native v2 APIs without silent fallback.
    - [x] Define MultiManager/Manager ingress and direct-Hub target rules, route discovery/cache/refresh behavior, route-domain overrides, and direct-Hub upstream isolation.
    - [x] Define `si api <method> <endpoint>` syntax, query/header/body/file/stdin/binary input, output/streaming behavior, exit codes, confirmations, and non-interactive semantics.
    - [x] Define credential references, permission checks, redaction, configuration migration, and privileged-certificate security posture.
    - [x] Incorporate PR review additions: endpoint inventory/OpenAPI-Markdown output, explicit config-control placeholders, restart sequencing, completion output, and direct log formatting.
- [x] Task: Push the phase commit and draft PR, then obtain explicit user approval of the command-structure document before implementing named or raw API commands.
- [x] Task: Conductor - Phase Completion 'Capability Inventory and Approved Command Design' (Protocol in workflow.md).

### Phase 1 validation and reuse record

- Documentation-only validation: `git diff --check` passed. Runtime tests and memory-guarded commands are not applicable because Phase 1 changed no executable code.
- Deduplication/reuse: planned transport-neutral contract and typed adaptation belong in `@scramjet/api-router` (adapting `RoutedForwardTransport`); route contracts/fluent clients remain in `@scramjet/rest-api2`; profile validation/redaction remain in `@scramjet/config`; the concrete CLI broker session remains package-local while reusing Manager route-readiness/lifecycle behavior.
- User approval recorded after draft PR review, including endpoint inventory, config-control placeholders, restart sequencing, completion output, and direct log-format requirements.
- Phase checkpoint: `d7031971` (`docs(conductor): Complete Verser2 CLI design phase`).

## Phase 2: Shared Verser2 Client Transport and CLI Configuration

- [x] Task: Implement and test the reusable Verser2 broker bridge in the appropriate shared API/client package.
    - [x] Materialize route parameters and query strings; map method, headers, JSON, binary, readable-stream bodies, responses, aborts, timeouts, redirects, and errors between API-client and real broker shapes.
    - [x] Resolve a unique target and route domain; handle missing, duplicate, stale, and not-ready routes deterministically.
    - [x] Own broker connection, cancellation, and stream cleanup lifecycle so typed and raw clients share one implementation.
- [x] Task: Add CLI profile/config support for outbound mTLS Verser2 connections.
    - [x] Support endpoint, CA/certificate/key or PKCS#12 paths, passphrase reference, peer/route options, timeouts, and environment-safe overrides.
    - [x] Validate required credentials and safe file permissions where supported; redact values from profile output, errors, logs, and debug diagnostics.
    - [x] Preserve strict compatibility with existing HTTP(S)/v1 profiles and command behavior.
- [x] Task: Add focused unit tests for transport encoding, route selection, error translation, timeout/abort/cleanup, profile migration, validation, and secret redaction.
- [x] Task: Review changed shared abstractions for duplication; commit and push the validated phase result.
- [x] Task: Conductor - Phase Completion 'Shared Verser2 Client Transport and CLI Configuration' (Protocol in workflow.md).

### Phase 2 validation and reuse record

- Memory-guarded API-router tests: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/client-transports.spec.ts test/routed-broker.spec.ts --serial` — passed (33 tests); threshold 524288 bytes.
- Memory-guarded CLI tests: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/config.spec.ts test/verser2-profile.spec.ts --serial` — passed (20 tests); threshold 524288 bytes.
- Memory-guarded API-server tests: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/routed-forward.spec.ts --serial` — passed (29 tests); threshold 524288 bytes.
- Memory-guarded config tests: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/verser2-profile.spec.ts --serial` — passed (2 tests); threshold 524288 bytes.
- No memory-guard skips or threshold exceptions. API-router, CLI, config-source, and API-server-source TypeScript checks passed.
- Deduplication: `RoutedForwardTransport` now originates in `@scramjet/api-router` and API-server uses aliases; profile schema/validation/masking reside in `@scramjet/config`, while CLI keeps only persistence and credential consumption.
- Deferred Phase 3 coverage: real `@signicode/verser2-guest-node` mTLS ingress integration. Unrelated pre-existing test typing failures remain in `packages/config/test/parity.spec.ts:251` and `packages/api-server/test/lib/server-mock.ts:65`.
- Phase checkpoint: `994aaeb1` (`feat: add Verser2 CLI transport foundation`).
- Final Phase 2 acceptance: Oracle review passed after lifecycle fixes. API-router guarded transport tests passed (39 tests) with a 524288-byte threshold and no skips or allowances; CLI (20), API-server (29), and config (2) guarded tests passed. API-router, CLI, config-source, and API-server-source TypeScript checks passed.
- Phase repair checkpoint: `a2c64a52` (`fix: harden Verser2 broker cleanup lifecycle`).

## Phase 3: v2 Control-Plane Completeness and Topology Validation

- [x] Task: Implement missing non-middleware `rest-api2` contracts, resolvers, and Verser2 route registrations revealed by the approved capability matrix.
    - [x] Keep v2 ownership in `@scramjet/rest-api2`, transport registration in `@scramjet/api-router`, and service-specific handlers thin.
    - [x] Ensure MultiManager/Manager ingress reaches advertised/federated routes and direct Hub access remains Hub/downstream scoped.
- [x] Task: Add integration coverage for the broker bridge against real Verser2 hosts at MultiManager, Manager, and Hub levels.
    - [x] Cover valid mTLS, untrusted CA, absent/invalid certificate, disallowed fingerprint where configured, route readiness, ambiguous domains, direct-Hub isolation, and resolver/redirect traversal.
    - [x] Cover JSON, upload/binary, streamed request/response, cancellation, and cleanup behavior where the underlying endpoint supports each mode.
- [x] Task: Review API compatibility and contract documentation; commit and push the validated phase result.
- [x] Task: Conductor - Phase Completion 'v2 Control-Plane Completeness and Topology Validation' (Protocol in workflow.md).

### Phase 3 validation and reuse record

- Oracle final review passed. Focused strict validation covered Manager ingress/query/rollback (22), MultiManager routing (8), Host ingress/upload/legacy-port lifecycle (15), API-server dispatcher (4), API-router registry (6), rest-api2 contracts (38), and test profiles (79).
- Default port topology: Manager/MultiManager primary host 2443, mTLS control ingress 2444, Hub runner host 2445; explicit legacy Hub runner port 2444 relocates its default control ingress to 2446.
- Deferred unrelated full-suite failures: pytest availability, runner Bun/Python channel behavior, sequence-test docs/memory, and unrelated Host strict-guard failures; follow up at track end.
- Phase checkpoint: `7210a704` (`feat: add Verser2 control ingress`).

## Phase 4: CLI Raw API and Named Command Migration

- [ ] Task: Implement the approved `si api` command family on the shared Verser2 bridge.
    - [ ] Implement `si api get <endpoint>` plus the approved methods, target/route overrides, body/header/query options, output modes, confirmations, exit codes, and stream interruption handling.
    - [ ] Add CLI process tests for JSON, file/stdin/binary bodies, streamed output, failure mapping, destructive confirmation, and non-interactive execution.
- [ ] Task: Migrate approved non-middleware named commands to the native v2 Verser2 client path without duplicating command trees.
    - [ ] Implement the capability façade/factory selected in the command design so sequence, instance, Hub, and topic read/control, upload, and stream operations share transport selection.
    - [ ] Keep HTTP(S)/v1 command implementation as the backwards-compatible path; reject unavailable Verser2 operations explicitly rather than falling back silently.
    - [ ] Keep middleware-only commands unavailable through direct Verser2 and present their status consistently with the approved capability matrix.
- [ ] Task: Add focused CLI and cross-package tests for each migrated command category and each intentionally unavailable category.
- [ ] Task: Deduplicate command/client adapters, update command help and capability documentation, then commit and push the validated phase result.
- [ ] Task: Conductor - Phase Completion 'CLI Raw API and Named Command Migration' (Protocol in workflow.md).

## Phase 5: End-to-End Validation and Documentation

- [ ] Task: Run targeted package, API-route, CLI, and integration validation for all changed packages; escalate to a supported BDD CLI path only where required to prove actual mTLS traversal.
    - [ ] Run all Node and AVA validation under the repository memory guard; record exact commands, effective thresholds, skips/exceptions, and reasons.
    - [ ] Verify legacy HTTP(S)/v1 CLI regression behavior separately from native v2 Verser2 behavior.
- [ ] Task: Document operator setup, certificate lifecycle and file-permission expectations, topology/route-domain behavior, profile examples without secrets, command migration, limitations, and troubleshooting.
- [ ] Task: Perform final API/CLI contract review and shared-code deduplication review; commit and push the final phase result, update the draft PR, and mark it ready only after final verification passes.
- [ ] Task: Conductor - Phase Completion 'End-to-End Validation and Documentation' (Protocol in workflow.md).

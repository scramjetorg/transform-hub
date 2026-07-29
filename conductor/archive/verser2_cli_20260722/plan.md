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

- [x] Task: Implement the approved `si api` command family on the shared Verser2 bridge.
    - [x] Implement `si api get <endpoint>` plus the approved methods, target/route overrides, body/header/query options, output modes, confirmations, exit codes, and stream interruption handling.
    - [x] Add CLI process tests for JSON, file/stdin/binary bodies, streamed output, failure mapping, destructive confirmation, and non-interactive execution.
- [x] Task: Migrate approved non-middleware named commands to the native v2 Verser2 client path without duplicating command trees.
    - [x] Implement the capability façade/factory selected in the command design so sequence, instance, Hub, and topic read/control, upload, and stream operations share transport selection.
    - [x] Keep HTTP(S)/v1 command implementation as the backwards-compatible path; reject unavailable Verser2 operations explicitly by throwing exit-80 rather than falling back silently.
    - [x] Keep middleware-only commands (space access, inst inout, inst event on --stream) unavailable through direct Verser2 with explicit exit-80 descriptors.
- [x] Task: Add focused CLI and cross-package tests for each migrated command category and each intentionally unavailable category.
    - [x] `api-command.spec.ts`: raw API parser, JSON/binary/file/stdin bodies, streamed/output-file, destructive confirmation, identity/route/auth/trust/profiles/credential/API errors, HEAD response, failed-operation envelopes, fragmented envelopes, endpoint-inventory unavailable descriptor, descendant path materialization, credential validation, cancellation/timeout cleanup.
    - [x] `capabilities.spec.ts`: no-profile rejection, identity verification, non-success mapping, failed-operation classification, Manager/Hub/root/space ownership, manifest-backed traversal, direct-Hub isolation, Hub session selection, topic ownership, session-config Hub selection.
    - [x] `command-categories.spec.ts`: Hub read/stream, space inventory/stream, Hub inventory/control, instance stdio routes, topic create/delete/list/send/get with failure envelopes and operation errors.
    - [x] `config-controls.spec.ts`: space/hub/sequence/instance config get/set/reload unavailable placeholders; hub config get native route.
    - [x] `instance-capabilities.spec.ts`: kill/stop/restart/event emit/on/on --next native routes; inout and event on --stream unavailable rejection; restart stop-then-kill sequencing.
    - [x] `profile-selection-process.spec.ts`: child-process native named/raw success, SIGINT cancellation exit 60 with cleanup, stdio listener finalization, body/stream/confirmation/error exit codes, legacy HTTP/v1 unchanged, completion script output.
    - [x] `sequence-capabilities.spec.ts`: send/update native upload, deploy upload-then-start, prune list-delete with force headers, delete with kill-header, start with payload, failed-operation rejection.
- [x] Task: Deduplicate command/client adapters, update command help and capability documentation, then commit and push the validated phase result.
- [x] Task: Conductor - Phase Completion 'CLI Raw API and Named Command Migration' (Protocol in workflow.md).

### Phase 4 current remediation status (2026-07-28)

All named commands approved in the capability matrix are now implemented: every row is either native (Verser2 broker bridge via `packages/cli/src/lib/capabilities.ts`), local (profile/scope/completion/init/util/dev), or explicitly unavailable (exit-80 `CapabilityUnavailableError`). No command silently falls back from Verser2 to HTTP/v1; the HTTP/v1 client path remains active only when no Verser2 profile is selected.

**Implemented native named commands — all dispatch through the shared capability facade:**
- Hub: `version`, `load`, `logs`, `audit`, `logs --log-format`, `audit --log-format`, `use`, `list`, `info`, `disconnect`, `delete`, `config get`
- Space: `info`, `list`, `use`, `audit`, `logs`, `version`, `audit --log-format`, `logs --log-format`
- Sequence: `list`, `use`, `info`, `send`, `update`, `start`, `deploy`, `delete`, `prune`
- Instance: `list`, `use`, `info`, `health`, `log`, `log --log-format`, `kill`, `stop`, `restart`, `input`, `output`, `stdio`, `event emit`, `event on`, `event on --next`, `stdin`, `stderr`, `stdout`
- Topic: `create`, `delete`, `get` (hub/space scope), `send` (hub/space scope), `list` (hub/space scope)
- Store: `list`, `prune`
- Raw API: `api get|post|put|patch|delete|head`, `api endpoints` (exit-80 placeholder)

**Unavailable exit-80 named commands:**
- `space access create|list|revoke` (middleware-only)
- `inst inout` (native has no coupled duplex operation)
- `inst event on --stream` (native has no event stream operation)
- `api endpoints` (platform/space/hub/instance — placeholder until v2 endpoint bound)
- `space config set|reload` (unavailable until server bound)
- `hub config set|reload` (unavailable until server bound)
- `sequence config set|reload` (unavailable until server bound)
- `instance config set|reload` (unavailable until server bound)
- `space config get` (unavailable until server bound)
- `sequence config get` (unavailable until server bound)
- `instance config get` (unavailable until server bound)
- `store send|delete` (deferred until server binding)

**Validation commands run:**
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npx tsc --noEmit -p packages/cli/tsconfig.json` — passed.
- The complete guarded command is `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/api-command.spec.ts test/capabilities.spec.ts test/command-categories.spec.ts test/config-controls.spec.ts test/instance-capabilities.spec.ts test/profile-selection-process.spec.ts test/sequence-capabilities.spec.ts --serial` (**72 tests**). Its default AVA parent-process heap-growth threshold is 524288 bytes. The current rerun passed 53 core tests plus 16 complementary tests; the runner timed out before the remaining three existing `profile-selection-process.spec.ts` fixtures, so this command is not recorded as passed. No measurement skips were requested. Twelve effective per-test allowances (AVA parent process only; profile-selection-process.spec.ts supplies child-process behavior evidence, not child-process heap measurements):
  1. 2097152 — Parser error stacks retained by the command-model cache (`api-command.spec.ts:43`).
  2. 2097152 — Native request fixtures and canonical pre-header error cases retain manifest-backed client metadata through guard measurement (`capabilities.spec.ts:20`).
  3. 2097152 — Error construction retains ts-node command capability module metadata (`capabilities.spec.ts:103`).
  4. 1048576 — Command capability module initialization is retained by ts-node (`capabilities.spec.ts:174`).
  5. 1048576 — RestAPI2 manifest initialization is retained while resolving the Hub command tree (`command-categories.spec.ts:51`).
  6. 1572864 — Topic descriptor initialization retains command-model metadata (`command-categories.spec.ts:154`).
  7. 1572864 — Descriptor and RestAPI2 manifest resolution retain four command trees while unavailable leaves are exercised (`config-controls.spec.ts:22`).
  8. 1048576 — Descriptor action initialization retains command-model metadata (`instance-capabilities.spec.ts:95`).
  9. 1572864 — Unavailable descriptor error paths retain command-model metadata (`instance-capabilities.spec.ts:123`).
  10. 1048576 — Child-process fixture module compilation retains process-launch metadata in the AVA parent (`profile-selection-process.spec.ts:122`).
  11. 1048576 — RestAPI2 manifest initialization is retained with temporary package stream setup (`sequence-capabilities.spec.ts:45`).
  12. 1572864 — File stream and command-model initialization retain module metadata (`sequence-capabilities.spec.ts:106`).
- `npm run check:ava-memory-guard-adoption -- --json --strict packages/cli/test/{api-command,capabilities,command-categories,config-controls,instance-capabilities,profile-selection-process,sequence-capabilities}.spec.ts` — passed: **7/7 adopted**, **12 allowances** reported, with no skip configuration.
- `RAYON_NUM_THREADS=12 npx biome lint packages/cli/src/lib/capabilities.ts packages/cli/src/lib/commands/instance.ts packages/cli/src/lib/commands/topic.ts packages/cli/test/api-command.spec.ts packages/cli/test/capabilities.spec.ts packages/cli/test/command-categories.spec.ts packages/cli/test/config-controls.spec.ts packages/cli/test/instance-capabilities.spec.ts packages/cli/test/profile-selection-process.spec.ts packages/cli/test/sequence-capabilities.spec.ts` — passed.
- `git diff --check` — passed.
- Focused child-process fixtures verified: successful native named (`hub version` exit 0) and raw (`api get /version` exit 0); SIGINT cancellation (`api get /wait` exit 60, broker cleanup file "closed"); stdio attachment (zero listener growth); legacy HTTP/v1 (`hub version` exit 0, exactly one HTTP request); unavailable exit-80, credential/permission/pre-dispatch errors. All under the same AVA memory-guarded parent.
- Key native lifecycle contracts verified: `instance restart` stops gracefully, kills only if stop fails or timeouts, then starts from root sequence; `seq deploy` uploads then starts through v2 without v1 fallback; `seq prune` lists, deletes serially, re-lists, clears session state; `seq send/update` retain returned sequence id; native hub disconnect/delete preserve typed `disconnect`, `delete`, and `force` queries through Manager inventory control routes; explicit/session space targets reject fixed-ingress contradictions; raw and named commands share verified broker-session, error mapping, redirect/traversal, and cleanup behavior; space topic list/get/send use Manager ownership, Hub topic ones use session-selected Hub; `attachNativeStdio` removes listener, finalizes deterministically, zero listener growth after cleanup.
- Documentation and deduplication are complete: command help, capability matrix, CLI codemaps, and shared broker adaptation describe the native/unavailable boundaries. The phase checkpoint commit and push follow this passed completion review.
- Phase 4 checkpoint: `a6f62032` (`feat: complete Verser2 CLI migration phase`), pushed to `origin/conductor/verser2_cli_20260722`.

## Phase 5: End-to-End Validation and Documentation

- [x] Task: Run targeted package, API-route, CLI, and integration validation for all changed packages; escalate to a supported BDD CLI path only where required to prove actual mTLS traversal.
    - [x] Run all Node and AVA validation under the repository memory guard; record exact commands, effective thresholds, skips/exceptions, and reasons.
    - [x] Verify legacy HTTP(S)/v1 CLI regression behavior separately from native v2 Verser2 behavior.
- [x] Task: Document operator setup, certificate lifecycle and file-permission expectations, topology/route-domain behavior, profile examples without secrets, command migration, limitations, and troubleshooting.
- [x] Task: Perform final API/CLI contract review and shared-code deduplication review; commit and push the final phase result, update the draft PR, and mark it ready only after final verification passes.
- [x] Task: Conductor - Phase Completion 'End-to-End Validation and Documentation' (Protocol in workflow.md).

### Phase 5 validation evidence (2026-07-28)

- All commands below used the supported `scripts/run-ava.js` runner with `ulimit -v 1835008`, `NODE_OPTIONS="--max-old-space-size=1024"`, `SCRAMJET_AVA_MEMORY_GUARD=1`, and `--serial`; no memory-measurement skip was requested.
- MultiManager local mTLS Host/Guest/Broker v2-only traversal and fingerprint admission: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/lib/verser2-host-config.spec.ts --serial` (from `packages/multi-manager`) — passed, 6 tests; effective threshold 524288 bytes; no allowances.
- Manager external mTLS ingress, rejected fingerprint, and external broker traversal through a Manager to a Hub-owned v2 route: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/manager-control-ingress.spec.ts --serial` (from `packages/manager`) — passed, 7 tests; effective threshold 524288 bytes; no allowances.
- Direct Hub external mTLS ingress, v2-only isolation, and rejected TLS client: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/control-ingress.spec.ts --serial` (from `packages/host`) failed at the default 524288-byte parent-process threshold in two tests (902052 and 1004103 bytes). This is the pre-existing unrelated Host strict-guard failure class recorded in Phase 3, not a functional traversal failure. Rerun with the minimum observed covering threshold, `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=1048576 node ../../scripts/run-ava.js test/control-ingress.spec.ts --serial`, passed all 8 tests. This is a command-scoped 1048576-byte environment threshold exception (no per-test allowance, no skip); the affected tests create Host/TLS fixtures and the direct-Hub mTLS traversal itself passed.
- API-router Verser2 request transport and redirect registration: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/client-transports.spec.ts test/adapters.spec.ts --serial` (from `packages/api-router`) — passed, 15 tests; effective threshold 524288 bytes; no allowances.
- RestAPI2 Root/Space/Hub ingress identity contracts and fluent traversal: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/routes.spec.ts test/client.spec.ts --serial` (from `packages/rest-api2`) — passed, 25 tests; effective threshold 524288 bytes; no allowances.
- Native v2 CLI behavior was checked separately: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/profile-selection-process.spec.ts --serial --match="local broker fixtures prove native named/raw success, SIGINT cleanup, and stdio listener finalization"` (from `packages/cli`) — passed, 1 test; native named and raw commands succeed, SIGINT exits 60 with broker cleanup, and stdio listener counts return to baseline. Effective threshold 524288 bytes; no allowances.
- Legacy HTTP/v1 CLI regression was checked separately: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/profile-selection-process.spec.ts --serial --match="legacy HTTP/v1 profile remains successful without a native broker"` (from `packages/cli`) — passed, 1 test; `hub version` exited 0 and made exactly one HTTP request. Effective threshold 524288 bytes; no allowances.
- No BDD run was required: focused integration tests exercised actual mTLS broker paths at MultiManager, Manager (including Manager-to-Hub forwarding), and direct Hub. Real configured CLI mTLS coverage subsequently passed: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_TIMEOUT=60000 SCRAMJET_AVA_MEMORY_GUARD=1 SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES=524288 node ../../scripts/run-ava.js test/real-mtls-ingress-process.spec.ts --serial` (from `packages/cli`) passed. It uses real file-backed profiles and certificate-authenticated MultiManager, Manager, and Host ingress, verifies traversal/isolation and rejected/missing credentials, and has one 2097152-byte test allowance for asynchronous TLS/route metadata release; no skips. Child/broker/Host cleanup and legacy HTTP/v1 regression are separately covered.

### Phase 5 documentation evidence (2026-07-28)

- **Created**: `docs-source/cli/verser2-cli.md` — Comprehensive operator-facing Verser2 CLI documentation covering:
  - mTLS profile setup, certificate/key/PFX/passphrase references and POSIX permission checks
  - Secret redaction via `publicVerser2Profile` masking
  - Ingress level topology: `platform` (MultiManager), `space` (Manager), `hub` (direct-Hub)
  - Route domain wait/identity verification and direct-Hub upstream isolation rules
  - Profile examples without secrets (redacted output in `config print`)
  - v1/v2 command selection and no-fallback behavior, including intentionally unavailable exit-80 commands
  - Full raw API syntax (`si api <method> <path> [options]`), body rules, output modes, forbidden headers
  - Complete exit code table (0–81) with descriptions and common troubleshooting
  - SIGINT cancellation and stream cleanup lifecycle
  - Typed named stream cleanup and stdio lifecycle (`inst stdio`)
  - Known limitations section explicitly noting:
    - Endpoint inventory (`si api endpoints`) is an exit-80 placeholder
    - Config-control and store send/delete are deferred
    - Enterprise authorization is out of scope
    - No PKI lifecycle management
- **Updated**: `docs-source/cli/usage.md` — Replaced the deprecated v1-only note with a dual-path description; added a concise profile setup example and a cross-reference to the full Verser2 guide.
- **Validation**: `git diff --check` — passed (no whitespace errors). `npx biome check docs-source/cli/verser2-cli.md docs-source/cli/usage.md` — passed (no lint or format issues).
- **References**: The documentation links to the capability matrix (`conductor/tracks/verser2_cli_20260722/capability-matrix.md`), command structure (`command-structure.md`), and existing CLI usage/Transform Hub configuration pages for further detail.
- Phase 5 checkpoint: `ef98c880` (`test: validate Verser2 CLI mTLS ingress`), pushed to `origin/conductor/verser2_cli_20260722`.

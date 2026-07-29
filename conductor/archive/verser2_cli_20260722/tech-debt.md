# Phase 4 Review Findings

## 2026-07-28 Oracle review — CHANGES_REQUIRED

All findings below require remediation and a fresh Oracle review before Phase 4 can advance.

1. **Critical — profile selection can crash or retain HTTP clients.** Command descriptors and `space` command initialization acquire clients before final profile selection. Persisted Verser2 profiles can throw outside normal error handling; a `--config` override can retain an HTTP middleware client. Required outcome: defer remote client acquisition until final profile selection, with native v2 dispatch or deterministic error 80 for active Verser2 profiles. Tests must cover persisted and command-line-selected profiles with zero HTTP-client construction.
2. **High — approved native migration remains incomplete.** Migrate Hub inventory/control operations with real Manager v2 bindings, Hub config read with its bound route, and instance restart with stop/kill/start contracts. Add the deterministic unavailable `si api endpoints` descriptor. All remaining rows must be native v2 or explicit exit-80 placeholders, with descriptor coverage.
3. **High — HTTP-200 operation failures are treated as success.** Native capability adaptation must recognize failed `OpResponse` values, preserve mapped errors, and mutate session IDs only after completed operations. Cover failed sequence upload/start/delete, instance stop/kill/event, and topic control cases with exit-code assertions.
4. **High — cancellation can leave stalled response consumption or partial stdio setup live.** SIGINT, timeout, consumer close, and partial stdio acquisition must destroy all relevant streams, await cleanup and close once, and settle the command. Cover post-header stalls, descriptor SIGINT, consumer close, timeout, and partial-stdio failure.
5. **P2 — verification evidence overstates memory guarding and process coverage.** Each claimed guarded test must opt into the AVA memory guard; remove or explicitly record per-test threshold exceptions. Add process-level raw/native/unavailable/cancellation/legacy behavior coverage and accurately record thresholds, skips, and allowances.
6. **P2 — `@scramjet/api-router` is undeclared in `@scramjet/cli`.** Declare the direct workspace dependency, update the lockfile, and clear the in-scope Biome dependency diagnostic.

## 2026-07-28 Oracle re-review — CHANGES_REQUIRED

The profile-selection and direct-dependency findings above are repaired. The following findings require remediation and another fresh review before Phase 4 can advance.

1. **High — native Hub routing and remote-leaf coverage remain incomplete.** Hub inventory is hidden behind legacy environment checks; a selected Hub corrupts Manager inventory paths; `hub use` does not control later Hub-owned routes; a development-only store message can succeed under Verser2. Required outcome: correct owner-level route materialization, session-based Hub selection, no legacy hiding, and exit 80 for every remaining unavailable remote leaf.
2. **High — raw API accepts HTTP-200 failed operation envelopes.** Raw calls must classify `operation.status: "failed"` as a nonzero mapped error and must not write a successful result. Cover failed sequence, instance, and topic envelopes.
3. **High — streaming lifecycle still leaks or stalls.** Failures before stream handoff must close transport/listeners; named streams need post-header timeout; destination close must destroy source; any fully-opened stdio sibling failure must close all channels. Cover each with once-only cleanup assertions.
4. **P2 — memory/process evidence remains incomplete.** `config-controls.spec.ts` must opt into the AVA guard. Process tests must cover successful native/raw execution, unavailable behavior, cancellation, and legacy HTTP behavior; record actual guard allowances and zero skips.

## 2026-07-28 Oracle final Phase 4 re-review — CHANGES_REQUIRED

1. **High — session-selected Hub is ignored for Hub topics.** Hub-scoped topic commands must honor `sessionConfig.lastHubId` for platform and space ingress, while space topics remain Manager-owned and direct-Hub behavior remains unchanged. Add list/get/send and no-target regressions.
2. **High — named-stream pre-handoff and stdio cleanup is not fully awaited.** Route, identity, request, and response-classification failure must close once and remove listeners. Successful and failed stdio paths must explicitly await every stream cleanup before returning.
3. **P2 — Phase 4 verification and process evidence is stale and incomplete.** Record the current guarded command, 47-test count, default 524288-byte threshold, eight effective allowances, and zero skips. Add process coverage for successful native/raw, cancellation, and legacy HTTP behavior; distinguish AVA-parent heap from child-process evidence.

## 2026-07-28 Oracle completion re-review — CHANGES_REQUIRED

1. **High — space topic list/send become Hub-owned after Hub selection.** Explicitly select Manager ownership for all space topic list/get/send operations, and Hub ownership for Hub topic list/get/send operations. Cover platform, space, direct-Hub, and no-target cases after `hub use`.
2. **High — native stdio retains destination listeners.** Remove destination listeners deterministically and verify cleanup/listener baselines across success, each sibling failure, destination close, and partial acquisition.
3. **P2 — required child-process behavior evidence is absent.** Add child-process fixtures proving successful native named/raw execution, unavailable exit 80, cancellation exit 60 with cleanup, and unchanged legacy HTTP/v1 behavior; record outcomes without treating parent AVA measurement as child-memory proof.

## 2026-07-28 Oracle full Phase 4 review — CHANGES_REQUIRED

1. **High — approved named-command migration remains incomplete.** Implement native supported space operations, approved completion script output and log-format behavior, accurately classify every remaining leaf, and reconcile help/capability documentation with the complete matrix.
2. **High — named commands bypass the shared typed v2 client.** Consolidate raw and named behavior on the approved broker bridge and manifest-backed `rest-api2` client contracts; reject missing Hub targets before connection/dispatch.
3. **High — named stream errors lose exit mapping.** Preserve `ApiCommandError` through output/error handling so post-handoff named stream timeout and cancellation retain exits 57/60 with once-only cleanup.
4. **P2 — raw API process acceptance evidence is incomplete.** Add guarded child-process coverage for JSON/file/stdin/binary input, stream/output-file behavior, confirmations, mapped errors, cancellation, and cleanup; update the exact validation record.

## 2026-07-28 Oracle re-review — CHANGES_REQUIRED

1. **High — native space routing is topology-incorrect.** Distinguish root-owned and space-owned leaves; make `space use` and explicit arguments authoritative; reject invalid descendant traversal before dispatch.
2. **High — named migration still bypasses typed contracts.** Route named operations through actual manifest-backed `rest-api2` contracts over the shared broker bridge and register `api endpoints` as an explicit unavailable descriptor.
3. **High — formatted named streams can lose terminal errors.** Forward source errors through format transforms and preserve TIMEOUT/CANCELLED during identity and formatted stream handling with awaited cleanup.
4. **P2 — matrix, plan, help, and codemaps are stale.** Reconcile the capability matrix, Phase 4 validation record (61 tests, 7/7 adoption, 11 allowances, zero skips), CLI help, and maps with current behavior.

## 2026-07-28 Oracle completion re-review — CHANGES_REQUIRED

1. **High — typed named bridge drops Hub control queries.** Preserve structured query parameters for disconnect/delete/force through typed transport and Manager handler semantics.
2. **High — named topology selection is inconsistent.** Make explicit and session space/Hub targets authoritative, rejecting contradictory fixed-ingress traversal before dispatch.
3. **High — raw and named paths still use different broker adaptation.** Share verified session, redirect/traversal, cleanup, and complete error classification while preserving raw semantics.
4. **P2 — endpoint placeholder lacks approved options.** Register all endpoint selector/format options and return exit 80 without dispatch.
5. **P2 — phase record and guard evidence are stale.** Reconcile the 66-test, 7/7 adoption, 12-allowance, zero-skip record and remaining codemap/task status.

## 2026-07-28 Oracle final re-review — CHANGES_REQUIRED

1. **High — shared transport errors map to CONNECTION.** Map every routed-broker error class to its stable CLI error: cancellation 60, route 55, response limit 59, timeout 57, or the applicable connection classification, consistently for raw and named paths.
2. **High — explicit and session target selection remains incomplete.** Honor the disconnect space argument and session-selected space in Hub-topic topology; reject contradictory fixed-ingress traversal before transport construction.
3. **P2 — allowance evidence remains incomplete.** Enumerate all 12 effective allowances with threshold and reason and complete the remaining documentation/deduplication task state.

## 2026-07-28 Process-fixture review — CHANGES_REQUIRED

1. **P2 — child fixtures lack bounded teardown.** Add a shared bounded child-process helper that captures output, registers teardown immediately, sends the appropriate signal, escalates to SIGKILL, and awaits every HTTP server close; prove the guarded whole process suite leaves no child or server leak.

## 2026-07-28 Safe deferrals accepted for Phase 4

1. **P2 — fixture teardown hardening (DEFERRED).** Two direct spawned children in the process test bypass the bounded test helper. This is test-suite failure containment only; production cancellation and cleanup have passing guarded process evidence. Owner: Test infrastructure maintainer. Follow-up: route remaining children through the helper and force a fixture failure to prove no leak.
2. **Info — exact plan/codemap precision (DEFERRED).** Split-command/count/timeout wording and a minor completion-import map statement are stale. This does not affect runtime behavior or Phase 4 acceptance. Owner: Track documentation owner. Follow-up: reconcile final summary and codemap with final verification output.

3. **P2 — CLI process-test startup acceleration (DEFERRED).** The raw API process fixture launches roughly ten isolated `node -r ts-node/register` CLI children, each paying TypeScript hook, module resolution, CLI bootstrap, profile validation, and broker-session startup cost. It uses transpile-only mode, but no shared in-memory cache survives process exit. Owner: CLI test infrastructure maintainer. Follow-up: evaluate building the CLI and running the built entrypoint for process fixtures, while retaining a smaller source-mode smoke test; alternatively create a dedicated CLI test-acceleration track to design reusable compiled-fixture infrastructure without weakening per-invocation cleanup coverage.

4. **P2 — Parallel independent Verser2 CLI requests (DEFERRED).** Several `si` operations fetch independent endpoint data sequentially. Under Verser2, those requests share an authenticated broker session and can be issued concurrently. Owner: CLI transport maintainer. Follow-up: identify independent request groups, introduce bounded parallel dispatch with cancellation/error aggregation and deterministic output ordering, then benchmark representative commands against the current sequential path.

## 2026-07-28 Final track review — CHANGES_REQUIRED

1. **High — real CLI mTLS traversal remains unproven.** Add production-stack integration coverage that spawns the configured CLI against real certificate-authenticated MultiManager, Manager, and direct-Hub ingress; prove success, traversal/isolation, rejected untrusted credentials, deterministic exits, and cleanup. This is explicit track acceptance and blocks completion.

# Native-first developer experience — non-executable draft

> **Status: research draft only.** This file authorizes no edits, implementation delegation, validation, or delivery action.

## Objective

Make a fresh Verser2-native workflow the obvious, low-configuration path for local and deployed use of STH, MultiManager, and `si`; retain legacy HTTP/CPM behavior as explicitly labelled compatibility functionality rather than the default mental model.

## Evidence

- Current `si` native transport connects directly to a TLS Verser2 endpoint and verifies the configured route before it sends v2 requests: `packages/cli/src/lib/commands/api.ts:100-152`.
- The native platform endpoint is MultiManager's primary Verser2 Host on `2443`; it is used by both STH upstream connections and native `si`: `packages/multi-manager/src/config/multi-manager-configuration.ts:41-72`, `packages/config/src/sth/default-config.ts:74-115`.
- STH HTTP `8000` and MultiManager HTTP `11000` listeners remain implemented but are not required for native `si` control: `packages/host/src/lib/host.ts:971-982`, `packages/multi-manager/src/lib/multi-manager.ts:241-278`.
- CPM URL/ID registration is a separate compatibility path: `packages/host/src/lib/host.ts:865-928`; native upstream connection is independent: `packages/host/src/lib/host.ts:985-1036`.
- Hub control ingress `2444` (or `2446` under a legacy collision) supports direct-Hub native access but cannot traverse to Manager/MultiManager routes: `docs/content/cli/verser2-cli.md:133-151`.
- The current runner creates an ephemeral local channel for its runtime after establishing its Verser2 transport: `packages/runner/src/bin/start-runner.ts:223-233`, `packages/runner/src/transport/verser2-runner-transport.ts:78-102`. The legacy `instancesServerPort` default remains `8001` but is not a public native-operation port: `packages/config/src/sth/default-config.ts:40-46`.
- Existing sequence material includes strong Node/Python tutorials, but Bun lacks a full tutorial and public scaffolds are absent: `docs/content/sequences/setup-and-run.md`, `docs/content/examples/`, `packages/runner-bun/README.md`.

## Proposed scope

1. Define and document one native-first topology: publish MultiManager `2443` with TLS; keep STH HTTP, MultiManager HTTP, direct-Hub ingress, and runner plumbing private unless a named compatibility/operations case requires them.
2. Improve command help and configuration defaults/presets so local-native startup requires no legacy CPM or HTTP settings.
3. Add clear configuration inspection and diagnosis helpers for transport, certificates, route/profile matching, and private/public port boundaries.
4. Build a sequence-authoring path with Node, Python, and Bun scaffolds, validation, pack/deploy/run helper flows, and copyable end-to-end examples.
5. Rewrite documentation around recommended tasks, full examples, a current-vs-compatibility taxonomy, and a single authoritative port matrix.
6. Correct stale public claims, such as HTTP-first `si` examples, v2 support status, obsolete `8001` exposure guidance, and accidental Docker `11001` exposure.

## Initial boundaries

- Preserve supported HTTP/v1, CPM, and direct-Hub control paths as compatibility features unless separately approved for removal.
- Do not require public exposure of STH `8000`, STH runner ports, MultiManager `11000`, `2444`, or `2446` for the current recommended workflow.
- Do not change transport/security semantics merely to simplify documentation; TLS and profile/route validation remain mandatory.
- Avoid changing default bindings or externally observable ports without an explicit compatibility and migration decision.
- No requirements artifact was requested, so none will be created.

## Candidate phases

- **Phase 0 — interactive PoC:** prove a minimal native local flow and obtain one developer feedback outcome; disposable scripts/configs only.
- **MVP 1 — native startup and config:** native-first command surface, minimal config generation, effective-config output, and diagnostic checks.
- **MVP 2 — sequence workflow:** scaffold/validate/package/deploy/run helpers for the three runtimes.
- **MVP 3 — documentation:** canonical tutorials, topology/port reference, migration/compatibility guidance, maintained examples.
- **Cleanup/DX:** eliminate stale help/docs/config aliases and generated-reference drift within the approved compatibility boundary.
- **Hardening:** improve secret safety, failure messages, compatibility migration notices, and production exposure guidance.
- **Fixes/coverage:** focused automated CLI/config/docs validation and native end-to-end proof.

## Decisions still needed from the user

1. Delivery location: current branch or an isolated branch/worktree.
2. Whether the plan may change runtime defaults/CLI behavior, or must initially add opt-in native-first commands/presets only.
3. Whether Phase 0 is wanted, and its observable success criteria.
4. Whether Cleanup/DX, Hardening, or Fixes/coverage should be skipped (the default is to include all).
5. Whether legacy HTTP/CPM remains a supported compatibility contract and the desired deprecation stance.

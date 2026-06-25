# Outcomes: Typings Split and Full Sequence AppContext Typings

## Decisions & Rationale

- Split the monolithic `@scramjet/types` surface into audience-specific packages:
  - `@scramjet/runtime-types` for runtime-neutral AppContext foundations, primitives, logger/storage, config, and protocol-neutral contracts.
  - `@scramjet/sequence-types` for sequence-author-facing `SequenceAppContext` and sequence application/function types.
  - `@scramjet/api-types` for API/user-facing DTOs, REST contracts, APIExpose, client stubs, and strict API-specific AppContext aliases.
- Kept `@scramjet/types` as a deprecated compatibility barrel to preserve external imports while repository source migrates to the split packages.
- Moved REST DTO ownership into `@scramjet/api-types`; `@scramjet/types` and `@scramjet/api-client` re-export compatibility surfaces.
- Promoted `@scramjet/sequence-test` to supported scoped local sequence fixture/hub-harness/AppContext validation. It is not a replacement for all package, BDD, adapter, or runtime invariant tests.
- Added full AppContext BDD coverage using local fixtures and real host/process runner-node paths.
- Integrated and fixed issue #37 topic-forwarding coverage in this branch because it blocked/overlapped the Phase 5 Manager/space routing validation path.

## Outcomes & Results

- Added packages `runtime-types`, `sequence-types`, and `api-types` with package metadata, build/test scripts, codemaps, and dependency-boundary checks.
- Deprecated `@scramjet/types` while preserving compatibility type resolution and assignability coverage.
- Migrated repository source away from `@scramjet/types`; enforcement is handled by `npm run check:typings-split`.
- Added local AppContext BDD fixture packages under `bdd/data/sequences/appcontext-*` and deterministic packing via `scripts/pack-appcontext-fixtures.js`.
- Added root validation scripts:
  - `npm run test:sequence-appcontext`
  - `npm run pack:appcontext-fixtures`
  - `npm run test:bdd-appcontext`
- Added `.github/workflows/test-sequence-appcontext.yml` and wired it into the main Node 18 CI workflow as a refapp-independent AppContext validation step.
- Fixed AppContext behavior/routing gaps discovered by BDD:
  - inbound event lifecycle and source-emitted event visibility;
  - localStorage monitoring/control roundtrip;
  - exposed API route lifetime/metadata;
  - v2 `hubClient()`/`spaceClient()` target-domain separation and standalone local-space fallback.
- Fixed issue #37 Manager cross-hub topic forwarding and added unit/BDD coverage.
- Updated docs, codemaps, and Conductor tech-stack notes for the split packages and supported sequence-test scope.

## Verification Summary

Final verification passed with:

- `npm test` in `packages/runtime-types`, `packages/sequence-types`, `packages/api-types`, and `packages/types`.
- `node ../../scripts/run-ava.js` in `packages/rest-api2`: 35/35 passed.
- `node ../../scripts/run-ava.js test/transport/runner-transport-config.spec.ts` in `packages/runner`: 31/31 passed.
- `node ../../scripts/run-ava.js test/context-v2-client.spec.ts test/handshake.spec.ts` in `packages/runner-node`: 7/7 passed.
- `node ../../scripts/run-ava.js` in `packages/sequence-test`: 120/120 passed.
- `npm run check:typings-split`: passed.
- `npm run test:sequence-appcontext`: 14/14 passed.
- `NODE_OPTIONS="--max-old-space-size=1024" npm run test:bdd-appcontext`: 7/7 scenarios and 45/45 steps passed.
- `npm run build:packages`: passed.
- `npm run lint:quick`: passed after mechanical lint fixes.
- `git diff --check`: passed.
- Phase 5 and final Phase 6 oracle reviews: passed.

## Constraints

- Used npm commands only.
- Non-BDD validation used the repository memory guard unless command-specific runners already handled memory.
- Live Cucumber BDD was run without `ulimit -v` and with `NODE_OPTIONS="--max-old-space-size=1024"` to avoid ssh2 Poly1305 Wasm virtual-memory failures.
- Full Docker/Kubernetes BDD remained out of scope.
- `@scramjet/types` was not removed; compatibility is intentionally preserved.
- Sequence-test support is scoped to local fixture/hub-harness/AppContext validation and does not replace unrelated validation classes.

## Risks & Open Items

- Live AppContext BDD can leave orphaned Host/STH process groups even when scenarios pass. This was manually cleaned after validation and filed as issue #38: https://github.com/0rail/transform-hub/issues/38
- Runner-node spawned-child skeleton suite remains deferred due a pre-existing AVA `--jitless` / undici `WebAssembly is not defined` issue.
- Host/Manager `from-types` shims remain intentionally broad/loose to avoid pulling implementation internals into public split packages late in this track.
- Protocol/message aliases remain partly duplicated across `runtime-types`, `api-types`, and `model`; future cleanup should deduplicate only when doing so does not expose runner internals.
- `packages/manager/package.json` still has `@scramjet/types` as a runtime dependency while remaining usage appears test/compatibility-oriented; move to devDependency or document if still required.

## Refapp / Downloaded Reference App Note

- AppContext/sequence validation was replaced by local fixtures and no longer requires downloaded refapps:
  - `bdd/data/sequences/appcontext-*`
  - `scripts/pack-appcontext-fixtures.js`
  - `npm run test:sequence-appcontext`
  - `npm run test:bdd-appcontext`
  - `.github/workflows/test-sequence-appcontext.yml`
- Downloaded `refapps/` and the `build-refapps` CI chain remain necessary for broader non-AppContext BDD coverage such as CLI, topics, Python, runtime lifecycle, performance, and error handling.
- No global refapp files or workflows were removed in this track.
- Future manual-review cleanup candidates include stale/dead references such as empty `features/reference-apps/RA-*` files and non-existent `packages/reference-apps/` dev-script paths.

## Follow-ups

- Fix BDD Host/STH teardown leak: issue #38.
- Add focused `get-runner-env` tests for explicit/default `spaceTargetDomain` behavior.
- Replace brittle default-domain suppression for `spaceTargetDomain` with an explicit configured/enabled signal.
- Tune route-error messages to mention `spaceTargetDomain` for space client failures.
- Add a Host API unit test documenting standalone local-space `/api/v2/hubs` semantics.
- Tighten Host/Manager local type shims and deduplicate protocol/message aliases in a future scoped refactor.
- Review Manager dependency hygiene for `@scramjet/types`.

## PR / Base Branch

- PR: https://github.com/0rail/transform-hub/pull/35
- Base branch: `feat/manager-oss`
- Implementation branch: `conductor/typings_split_appcontext_20260622`
- Final status before archival: PR ready for review, user approved, track marked complete.

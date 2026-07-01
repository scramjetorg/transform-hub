# Technical Debt Register

This register catalogs known technical debt items extracted from archived Conductor `outcome.md` files. Each item represents a deliberate deferral, incomplete migration, or scoped carve-out recorded when a track was completed or archived. The register should be refreshed when outcomes change, new tracks close, or archived tracks are revisited.

## Priority Summary

| Priority | Count |
|----------|-------|
| High     | 8     |
| Medium   | 22    |
| Low      | 17    |
| **Total** | **47** |

## Current Verification Status

The following provisional classification was derived by an automated repository explorer. Items marked as Likely addressed or Partially addressed should be reviewed and closed by a human when the next track revisits these areas.

| Classification | Count | IDs |
|----------------|-------|-----|
| Likely addressed | 3 | 36, 39, 41 |
| Partially addressed / obsolete | 6 | 1, 4, 19, 22, 32, 38 |
| Still open | 33 | 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 23, 24, 25, 26, 27, 30, 33, 34, 35, 37, 40, 42, 43, 46, 47 |
| Unverifiable without commands/external services | 5 | 28, 29, 31, 44, 45 |

Items 6, 8, and 10 are listed as **Still open** in the register but carry **external/runtime uncertainty** — the upstream verser2 library or runtime environment may have changed since the archived track outcome, so their current status cannot be fully determined from static analysis alone.

## Highest Priority Items

- **Remove old config services (sth-config, manager-config)** once replacement parity is proven. Dual config systems increase maintenance burden and risk of divergence. ([source](../conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md))
- **Migrate legacy `packages/runner` v1 client** to v2; runner currently uses legacy `RunnerAppContext` until explicitly migrated. Blocks full v2 internal adoption and forces dual-client maintenance. ([source](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md))
- **Resolve upstream `signicode/verser2#46` `flushHeaders()`** — the local shim is fragile and could regress on verser2 upgrades. ([source](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md))
- **Complete v1 backing beyond Host version/config/status** for stream, operation, storage, and forwarding payloads. Remaining gaps risk silent compatibility regressions. ([source](../conductor/archive/api_revamp_20260617/outcome.md))
- **Complete MultiManager v2 logs runtime handler binding** — the contract is defined but the runtime handler is incomplete, leaving a contracted endpoint non-functional. ([source](../conductor/archive/api_revamp_20260617/outcome.md))
- **Resolve breaking `this.hub`/`this.space` legacy sequence code** — legacy APIs are preserved indefinitely, blocking a v2-only codebase. Migration scope is unquantified. ([source](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md))
- **Enforce BDD no-circumvention for v2 client** — no BDD tests have been migrated to use the `@scramjet/rest-api2` client, so v2 client paths may silently break. ([source](../conductor/archive/api_revamp_20260617/outcome.md))
- **Document API v2 client usage** (`createRestAPI2Client()`, fluent clients, transports) — consumers cannot discover how to use the new API without documentation. ([source](../conductor/archive/new_documentation_20260621/outcome.md))

## Register

### High

| ID | Theme | Issue | Rationale | Verification | Source |
|----|-------|-------|-----------|--------------|--------|
| 1 | Legacy Code/Config Retention | Removal of old config services (sth-config, manager-config) — retained until replacement parity proven | Dual config systems increase maintenance burden and risk of divergence | Partially addressed | [unified_zod_config_commander_replacement_20260614](../conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md) |
| 4 | Legacy Code/Config Retention | Legacy packages/runner v1 client replacement; runner uses legacy RunnerAppContext until explicit migration | Blocks full v2 internal adoption and forces dual-client maintenance | Partially addressed | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 6 | Upstream / External Dependency Issues | Upstream signicode/verser2#46 flushHeaders() fix; shim retained locally | Local shim is fragile and could regress on verser2 upgrades | Still open; external/runtime uncertainty | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 14 | Incomplete API Coverage / Contracts | Full v1 backing beyond Host version/config/status; exact compatibility not yet proven for stream/operation/storage/forwarding payloads | Risk of silent compatibility regressions | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 15 | Incomplete API Coverage / Contracts | MultiManager v2 logs runtime handler defined in contracts but runtime binding incomplete | Contracted endpoint may not function | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 22 | Incomplete API Coverage / Contracts | Breaking existing this.hub/this.space sequence code remains unresolved; legacy APIs preserved indefinitely | Blocks v2-only codebase and migration is unquantified | Partially addressed | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 24 | BDD / Test Coverage Gaps | BDD no-circumvention enforcement; no BDD tests migrated to v2 until BDD steps use @scramjet/rest-api2 client | v2 client paths may silently break | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 39 | Documentation Gaps | Document API v2 client usage, including createRestAPI2Client(), fluent clients, and transports | Consumers cannot discover how to use new API | Likely addressed | [new_documentation_20260621](../conductor/archive/new_documentation_20260621/outcome.md) |

### Medium

| ID | Theme | Issue | Rationale | Verification | Source |
|----|-------|-------|-----------|--------------|--------|
| 2 | Legacy Code/Config Retention | Removing or archiving standalone packages/verser or packages/bpmux | Standalone packages are buildable but orphaned; eventual removal reduces repo surface area | Still open | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 5 | Legacy Code/Config Retention | Removing public v1 endpoints | Requires coordinated breaking-change window | Still open | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 8 | Upstream / External Dependency Issues | Runner RPC/control streams remain on local forwarding rather than native v0.4.1 tunnel APIs | Dual forwarding paths persist | Still open; external/runtime uncertainty | [verser2_v040_upgrade_20260616](../conductor/archive/verser2_v040_upgrade_20260616/outcome.md) |
| 10 | Upstream / External Dependency Issues | Public config for upstream federation deferred until multi-upstream, failover, or proxy credentials become concrete requirements | Federation config surface remains incomplete | Still open; external/runtime uncertainty | [verser2_v040_upgrade_20260616](../conductor/archive/verser2_v040_upgrade_20260616/outcome.md) |
| 11 | Upstream / External Dependency Issues | Optional hardening around STH id validation before deriving route domains | Could reduce spoofing/misrouting risk | Still open | [full_api_capability_20260623](../conductor/archive/full_api_capability_20260623/outcome.md) |
| 16 | Incomplete API Coverage / Contracts | Storage proxy Disk/S3 behavioral repair out of scope; v2 storage remains documented compatibility proxy | Known broken/limited storage proxy behavior | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 17 | Incomplete API Coverage / Contracts | Content-range semantics for v2 stream/list not designed in track scope | Impairs large result-set usability | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 20 | Incomplete API Coverage / Contracts | Derive fluent-client resolver prefixes from route tree instead of hardcoded resolver path fragments | Hardcoded fragments are brittle | Still open | [api_v2_final_structure_client_20260620](../conductor/archive/api_v2_final_structure_client_20260620/outcome.md) |
| 23 | Incomplete API Coverage / Contracts | Manager/MultiManager topology redesign beyond aggregation/readiness and API migration | Broader topology redesign remains pending | Still open | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 25 | BDD / Test Coverage Gaps | Broad Docker/Kubernetes BDD skipped; adapter package tests and builds passed | No end-to-end adapter validation | Still open | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 28 | BDD / Test Coverage Gaps | Full downstream drumwave-integration E2E and BDD smoke tests scoped to focused package tests | Multi-STH collision scenario lacks E2E verification | Unverifiable | [issue_26_runner_host_identity_20260622](../conductor/archive/issue_26_runner_host_identity_20260622/outcome.md) |
| 29 | BDD / Test Coverage Gaps | Full package test suite, full build, and broad BDD suites skipped as expensive for full API capability | Focused validation may miss side effects | Unverifiable | [full_api_capability_20260623](../conductor/archive/full_api_capability_20260623/outcome.md) |
| 30 | BDD / Test Coverage Gaps | Leak detection reports rather than fails CI by default | Process leaks could silently accumulate | Still open | [test_memory_efficiency_20260625](../conductor/archive/test_memory_efficiency_20260625/outcome.md) |
| 31 | BDD / Test Coverage Gaps | Docker-heavy, stress/load, external-dependency, aggregation-repro, and broad BDD suites remain deferred | Important regression categories unguarded | Unverifiable | [test_memory_efficiency_20260625](../conductor/archive/test_memory_efficiency_20260625/outcome.md) |
| 33 | BDD / Test Coverage Gaps | BDD assertions are count-based and could be strengthened with identity checks for hub, sequence, and instance ids | Wrong-hub/sequence bugs may slip through | Still open | [implement_manager_fix_20260618](../conductor/archive/implement_manager_fix_20260618/outcome.md) |
| 35 | BDD / Test Coverage Gaps | BDD process cleanup could be more robust with awaited exits and SIGKILL fallback | Stale-process risk in CI | Still open | [implement_manager_fix_20260618](../conductor/archive/implement_manager_fix_20260618/outcome.md) |
| 36 | Versioning / Publishing Gaps | Publishing verser2 to npmjs | Consumers otherwise face adoption friction | Likely addressed | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 40 | Documentation Gaps | Document custom API definitions and definition-level data, including RouteDefinition/ResolverDefinition metadata and manifest building | Blocks external extensibility | Still open | [new_documentation_20260621](../conductor/archive/new_documentation_20260621/outcome.md) |
| 41 | Config / Architecture Consolidation | Concrete verser2 Host endpoint/TLS config fields deferred to verser2 rollout | Extension points preserved but concrete config absent | Likely addressed | [unified_zod_config_commander_replacement_20260614](../conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md) |
| 44 | Config / Architecture Consolidation | WebAssembly is not defined under AVA --jitless in host/runner tests | Constrains test configuration | Unverifiable | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |
| 46 | Config / Architecture Consolidation | Runtime instance payload types understate raw Instance payloads accepted by Manager normalization | Type-safety gap | Still open | [implement_manager_fix_20260618](../conductor/archive/implement_manager_fix_20260618/outcome.md) |
| 47 | Config / Architecture Consolidation | Storage proxy behavioral repair out of scope | Known imperfect storage proxy behavior | Still open | [verser2_v040_upgrade_20260616](../conductor/archive/verser2_v040_upgrade_20260616/outcome.md) |

### Low

| ID | Theme | Issue | Rationale | Verification | Source |
|----|-------|-------|-----------|--------------|--------|
| 3 | Legacy Code/Config Retention | Decide whether to remove retained low-level or compatibility surfaces inventoried in Phase 6 | Non-urgent future cleanup decision | Still open | [api_v2_final_structure_client_20260620](../conductor/archive/api_v2_final_structure_client_20260620/outcome.md) |
| 7 | Upstream / External Dependency Issues | Generic CONNECT tunneling unsupported by public Host/Guest API | Deliberate protocol edge-case carve-out | Still open | [verser2_v040_upgrade_20260616](../conductor/archive/verser2_v040_upgrade_20260616/outcome.md) |
| 9 | Upstream / External Dependency Issues | /platform, /inout, trailers, informational responses intentionally unsupported | Deliberate scope carve-outs | Still open | [verser2_v040_upgrade_20260616](../conductor/archive/verser2_v040_upgrade_20260616/outcome.md) |
| 12 | Upstream / External Dependency Issues | Optional fully case-insensitive response Connection lookup tightening | Edge-case header sanitization hardening | Still open | [full_api_capability_20260623](../conductor/archive/full_api_capability_20260623/outcome.md) |
| 13 | Upstream / External Dependency Issues | Optional scoped STH domain tightening to one DNS label | Defense-in-depth hardening | Still open | [full_api_capability_20260623](../conductor/archive/full_api_capability_20260623/outcome.md) |
| 18 | Incomplete API Coverage / Contracts | Remote route mounting/resolution deferred; cross-node routing uses verser2 308 redirects through Router.resolve | Future enhancement, not blocker | Still open | [api_revamp_20260617](../conductor/archive/api_revamp_20260617/outcome.md) |
| 19 | Incomplete API Coverage / Contracts | Standardize operation IDs across runtime binding metadata and manifest/OpenAPI/fluent clients | Inconsistent generated metadata; low functional impact | Partially addressed | [api_v2_final_structure_client_20260620](../conductor/archive/api_v2_final_structure_client_20260620/outcome.md) |
| 21 | Incomplete API Coverage / Contracts | Convert generated OpenAPI paths from Express-style :param syntax to OpenAPI {param} syntax if compatibility permits | Minor tooling interop issue | Still open | [api_v2_final_structure_client_20260620](../conductor/archive/api_v2_final_structure_client_20260620/outcome.md) |
| 26 | BDD / Test Coverage Gaps | Python current-contract BDD not introduced | Python-specific regressions may be invisible | Still open | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 27 | BDD / Test Coverage Gaps | Bun BDD not introduced | Bun-specific regressions may be invisible | Still open | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 32 | BDD / Test Coverage Gaps | npm run test:bdd-ci-python selected 0 scenarios under current tags | Python BDD not executed automatically | Partially addressed | [test_memory_efficiency_20260625](../conductor/archive/test_memory_efficiency_20260625/outcome.md) |
| 34 | BDD / Test Coverage Gaps | communicationReady behavior has BDD coverage but could use focused package-level test | Unit test improves diagnostic speed | Still open | [implement_manager_fix_20260618](../conductor/archive/implement_manager_fix_20260618/outcome.md) |
| 37 | Versioning / Publishing Gaps | Upgrading verser2 beyond current active target | No current upgrade pressure | Still open | [old_verser_callsites_removal_20260615](../conductor/archive/old_verser_callsites_removal_20260615/outcome.md) |
| 38 | Versioning / Publishing Gaps | Hard-failing explicit legacy sth.default.runner.broker config; warning only in track | Migration not enforced | Partially addressed | [issue_26_runner_host_identity_20260622](../conductor/archive/issue_26_runner_host_identity_20260622/outcome.md) |
| 42 | Config / Architecture Consolidation | JSON Schema generation via zod-to-json-schema not mandatory for initial implementation | Limits tooling integration | Still open | [unified_zod_config_commander_replacement_20260614](../conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md) |
| 43 | Config / Architecture Consolidation | Runner boot config consolidation left out; protocol shape must remain stable | Intentional stability boundary | Still open | [unified_zod_config_commander_replacement_20260614](../conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md) |
| 45 | Config / Architecture Consolidation | Node MaxListenersExceeded warnings in high-fanout readiness tests | Non-fatal possible listener leak | Unverifiable | [v2_canonical_internal_api_20260621](../conductor/archive/v2_canonical_internal_api_20260621/outcome.md) |

# Scramjet Transform Hub — Roadmap

> **Owner:** Maintainers  
> **Review cadence:** Quarterly (next review: 2026-10-30)  
> **Status:** Active planning index — not a delivery commitment.

This file indexes the publicly visible, actionable work backlog and deferred
technical debt for the Transform Hub repository. It is a **planning index**
owned by maintainers, not a feature promise or customer-facing release plan.

Completed and superseded material is linked below in [archived / completed
material](#archived--completed-material) — those references are preserved for
traceability and treated as closed, not as active work.

---

## Scope

This roadmap covers:

- **Actionable legacy request themes** — conservatively grouped work areas
  extracted from the Phase 5 legacy-documentation proposal and the technical
  debt register. Each theme describes an area of known improvement without
  promising delivery scope, timeline, or resource allocation.
- **Deferred technical debt** — items catalogued in the separate technical
  debt register that remain unresolved at the time of this writing.
- **Deferred review findings** — per-track findings recorded during active
  Conductor phases that were judged non-blocking but require follow-up before
  a future production-readiness gate.

It does **not** cover:

- In-progress Conductor tracks (tracked in `conductor/tracks.md`).
- Completed tracks and their outcomes (linked under
  [archived / completed material](#archived--completed-material)).

---

## Actionable Legacy Request Themes

The following themes are grouped from the Phase 5 legacy-documentation
proposal and the archival cleanup outcome. They are **conservatively scoped**
— each theme names a direction for improvement without promising specific
deliverables, timelines, or resource commitments.

### 1. Legacy Code and Configuration Retention

**Related items:** technical-debt IDs 1, 2, 4, 5

Several backward-compatibility surfaces and orphaned packages remain in the
repository. Future work may include removing old config services
(`sth-config`, `manager-config`) after replacement parity is proven,
archiving standalone `packages/verser` and `packages/bpmux`, migrating the
legacy `packages/runner` v1 client to v2, and removing public v1 API
endpoints within a coordinated breaking-change window. A detailed deferred
removal record is maintained in the
[archival cleanup outcome](conductor/archive/cleanup_roadmap_20260702/deferred-removals.md).

### 2. Upstream and External Dependency Issues

**Related items:** technical-debt IDs 6, 7, 8, 9, 10, 11, 12, 13

The repository carries a local shim for `signicode/verser2#46`
(`flushHeaders()`) that is fragile on verser2 upgrades. Runner RPC/control
streams still use local forwarding rather than native verser2 v0.4.1 tunnel
APIs. Public configuration for upstream federation was deferred pending
concrete multi-upstream or failover requirements. Optional hardening items
(STH id validation, case-insensitive header matching, scoped STH domain
tightening) remain unaddressed.

### 3. Incomplete API Coverage and Contracts

**Related items:** technical-debt IDs 14, 15, 16, 17, 18, 19, 20, 21, 22, 23

Full v1 backing beyond Host version/config/status has not been proven for
stream, operation, storage, and forwarding payloads. The MultiManager v2 logs
runtime handler has a defined contract but incomplete runtime binding.
Storage proxy (Disk/S3) behavioral issues remain unrepaired. Content-range
semantics for v2 stream/list endpoints are not designed. The fluent-client
resolver prefixes are hardcoded rather than derived from the route tree.
Legacy sequence APIs (`this.hub` / `this.space`) remain preserved
indefinitely, blocking a v2-only codebase.

### 4. BDD and Test Coverage Gaps

**Related items:** technical-debt IDs 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
34, 35

No BDD tests have been migrated to use the `@scramjet/rest-api2` client,
leaving v2 client paths unguarded. Broad Docker and Kubernetes BDD suites are
skipped. Python and Bun contract BDD suites have not been introduced. Leak
detection reports rather than fails CI by default. Docker-heavy, stress/load,
external-dependency, and aggregation-repro suites remain deferred. BDD
assertions are count-based and could be strengthened with identity checks for
hub, sequence, and instance IDs.

### 5. Documentation Gaps

**Related items:** technical-debt IDs 39, 40

API v2 client usage — `createRestAPI2Client()`, fluent clients, and transports
— lacks consumer-facing documentation. Custom API definitions, including
`RouteDefinition` / `ResolverDefinition` metadata and manifest building, are
undocumented, blocking external extensibility.

### 6. Configuration and Architecture Consolidation

**Related items:** technical-debt IDs 41, 42, 43, 44, 45, 46, 47

Concrete verser2 Host endpoint and TLS configuration fields were deferred
until verser2 rollout. JSON Schema generation via `zod-to-json-schema` is not
mandatory for the initial implementation. Runner boot configuration
consolidation was left out to keep the protocol shape stable. WebAssembly is
not defined under AVA `--jitless` in host/runner tests. Runtime instance
payload types understate raw Instance payloads accepted by Manager
normalization. Storage proxy behavioral issues remain unrepaired.

### 7. Image-Config Immutability Assertions (Deferred Review)

**Source:** [Deferred review finding](conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/td.md)
(Phase 2, ID `release-align-failed-apply-image-immutability`, P2)

The failed-apply regression tests verify that manifests remain unchanged when
a boundary or workspace validation error blocks `apply`, but they do not
explicitly assert that `image-config.ts` remains byte-for-byte unchanged.
Adding image-config immutability assertions to the two failed-apply fixture
tests should be considered if final production-readiness reconciliation
determines the additional proof is required.

---

## Deferred Technical Debt

The full catalogue is maintained in the
[Technical Debt Register](docs-source/development/technical-debt.md).
As of this writing the register contains **47 items**:

| Priority | Count |
|----------|-------|
| High     | 8     |
| Medium   | 22    |
| Low      | 17     |

The eight highest-priority items cover legacy config removal, runner v1 client
migration, the upstream verser2 `flushHeaders()` shim, incomplete v1 API
backing, the MultiManager v2 logs runtime handler, legacy `this.hub` /
`this.space` sequence code, BDD v2-client circumvention, and API v2 client
documentation.

---

## Archived / Completed Material

The following references are preserved for traceability. They are **completed
or superseded** and are not treated as active work:

- [Legacy Documentation Cleanup Proposal](conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/legacy-docs-proposal.md)
  — Phase 5 analysis of documentation surfaces and completed proposed
  dispositions.
- [Deferred Removals Record](conductor/archive/cleanup_roadmap_20260702/deferred-removals.md)
  — Documents compatibility surfaces that remain intentionally retained after
  the archival cleanup track.
- [Archival Cleanup Outcome](conductor/archive/cleanup_roadmap_20260702/outcome.md)
  — Completed cleanup across nine phases (PR #53).
- Conductor track outcomes (in `conductor/archive/`):
  - [unified_zod_config_commander_replacement_20260614](conductor/archive/unified_zod_config_commander_replacement_20260614/outcome.md)
  - [old_verser_callsites_removal_20260615](conductor/archive/old_verser_callsites_removal_20260615/outcome.md)
  - [verser2_v040_upgrade_20260616](conductor/archive/verser2_v040_upgrade_20260616/outcome.md)
  - [verser2_public_20260616](conductor/archive/verser2_public_20260616/outcome.md)
  - [api_docs_revamp_20260616](conductor/archive/api_docs_revamp_20260616/outcome.md)
  - [api_revamp_20260617](conductor/archive/api_revamp_20260617/outcome.md)
  - [implement_manager_fix_20260618](conductor/archive/implement_manager_fix_20260618/outcome.md)
  - [api_v2_final_structure_client_20260620](conductor/archive/api_v2_final_structure_client_20260620/outcome.md)
  - [biome_transform_hub_20260620](conductor/archive/biome_transform_hub_20260620/outcome.md)
  - [v2_canonical_internal_api_20260621](conductor/archive/v2_canonical_internal_api_20260621/outcome.md)
  - [new_documentation_20260621](conductor/archive/new_documentation_20260621/outcome.md)
  - [issue_26_runner_host_identity_20260622](conductor/archive/issue_26_runner_host_identity_20260622/outcome.md)
  - [full_api_capability_20260623](conductor/archive/full_api_capability_20260623/outcome.md)
  - [test_memory_efficiency_20260625](conductor/archive/test_memory_efficiency_20260625/outcome.md)
  - [cleanup_roadmap_20260702](conductor/archive/cleanup_roadmap_20260702/outcome.md)
  - [verser2_cli_20260722](conductor/archive/verser2_cli_20260722/outcome.md)
  - [release_2_0_0_package_alignment_mit_license_20260729](conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/outcomes.md)

---

## Update Rules

1. **Quarterly review required.** This file must be reviewed and updated at
   least once per calendar quarter. Stale entries older than two quarters may
   be moved to archived/completed material after maintainer review.
2. **Additive by default.** New themes and debt items are added; removal or
   closure of a theme requires a specific maintainer decision recorded in the
   commit message or pull request description.
3. **Links to active conductor tracks are not added here.** In-progress work
   is tracked in `conductor/tracks.md`. When a track completes and its
   outcome archives, it may be moved to the
   [archived / completed material](#archived--completed-material) section.
4. **External requests are not captured here directly.** A legacy request
   becomes a roadmap theme only when a maintainer groups it into one of the
   existing themes or opens a pull request adding a new theme with
   justification.
5. **No delivery promises.** Every theme entry is a directional note, not a
   commitment. Progress is demonstrated by completed track outcomes and
   validated by the repository's test and build suite.

---

## Non-Goals

The following are explicitly **not** objectives of this roadmap:

- Customer-facing release plans or milestone commitments.
- A complete inventory of every open issue or feature request across all
  repositories.
- Real-time status tracking of in-progress Conductor tracks.
- A substitute for the Technical Debt Register or its review process.
- A changelog or release-notes replacement.

---

## References

| Document | Location |
|----------|----------|
| Technical Debt Register | [docs-source/development/technical-debt.md](docs-source/development/technical-debt.md) |
| Legacy Documentation Cleanup Proposal | [conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/legacy-docs-proposal.md](conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/legacy-docs-proposal.md) |
| Deferred Review Findings (Phase 2) | [conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/td.md](conductor/archive/release_2_0_0_package_alignment_mit_license_20260729/td.md) |
| Deferred Removals Record | [conductor/archive/cleanup_roadmap_20260702/deferred-removals.md](conductor/archive/cleanup_roadmap_20260702/deferred-removals.md) |
| Conductor Tracks | [conductor/tracks.md](conductor/tracks.md) |

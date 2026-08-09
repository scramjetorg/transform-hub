# Specification: verser2 v0.4.0 Native Redirects and Upstream Tunnels

## Overview

Upgrade Scramjet Transform Hub's verser2 integration from v0.3.1 to v0.4.0 and migrate communication paths toward the new upstream verser2 capabilities: native 308-style redirects and request tunneling to upstream hosts. The track should preserve existing runtime protocol compatibility while replacing the previous local forwarding workaround where v0.4.0 provides native behavior.

The existing verser2 rollout was designed while native 308 redirects and upstream tunneling were unavailable. This track updates that architecture incrementally: first establish v0.4.0 compatibility, then adopt native redirect/tunnel behavior for Manager, STH, runner, and MultiManager communication, and finally remove redundant local-forwarding code after equivalent behavior is proven.

## Track Type

Feature / infrastructure migration.

## Goals

- Upgrade all active `@signicode/verser2-*` package dependencies to v0.4.0.
- Replace dummy/internal follow-forwarding behavior with native verser2 308-style redirects where supported.
- Use verser2 v0.4.0 upstream host tunneling to reduce local forwarding and support the intended communication architecture.
- Preserve compatibility for Manager-to-STH, STH-to-STH, runner/runtime, and MultiManager communication flows.
- Include a final removal phase for obsolete local forwarding once native redirect/tunnel paths are validated.
- Keep behavior typed, configured, tested, and documented consistently with the repository's TypeScript/npm monorepo conventions.

## Functional Requirements

1. Dependency upgrade
   - All active packages using `@signicode/verser2-*` must depend on v0.4.0-compatible versions.
   - The npm lockfile must reflect the new package versions.
   - Any v0.4.0 API changes must be handled explicitly in source and tests.

2. Native redirect support
   - Manager follow-forwarding paths that currently dispatch internally should use native verser2 308-style redirect behavior where supported.
   - Redirect behavior must preserve route classification semantics for Manager-owned, follow, direct-route-metadata, and unsupported paths unless intentionally changed by this track.
   - Existing clients must receive clear, deterministic behavior when native redirecting is unavailable or inappropriate.

3. Upstream tunneling support
   - Communication paths that currently rely on local forwarding should be migrated to v0.4.0 upstream host tunneling where practical.
   - The implementation should start incrementally and retain fallback behavior until tunnel parity is validated.
   - Previously unsupported bidirectional paths may be reassessed, but broad support for every bidirectional route is not required unless enabled safely by v0.4.0.

4. Communication flow compatibility
   - Manager-to-STH requests must work through the new native redirect/tunnel architecture.
   - STH-to-STH communication and route metadata/follow behavior must remain compatible.
   - Runner and runtime wrapper communication must remain protocol-compatible across Node, Python, and Bun integration surfaces.
   - MultiManager host routing and sub-manager communication must remain compatible.

5. Local forwarding removal
   - Obsolete local forwarding helpers should only be removed after native redirect/tunnel behavior is verified.
   - Removal should be limited to code paths made redundant by v0.4.0 features.
   - Any retained fallback forwarding must be intentional and documented.

6. Configuration and types
   - Add or update configuration/types for redirect policy, upstream host tunneling, and any v0.4.0 options used by the implementation.
   - Defaults must be safe and backward-compatible unless a behavior change is explicitly documented.
   - Public CLI/config behavior must remain clear and validated.

7. Tests and documentation
   - Existing tests covering route classification, forwarding, transport, config, and runtime wrappers must be updated or extended.
   - New behavior must have focused package-level tests.
   - Documentation or Conductor artifacts must describe the migration from local forwarding to native redirect/tunnel behavior.

## Non-Functional Requirements

- Maintain runtime protocol compatibility across supported runtime wrappers.
- Prefer small, reviewable, incremental changes over a single risky rewrite.
- Preserve operational clarity for configuration, error behavior, and route handling.
- Avoid full Docker/Kubernetes validation unless required by implementation changes.
- Use npm commands for dependency and validation work.
- Do not treat `@scramjet/sequence-test` as the default validation path.

## Acceptance Criteria

- Active verser2 dependencies are upgraded to v0.4.0 and the lockfile is updated.
- Manager follow-forwarding uses native verser2 308-style redirects where v0.4.0 supports them.
- Upstream tunneling is used for the selected communication paths, with fallback behavior retained only where justified.
- Manager-to-STH, STH-to-STH, runner/runtime, and MultiManager communication flows are covered by tests or explicit validation notes.
- Obsolete local forwarding is removed in the final phase where native behavior provides parity.
- Config and type definitions include any required v0.4.0 redirect/tunnel options.
- Relevant package tests, builds, lint, runtime invariants, and practical BDD smoke validation pass or have documented, classified reasons for deferral.
- Documentation/Conductor notes identify any retained local forwarding, unsupported paths, and remaining upstream-verser2 unknowns.

## Out of Scope

- Replacing the entire verser2 rollout architecture with a different transport.
- Reintroducing legacy `@scramjet/verser` or BPMux active paths.
- Full Docker/Kubernetes BDD validation unless required by changed behavior.
- Guaranteed support for every currently unsupported bidirectional route if v0.4.0 APIs do not provide safe parity.
- Publishing or changing upstream verser2 packages themselves.

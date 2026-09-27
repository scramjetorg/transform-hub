# Phase 4 — Guided developer journeys

## Goal

Direct each developer from a major entrypoint to the right stable guide without requiring them to learn legacy topology, ports, or advanced concepts first.

## Owned paths

- `docs-source/intro/**`
- Directly maintained `README.md`, `docs-source/readmes/root.md`, and entrypoint/next-step sections in `docs-source/readmes/packages/{cli,sth,multi-manager,manager,adapter-process,adapter-docker,adapter-kubernetes}.md`
- `docs-source/intro/**`, bounded entrypoint sections in `docs-source/cli/usage.md`, and route panels in entrypoint pages
- `scripts/docs.js` and its focused generator tests
- Generated README/docs/sidebar output only through repository generators; no generated file is independently authored scope

## Dependencies

- Phase 3 provides the canonical installation, profile, TLS/mTLS, sequence, deployment, compatibility, and troubleshooting guides. This phase links to them; it does not rewrite their technical content.
- Phase 2 owns templates and runtime proof. This phase may link to them but cannot change them.

## Tasks

- [ ] Add a task-and-role “Choose your path” gateway from root README, docs overview, `si`, STH, and MultiManager entrypoints, and the first sidebar section.
- [ ] Route sequence developer, Hub operator, platform administrator, security operator, runtime/deployment operator, compatibility user, and troubleshooter to named primary destinations within two explicit handoffs.
- [ ] Make the native first-sequence route the recommended funnel: sequence-project installation → trusted bundle/profile → MultiManager `2443` → STH registration → canonical Node scaffold → deploy/input/stdout → next steps.
- [ ] Add concise next-step panels that state prerequisite, expected outcome, next guide, and compatibility boundary; preserve role-specific README examples without copying full guides.
- [ ] Add approved concise README sequence sections: `si` packages/deploys the shared Hello World fixture and reads stdout; STH points to `hubClient()` use; MultiManager points to `spaceClient()` and RPC. Record intentional no-change rationale for runner, config, adapters-common, legacy re-export, and API-client READMEs unless a changed public surface requires a cross-link.
- [ ] Add visible compatibility return links that state HTTP/v1, CPM, and direct-Hub applicability plus port/support limits, then return readers to the native route.
- [ ] Generate a deterministic task-first sidebar order: start here, first sequence, profiles, authoring, deployment, operations, security, troubleshooting, compatibility, then reference.
- [ ] Preserve static-only Kubernetes guidance and route it only to documented configuration/network prerequisites.

## Acceptance criteria

- A “handoff” is one explicit recommended-path link. From root README, docs overview, CLI, STH, or MultiManager documentation, every confirmed audience reaches its named primary destination within two handoffs.
- The first-sequence route introduces a trusted bundle/profile and minimal Node sequence before AppContext, topics, APIs, adapters, runtime alternatives, certificate formats, or legacy transport details.
- README entrypoints stay concise and link to existing `si`, `hubClient()`, and `spaceClient()`/RPC guidance rather than duplicating detailed instructions.
- Compatibility destinations state applicability, port/support boundary, and a return link; security routes distinguish CA-only TLS, optional mTLS, and fingerprint authorization without remote CA acquisition or shared STH/`si` identities.
- Kubernetes routing retains the explicit no-live-cluster-validation limitation.

## Verification

- `npm run docs:generate`
- `npm run docs:sync:readmes`
- `npm run docs:check`
- Focused `scripts/test/docs-generator.spec.js` coverage for deterministic sidebar ordering and README synchronization
- Route-map assertions for five entrypoints, all seven audiences, two-handoff maximum, compatibility return links, and Kubernetes limitation
- One recorded native first-sequence walkthrough and one recorded operator or compatibility walkthrough

## Non-goals

- Runtime, CLI, port, transport, certificate, template, deployment-protocol, or compatibility-support changes; full technical-guide duplication; live Kubernetes validation.

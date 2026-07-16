# Repository Documentation Fix

## Overview

Make the repository documentation a usable, reproducible product surface. Migrate the generated documentation output from `dist-docs/` to `docs/`, correct generated-output and package-README ownership, and bring the product narrative, Manager documentation, user-facing package descriptions, security guidance, and navigational indexes into alignment with verified repository behavior.

The opening sentence of the main product copy must be one unlabeled, compound sentence that states the user purpose, then the portable hub-and-runner approach that serves it, then the verified capabilities it provides.

## Requirements

### Generated documentation migration

- Change the supported generated documentation root from `dist-docs/` to `docs/` across generator configuration, protected-root checks, metadata, link rewriting, source documentation, scripts, and validation.
- Regenerate the documentation tree at `docs/` with its generated-output marker and remove or explicitly redirect the legacy `dist-docs/` output without leaving duplicate authoritative trees.
- Reconcile known generator debt with source evidence, including placeholder reference warnings, output-root precedence, deterministic regeneration, and safe cleanup.
- Split normal documentation export/check from repository package-README writes. Normal generation and checking must not overwrite `packages/*/README.md`; any supported README synchronization must be a separately explicit command with generated ownership markers or equivalent overwrite protection.

### Product and Manager documentation

- Rewrite the repository-root `README.md` as a directly maintained, non-generated entry point. Its opening sentence must be one unlabeled, compound sentence containing, in order, user and operator purpose, the portable hub-and-runner approach, and verified capabilities. The remainder must provide primary navigation and link to the Manager, security, and user-facing package documentation.
- Remove the root README from normal documentation-generator ownership and update the generator/source contract so `npm run docs:generate` and `npm run docs:check` preserve the directly maintained root `README.md`.
- Update supporting source documentation copy to align with the root README: begin with the user and operator purpose, explain the portable hub-and-runner operating approach, and then describe verified capabilities. Avoid unsupported claims.
- Add or improve main-repository Manager documentation that explains its control-plane role, connected Hub lifecycle/API routing, topic/service discovery, and operational boundaries.
- Include a GitHub-compatible Mermaid graph and nearby prose showing: a Sequence connecting through its owning Hub; TLS/verser2 paths to a Manager topic multiplexer; the corresponding path to another Hub and Sequence; and distinct control/API versus topic-stream paths.
- State accurately that Manager brokers live topic streams and does not make a durability, persistence, direct Sequence-to-Sequence-networking, HA failover, or automatic Hub-redirection claim unless code and tests establish it.

### User-facing package documentation

- Improve descriptive repository/package documentation for STH and MultiManager, grounding each statement in public APIs or tested runtime behavior.
- Add Sequence author documentation focused on supported authoring/API workflows, not a nonexistent `@scramjet/sequence` package. Mention `@scramjet/sequence-test` only as a scoped local test harness, not as a general replacement for package, BDD, adapter, or runtime validation.
- Audit the selected documentation for deprecated `@scramjet/types` guidance and use the canonical supported sequence-author API where applicable.

### Security and certificate trust

- Add a security section explaining server TLS, mutual TLS, trusted client issuers, client certificate authorization, fingerprint allowlists where supported, certificate/key protection, SANs, rotation, revocation, and the distinction between server trust and client authorization.
- Document only verified public trust endpoints and configuration surfaces; identify internal trust-export utilities and development self-signed identities as non-public and unsuitable as production enrollment tooling.
- Design and implement a public Manager-facing helper for establishing a locally trusted CA, including explicit lifecycle, generated materials, storage/permissions, trust distribution, rotation/revocation limits, and intended development or controlled-deployment use. Do not position it as a substitute for production PKI.
- Pause for user review before finalizing the public helper's API, certificate issuance model, persistence location, and security defaults. The approved design must include focused tests and public documentation.

### Documentation indexes

- Generate `README.md` index documentation in every directory under the generated `docs/` tree.
- Define deterministic titles, ordering, links, generated markers, and collision behavior. Preserve existing content where a `README.md` is already authoritative; do not silently replace hand-authored material or reference payloads.
- Ensure indexes are useful for routed content, generated reference trees, readme mirrors, sidebars, legacy documentation, and otherwise-empty or special directories, while making placeholder/reference status clear.

## Acceptance Criteria

- `npm run docs:generate` produces a single marked `docs/` output tree, and `npm run docs:check` verifies it without writes to repository package READMEs.
- The root `README.md` is directly maintained rather than generated, opens with one unlabeled compound sentence covering user/operator purpose, the portable hub-and-runner approach, and verified capabilities in that order, and is preserved by documentation generation/checking.
- Documentation generation has focused regression coverage for output-root precedence, legacy-root removal/redirect behavior, protected output roots, explicit README-write behavior, deterministic index generation, collision handling, and link integrity.
- The root README opening sentence uses the required purpose, approach, and capabilities composition; supporting source narrative remains aligned; important wording and package choices receive manual review before release.
- Manager documentation and Mermaid rendering describe only verified routing behavior and clearly state live-stream/non-persistent boundaries.
- STH, MultiManager, and Sequence author documentation are descriptive, accurate, and free of unsupported capability claims; sequence-test is presented with its supported scope.
- The security documentation distinguishes public configuration/endpoints from internal helpers and includes the approved public CA-helper contract, tests, threat boundaries, and operations guidance.
- Every generated `docs/` directory has a navigable `README.md` index or an explicitly documented collision-preservation result.
- Generated documentation preserves known reference-placeholder warnings rather than representing placeholders as complete API documentation.

## Non-Functional Requirements

- Generated output must be deterministic and safe to clean/regenerate.
- Documentation and generator changes must preserve repository link behavior across repo, generated docs, package/npm README, and Docusaurus contexts.
- The CA helper must default to secure permissions and explicit opt-in behavior, avoid logging private material, and document non-production limits.

## Out of Scope

- Implementing a production PKI, CA service, automatic certificate enrollment, or external certificate lifecycle infrastructure.
- Claiming high availability, durable messaging, direct cross-network Sequence transport, or capability parity not established by repository evidence.
- Completing the TypeScript reference renderer; existing placeholder status remains visible.
- Creating documentation for every internal package beyond the specified user-facing surfaces.

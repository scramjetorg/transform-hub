# Implementation Plan: Repository Documentation Fix

## Phase 1: Establish safe documentation ownership and migrate generated output

- [x] Task: Inventory the documentation generator and source/output contract.
    - [x] Read `scripts/docs.js`, `package.json`, `docs-source/reference/export-contract.md`, current root `README.md`, and relevant docs-generator tests before changing behavior.
    - [x] Record a source-backed claim and ownership matrix for root README, package READMEs, handwritten source content, generated output, sidebars, metadata, legacy documentation, and placeholder references.
    - [x] Confirm generator output precedence (`SCRAMJET_DOCS_OUTPUT_DIR`, package configuration, default) and every existing `dist-docs` reference/link-rewrite context.
    - Evidence: `scripts/docs.js` currently owns and writes the root and package READMEs, while `docs-source/` and `docs-source/legacy-docs/` are handwritten inputs; `dist-docs/` contains generated content, references, sidebars, metadata, and placeholder reference pages. Output precedence is `SCRAMJET_DOCS_OUTPUT_DIR`, then `package.json#scramjet.docs.outputDir`, then `dist-docs`. No dedicated generator tests currently cover these safety boundaries; `docs:check` is the existing integration-level drift check. Full ownership and legacy/link-rewrite inventory: specialist finding `ses_093e5e000ffegt8kGGAvvzXkY8` (2026-07-16).
- [x] Task: Add focused regression coverage for safe output and write modes.
    - [x] Cover the `docs/` default, environment/config precedence, protected-root behavior, sentinel/cleanup behavior, deterministic output, and legacy `dist-docs/` absence or redirect policy.
    - [x] Cover that ordinary generation and check mode cannot modify root or package READMEs.
    - [x] Cover a separately explicit package-README synchronization command, generated ownership marker, and refusal to overwrite unowned/manual files.
    - Evidence: added `scripts/test/docs-generator.spec.js` and testability-only exports from `scripts/docs.js`. The focused AVA command has six expected failures for the immediately following generator-migration task (output root, README write isolation/sync ownership, and legacy disposition); they must pass before this phase checkpoint.
- [x] Task: Migrate the generator from `dist-docs/` to `docs/`.
    - [x] Update output configuration, protected-root validation, metadata, source contract, link rewriting, scripts, and diagnostics.
    - [x] Make the repository-root `README.md` directly maintained and exclude it from generator ownership.
    - [x] Provide an explicit package-README synchronization command rather than coupling writes to general generation.
    - [x] Remove or intentionally redirect legacy generated output only after verifying the new generated tree and references.
    - Evidence: focused AVA coverage passes (13 tests), `npm run docs:generate` and `npm run docs:check` pass under the memory guard. Oracle High findings were repaired: the technical-debt register is now canonical routed source at `docs-source/development/technical-debt.md`; generation rejects unmarked `docs/` roots rather than deleting them; normal check no longer owns or compares root/package READMEs. `dist-docs/` was removed after successful `docs/` generation.
- [x] Task: Generate deterministic README indexes for every directory in the `docs/` tree.
    - [x] Define generation markers, titles, stable ordering, parent/child navigation, relative-link rules, and missing/empty-directory behavior.
    - [x] Define collision handling that preserves authoritative hand-authored `README.md` content and safely augments or records generated/reference collisions.
    - [x] Include reference, API, CLI, sidebars, readme mirrors, partials, and legacy folders; preserve placeholder warnings.
    - Evidence: 15 focused generator tests pass, including deterministic index, collision-preservation, and navigability coverage. Generated/rewrite-owned READMEs receive a marked navigation block; unowned collisions retain their content and use `README.index.md` as the navigation target.
- [x] Task: Validate the documentation migration and generated index behavior.
    - [x] Run focused generator tests under the repository memory guard.
    - [x] Run `npm run docs:generate` and `npm run docs:check`; inspect the changed-file set, sentinel, legacy-output disposition, README ownership, navigation links, and placeholder notices.
    - [x] Record that memory-guarded runtime tests are not applicable to documentation-only generator validation unless the public CA helper phase introduces testable runtime behavior.
    - Evidence: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/docs-generator.spec.js --serial` passed 19 tests. With the same memory guard, `npm run docs:generate` and `npm run docs:check` passed. `docs/.scramjet-docs-output.json` exists, `dist-docs/` is absent, no package README changes are present, generated indexes and placeholder notices were inspected, and documentation-only validation has no runtime memory-guard surface in this phase. Final Oracle review passed after remediation: exact marker ownership, legacy preflight safety, generated link validation, and metadata ownership wording are covered.
- [x] Task: Conductor - Phase Checkpoint 'Establish safe documentation ownership and migrate generated output' (Protocol in workflow.md)

## Phase 2: Write evidence-backed product, Manager, and package documentation

- [x] Task: Build a documentation claim matrix before editing user-facing copy.
    - [x] Verify each Manager, MultiManager, STH, and Sequence author claim against public APIs, configuration, source behavior, or focused tests.
    - [x] Remove or correct unsupported claims about HA/failover, automatic Hub redirection, persistence, direct cross-network Sequence transport, and package names.
    - [x] Confirm canonical sequence-author API guidance and retain the explicit limited scope of `@scramjet/sequence-test`.
    - Evidence: source-backed matrix recorded from `ses_093e5e000ffegt8kGGAvvzXkY8` (2026-07-16). Manager routes lifecycle/API and live topic streams through verser2 but does not provide durable state, HA/failover, automatic Hub redirection, or direct Sequence networking; MultiManager manages in-process sub-Managers and aggregation, not HA. Canonical author surface is `@scramjet/sequence-types`; `@scramjet/sequence-test` is a scoped local harness only.
- [x] Task: Rewrite the directly maintained root `README.md`.
    - [x] Open with one unlabeled, compound sentence that contains, in order, the product purpose for developers and platform operators, the portable hub-and-runner approach that serves it, and verified capabilities; follow with getting-started links and primary documentation navigation.
    - [x] Link the root README to Manager documentation, security/trust guidance, STH, MultiManager, and Sequence author documentation.
- [x] Task: Add or revise Manager documentation and the cross-network communication explainer.
    - [x] Document Manager's connected-Hub control-plane role, lifecycle/API routing, and live topic/service discovery.
    - [x] Add a GitHub-compatible Mermaid diagram of `Sequence → owning Hub → TLS/verser2 → Manager topic multiplexer → TLS/verser2 → remote Hub → Sequence`.
    - [x] Label control/API and live topic-stream paths separately and state that topic streams are brokered without persistence.
- [x] Task: Improve the selected user-facing package and author documentation.
    - [x] Update STH documentation with its host/CLI startup role and supported execution contexts.
    - [x] Update MultiManager documentation with source-backed sub-Manager lifecycle, routing, aggregation, and boundary language.
    - [x] Add Sequence author/API documentation, mentioning the scoped sequence-test harness without treating it as a broad test replacement.
- [x] Task: User Manual Verification - Product wording and package choices.
    - [x] Present the proposed root README narrative, Manager diagram/copy, and selected package/author documentation scope for approval before finalizing wording.
    - Approval: user approved the `Scramjet Platform` title and final two-sentence README opening on 2026-07-16, including configured TLS encryption and client-authentication wording for Manager-coordinated internet connections.
- [x] Task: Validate documentation content and generated mirrors.
    - [x] Regenerate/check documentation and validate Mermaid/link syntax using the repository's available focused checks.
    - [x] Review source/output diffs for claim-matrix alignment, generated markers, canonical sequence guidance, and absence of unsupported capability claims.
    - Evidence: `npm run docs:generate` and `npm run docs:check` passed with `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"`; generated-link validation passed. Mermaid is GitHub-compatible fenced `mermaid` flowchart syntax and source/output docs reflect the reviewed claim matrix.
- [x] Task: Conductor - Phase Checkpoint 'Write evidence-backed product, Manager, and package documentation' (Protocol in workflow.md)

## Phase 3: Define and implement the Manager local trusted-CA helper

- [x] Task: Investigate public Manager trust/configuration boundaries and existing certificate code.
    - [x] Read Manager, MultiManager, host, config, REST route, and certificate/trust-export implementations plus focused tests and package codemaps.
    - [x] Distinguish public trust endpoints/configuration from internal trust-export utilities, self-signed development identities, and test-only certificate assets.
    - [x] Identify shared certificate/key utilities before adding a Manager-specific helper; record why any package-local implementation is necessary.
    - Evidence: public v1/v2 Manager and MultiManager trust exports expose only CA certificates, fingerprint, expiry, host URL, and route domains; existing self-signed identity creation is internal to host/MultiManager and safely persists keys with restrictive modes. `@scramjet/config` provides public masking/config schemas and trust bootstrap, but no shared public CA issuance primitive. A helper must retain CA private material locally and never expose it through trust exports.
- [x] Task: Propose the public Manager CA-helper contract and threat boundaries.
    - [x] Define API/CLI/config shape, explicit opt-in, CA/server/client material lifecycle, storage location and restrictive permissions, secret redaction, trust-bundle distribution, supported deployment scope, rotation/revocation limits, and failure behavior.
    - [x] Define tests and documentation that prevent positioning the helper as production PKI or automatic client enrollment.
    - Revised proposed contract: `@scramjet/runtime-types` supplies versioned enrollment wire contracts; Hub-side commands generate keys and PKCS#10 CSRs locally, then redeem a CSR-bound, one-time Manager grant through a narrowly scoped direct-HTTPS endpoint. Manager approval creates local CA/server material and validates CSR signatures, exact Hub URI SANs, and explicit extra SANs before issuing client-auth-only certificates. Private keys never leave the Hub; grants store token hashes only; trust exports remain CA-only. Enrollment is explicit and disabled by default, with mTLS plus fingerprint authorization, no automatic enrollment/rotation, CRL/OCSP, HA, proxy TLS termination, or production-PKI claim.
- [x] Task: User Manual Verification - Public CA-helper design.
    - [x] Present the proposed public API, issuance model, persistence behavior, key/certificate security defaults, and operational limits for approval before implementation.
    - Approval: user approved the Hub-local key generation and CSR enrollment design on 2026-07-16, with `@scramjet/runtime-types` as the sole shared contract package; `@scramjet/types` remains deprecated and must not be used.
- [x] Task: Implement the approved public Manager helper and focused tests.
    - [x] Add the approved public API/configuration and reuse existing verified primitives where safe.
    - [x] Add focused tests for explicit opt-in, generated identity/trust output, permissions, private-material redaction, invalid configuration, trust/authorization separation, and rotation/revocation boundary behavior.
    - [x] Update public documentation for use, trust distribution, mTLS authorization, certificate/key handling, and production PKI limitations.
    - Evidence: CSR enrollment now uses runtime-neutral contracts from `@scramjet/runtime-types`, Hub-local private keys/CSRs, pinned HTTPS certificate installation, explicit Manager approval, masked disabled-by-default config, atomic grants, structural CSR/CA validation, issuance-bound fingerprint authorization, and Hub-SAN identity binding. Critical Oracle review findings were repaired and reverified; the P2 cross-Hub regression now runs before revocation.
- [x] Task: Validate the security surface.
    - [x] Run affected package tests through `scripts/run-ava.js` under `ulimit -v 1835008` and the repository-supported memory settings.
    - [x] Run focused build/type/lint validation for affected packages and review public exports/configuration for accidental exposure.
    - [x] Record memory-guard command, thresholds, any per-test exception/skip, and rationale in the phase validation notes.
    - Evidence: under `ulimit -v 1835008`, `NODE_OPTIONS="--max-old-space-size=1024"`, and `SCRAMJET_AVA_MEMORY_GUARD=1`, Manager (188), Host (279; 9 pre-existing CouchDB skips), and Config (51) package tests passed. Manager now has `pretest:ava` typechecking before transpile-only AVA. Focused runtime-types, Host, Manager, and Config TypeScript builds passed during implementation. Memory threshold was the repository default 524288 bytes; no exceptions/skips were added for CSR tests. Oracle re-reviewed all Critical/High CSR issues through final Hub identity-binding remediation.
- [x] Task: Conductor - Phase Checkpoint 'Define and implement the Manager local trusted-CA helper' (Protocol in workflow.md)

## Phase 4: Final integration, regeneration, and delivery review

- [x] Task: Add usable Hub and Manager CSR enrollment CLI workflows.
    - [x] Provide documented commands for Hub CSR/key generation, local Manager approval/grant creation, and direct HTTPS redemption/installation.
    - [x] Preserve explicit opt-in, approval gating, pinned CA validation, and secret-redaction boundaries.
    - [x] Add focused CLI coverage and update the public enrollment guide with runnable examples for developer and homelab use.
    - Evidence: `sth-csr-enrollment generate|redeem` owns Hub operations and `manager-csr-enrollment approve` owns local Manager approval. Both use the hardened `@scramjet/config` command model; shared parsing now rejects unsafe input with sanitized diagnostics, array values accumulate deterministically, and no Manager runtime dependency remains in STH. Oracle re-reviewed security/usability through JSON and numeric coercion diagnostics.
- [x] Task: Perform final regeneration and repository consistency review.
    - [x] Run `npm run docs:generate`, `npm run docs:check`, affected package tests, and narrow lint/build checks under the required memory safeguards.
    - [x] Confirm only `docs/` is the generated documentation root; root/package README ownership is preserved; every documentation directory has an index or documented collision result; and no stale `dist-docs/` references remain.
    - [x] Verify root README, Manager explanation/diagram, STH/MultiManager/Sequence documentation, and mTLS/CA-helper documentation all match verified behavior.
    - Evidence: regenerated/checked `docs/` successfully and confirmed its marker exists with no `dist-docs/` directory. The final stale-link scan found generated package READMEs still pointing at `dist-docs`; `npm run docs:sync:readmes` updated all 40 owned package READMEs, after which the scan and `docs:check` passed.
- [x] Task: Review maintainability and deferred documentation debt.
    - [x] Request Oracle review of generated-output migration safety, public CA-helper security boundary, documentation claims, index collision policy, and remaining placeholder reference warnings.
    - [x] Reconcile accepted or rejected advisory candidates with rationale; repair and revalidate all in-scope findings.
    - Oracle: all in-scope findings are repaired. `td.md` has one accepted, explicitly out-of-scope production-PKI debt candidate; the public documentation now exposes its limitations.
- [x] Task: Prepare final delivery evidence.
    - [x] Document commands run, generated-output checks, focused test/build/lint results, memory-guard thresholds, skips/exceptions, and deferred follow-ups.
    - [x] Commit completed phase work on the configured mainline only after each phase checkpoint, keeping unrelated work excluded.
    - Validation summary: docs generate/check and package README synchronization passed; docs generator focused suite passed 19 tests; Manager 188, Host 279 (9 pre-existing CouchDB skips), and Config 51 tests passed under `ulimit -v 1835008`, `NODE_OPTIONS="--max-old-space-size=1024"`, and `SCRAMJET_AVA_MEMORY_GUARD=1`. The Manager pretest typecheck passed before transpile-only AVA. Final CLI command-model validation passed 8 tests under the same guard; docs regenerate/check passed after the CLI guide update. No CSR memory exceptions or skips were used; deferred coverage is limited to the accepted production-PKI scope in `td.md`.
- [x] Task: Conductor - Phase Checkpoint 'Final integration, regeneration, and delivery review' (Protocol in workflow.md)

# Implementation Plan: Repository Documentation Fix

## Phase 1: Establish safe documentation ownership and migrate generated output

- [ ] Task: Inventory the documentation generator and source/output contract.
    - [ ] Read `scripts/docs.js`, `package.json`, `docs-source/reference/export-contract.md`, current root `README.md`, and relevant docs-generator tests before changing behavior.
    - [ ] Record a source-backed claim and ownership matrix for root README, package READMEs, handwritten source content, generated output, sidebars, metadata, legacy documentation, and placeholder references.
    - [ ] Confirm generator output precedence (`SCRAMJET_DOCS_OUTPUT_DIR`, package configuration, default) and every existing `dist-docs` reference/link-rewrite context.
- [ ] Task: Add focused regression coverage for safe output and write modes.
    - [ ] Cover the `docs/` default, environment/config precedence, protected-root behavior, sentinel/cleanup behavior, deterministic output, and legacy `dist-docs/` absence or redirect policy.
    - [ ] Cover that ordinary generation and check mode cannot modify root or package READMEs.
    - [ ] Cover a separately explicit package-README synchronization command, generated ownership marker, and refusal to overwrite unowned/manual files.
- [ ] Task: Migrate the generator from `dist-docs/` to `docs/`.
    - [ ] Update output configuration, protected-root validation, metadata, source contract, link rewriting, scripts, and diagnostics.
    - [ ] Make the repository-root `README.md` directly maintained and exclude it from generator ownership.
    - [ ] Provide an explicit package-README synchronization command rather than coupling writes to general generation.
    - [ ] Remove or intentionally redirect legacy generated output only after verifying the new generated tree and references.
- [ ] Task: Generate deterministic README indexes for every directory in the `docs/` tree.
    - [ ] Define generation markers, titles, stable ordering, parent/child navigation, relative-link rules, and missing/empty-directory behavior.
    - [ ] Define collision handling that preserves authoritative hand-authored `README.md` content and safely augments or records generated/reference collisions.
    - [ ] Include reference, API, CLI, sidebars, readme mirrors, partials, and legacy folders; preserve placeholder warnings.
- [ ] Task: Validate the documentation migration and generated index behavior.
    - [ ] Run focused generator tests under the repository memory guard.
    - [ ] Run `npm run docs:generate` and `npm run docs:check`; inspect the changed-file set, sentinel, legacy-output disposition, README ownership, navigation links, and placeholder notices.
    - [ ] Record that memory-guarded runtime tests are not applicable to documentation-only generator validation unless the public CA helper phase introduces testable runtime behavior.
- [ ] Task: Conductor - Phase Checkpoint 'Establish safe documentation ownership and migrate generated output' (Protocol in workflow.md)

## Phase 2: Write evidence-backed product, Manager, and package documentation

- [ ] Task: Build a documentation claim matrix before editing user-facing copy.
    - [ ] Verify each Manager, MultiManager, STH, and Sequence author claim against public APIs, configuration, source behavior, or focused tests.
    - [ ] Remove or correct unsupported claims about HA/failover, automatic Hub redirection, persistence, direct cross-network Sequence transport, and package names.
    - [ ] Confirm canonical sequence-author API guidance and retain the explicit limited scope of `@scramjet/sequence-test`.
- [ ] Task: Rewrite the directly maintained root `README.md`.
    - [ ] Open with one unlabeled, compound sentence that contains, in order, the product purpose for developers and platform operators, the portable hub-and-runner approach that serves it, and verified capabilities; follow with getting-started links and primary documentation navigation.
    - [ ] Link the root README to Manager documentation, security/trust guidance, STH, MultiManager, and Sequence author documentation.
- [ ] Task: Add or revise Manager documentation and the cross-network communication explainer.
    - [ ] Document Manager's connected-Hub control-plane role, lifecycle/API routing, and live topic/service discovery.
    - [ ] Add a GitHub-compatible Mermaid diagram of `Sequence → owning Hub → TLS/verser2 → Manager topic multiplexer → TLS/verser2 → remote Hub → Sequence`.
    - [ ] Label control/API and live topic-stream paths separately and state that topic streams are brokered without persistence.
- [ ] Task: Improve the selected user-facing package and author documentation.
    - [ ] Update STH documentation with its host/CLI startup role and supported execution contexts.
    - [ ] Update MultiManager documentation with source-backed sub-Manager lifecycle, routing, aggregation, and boundary language.
    - [ ] Add Sequence author/API documentation, mentioning the scoped sequence-test harness without treating it as a broad test replacement.
- [ ] Task: User Manual Verification - Product wording and package choices.
    - [ ] Present the proposed root README narrative, Manager diagram/copy, and selected package/author documentation scope for approval before finalizing wording.
- [ ] Task: Validate documentation content and generated mirrors.
    - [ ] Regenerate/check documentation and validate Mermaid/link syntax using the repository's available focused checks.
    - [ ] Review source/output diffs for claim-matrix alignment, generated markers, canonical sequence guidance, and absence of unsupported capability claims.
- [ ] Task: Conductor - Phase Checkpoint 'Write evidence-backed product, Manager, and package documentation' (Protocol in workflow.md)

## Phase 3: Define and implement the Manager local trusted-CA helper

- [ ] Task: Investigate public Manager trust/configuration boundaries and existing certificate code.
    - [ ] Read Manager, MultiManager, host, config, REST route, and certificate/trust-export implementations plus focused tests and package codemaps.
    - [ ] Distinguish public trust endpoints/configuration from internal trust-export utilities, self-signed development identities, and test-only certificate assets.
    - [ ] Identify shared certificate/key utilities before adding a Manager-specific helper; record why any package-local implementation is necessary.
- [ ] Task: Propose the public Manager CA-helper contract and threat boundaries.
    - [ ] Define API/CLI/config shape, explicit opt-in, CA/server/client material lifecycle, storage location and restrictive permissions, secret redaction, trust-bundle distribution, supported deployment scope, rotation/revocation limits, and failure behavior.
    - [ ] Define tests and documentation that prevent positioning the helper as production PKI or automatic client enrollment.
- [ ] Task: User Manual Verification - Public CA-helper design.
    - [ ] Present the proposed public API, issuance model, persistence behavior, key/certificate security defaults, and operational limits for approval before implementation.
- [ ] Task: Implement the approved public Manager helper and focused tests.
    - [ ] Add the approved public API/configuration and reuse existing verified primitives where safe.
    - [ ] Add focused tests for explicit opt-in, generated identity/trust output, permissions, private-material redaction, invalid configuration, trust/authorization separation, and rotation/revocation boundary behavior.
    - [ ] Update public documentation for use, trust distribution, mTLS authorization, certificate/key handling, and production PKI limitations.
- [ ] Task: Validate the security surface.
    - [ ] Run affected package tests through `scripts/run-ava.js` under `ulimit -v 1835008` and the repository-supported memory settings.
    - [ ] Run focused build/type/lint validation for affected packages and review public exports/configuration for accidental exposure.
    - [ ] Record memory-guard command, thresholds, any per-test exception/skip, and rationale in the phase validation notes.
- [ ] Task: Conductor - Phase Checkpoint 'Define and implement the Manager local trusted-CA helper' (Protocol in workflow.md)

## Phase 4: Final integration, regeneration, and delivery review

- [ ] Task: Perform final regeneration and repository consistency review.
    - [ ] Run `npm run docs:generate`, `npm run docs:check`, affected package tests, and narrow lint/build checks under the required memory safeguards.
    - [ ] Confirm only `docs/` is the generated documentation root; root/package README ownership is preserved; every documentation directory has an index or documented collision result; and no stale `dist-docs/` references remain.
    - [ ] Verify root README, Manager explanation/diagram, STH/MultiManager/Sequence documentation, and mTLS/CA-helper documentation all match verified behavior.
- [ ] Task: Review maintainability and deferred documentation debt.
    - [ ] Request Oracle review of generated-output migration safety, public CA-helper security boundary, documentation claims, index collision policy, and remaining placeholder reference warnings.
    - [ ] Reconcile accepted or rejected advisory candidates with rationale; repair and revalidate all in-scope findings.
- [ ] Task: Prepare final delivery evidence.
    - [ ] Document commands run, generated-output checks, focused test/build/lint results, memory-guard thresholds, skips/exceptions, and deferred follow-ups.
    - [ ] Commit completed phase work on the configured mainline only after each phase checkpoint, keeping unrelated work excluded.
- [ ] Task: Conductor - Phase Checkpoint 'Final integration, regeneration, and delivery review' (Protocol in workflow.md)

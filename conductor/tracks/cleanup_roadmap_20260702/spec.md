# Specification: Archival Cleanup Implementation

## Overview

Implement the archival cleanup work identified from prior planning and technical-debt notes. The work must proceed in phases, with prerequisite parity/proof work before removals, explicit validation gates, and clear retention boundaries for compatibility surfaces that must remain.

## Goals

- Complete safe cleanup after prerequisite proof work passes.
- Remove old config services only after replacement parity is proven.
- Clean stale documentation/refapp/legacy BDD references and replace outdated BDD/reference-app coverage where required.
- Remove obsolete transport dead code only after verser2 parity is proven and the path is confirmed unused.
- Verify and harden retained legacy packages in the redundant-package cleanup phase rather than deleting them.

## Required Implementation Areas

The implementation must cover:

1. Inventory, safety gates, and removal classification.
2. Documentation output cleanup and docs parity.
3. Config parity before removing old config services.
4. API/client parity and retained v1 compatibility.
5. Refapps and legacy BDD cleanup.
6. BDD/test infrastructure hardening.
7. Redundant package cleanup / retained legacy package proof.
8. Transport/local-forwarding cleanup after verser2 parity.
9. Breaking-change readiness and explicitly deferred removals.

## Removal Policy

This track may remove, after prerequisites and validation pass:

- Old config packages/services such as `sth-config` and `manager-config`, if replacement parity is proven.
- Stale docs outputs, stale docs scripts/references, and obsolete documentation-generation surfaces.
- Stale/dead refapp references and legacy BDD references.
- Transport dead code, but only when no active imports/usages remain and verser2 parity is proven.

This track must explicitly retain:

- Public v1 APIs.
- Deprecated `@scramjet/types` compatibility package/types.
- `packages/verser` and `packages/bpmux` in this repository.
- Legacy sequence APIs such as `this.hub` / `this.space`.

Public v1 APIs, legacy sequence APIs, and `@scramjet/types` must not be removed in this track. They may be inventoried and documented for later removal decisions only.

## Redundant Package / Retained Legacy Package Requirements

The redundant-package phase must be cleanup plus proof for retained legacy packages, not deletion of `verser`, `bpmux`, or old package/types.

It must:

- Confirm `packages/verser` still builds.
- Confirm `packages/bpmux` still imports/typechecks or otherwise has an explicit minimal verification surface.
- Prove `verser` and `bpmux` can be built/imported/typechecked outside the monorepo context using standalone commands and published or otherwise explicit dependencies.
- Identify and remove monorepo-only coupling where appropriate, such as root script reliance, root tsconfig reliance, test-only imports, or shared type coupling.
- Extract old verser-specific types out of shared package/types surfaces where required for standalone proof.
- Retain the old `@scramjet/types` compatibility package/types.
- Preserve runtime invariant Guard 7 or equivalent protection so active packages do not re-import `verser`/`bpmux`.
- Document any remaining coupling that cannot be safely removed in this track.

## Acceptance Criteria

- Each cleanup area completes prerequisite proof before removal work.
- Each removal satisfies at least one acceptance criterion from:
  - no active imports/usages,
  - parity tests pass,
  - standalone proof passes,
  - explicit user approval for major/destructive removals.
- Old config removal is gated by config behavior parity tests/inventory.
- Documentation cleanup is gated by docs generation/check validation.
- Refapp/BDD cleanup is gated by targeted BDD or package-level replacement tests.
- Transport cleanup is gated by verser2 parity and no-active-use checks.
- `packages/verser`, `packages/bpmux`, public v1 APIs, legacy sequence APIs, and `@scramjet/types` remain present at track completion.
- Final artifacts record completed cleanup, skipped validation, retained compatibility surfaces, and follow-up removal candidates.

## Out of Scope

- Removing `packages/verser` or `packages/bpmux` from the repository.
- Removing public v1 APIs.
- Removing legacy sequence APIs such as `this.hub` / `this.space`.
- Removing the deprecated `@scramjet/types` compatibility package/types.
- Broad Docker/Kubernetes BDD unless required by a specific cleanup change.
- Changing product behavior without parity proof and approval.

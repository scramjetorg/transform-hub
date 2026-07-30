# Deferred Review Findings

- **ID:** `release-align-failed-apply-image-immutability`
  - **Source:** Phase 2 re-review, 2026-07-30.
  - **Priority / disposition:** P2; `PASS/deferred`, safe to continue.
  - **Finding:** The failed-apply regression tests snapshot root and included
    manifests but do not explicitly assert that `image-config.ts` remains
    byte-for-byte unchanged when a boundary or workspace validation error
    blocks `apply`.
  - **Required follow-up:** Add image-config immutability assertions to the
    two failed-apply fixture tests if final production-readiness reconciliation
    determines the additional proof is required.
  - **Rationale:** The implementation returns before the image write and the
    current test coverage verifies the same fail-closed path for manifests;
    the reviewer judged the omitted assertion non-blocking.

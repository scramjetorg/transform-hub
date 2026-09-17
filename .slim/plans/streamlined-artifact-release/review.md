# Streamlined Artifact Release Review

## Release-Branch Candidate and Devel Continuation Revision

- Status: PASS — Oracle and Architect confirmed the revised release-train design.
- Scope: Phase 3–6 candidate/admission remap, Phase 7–8 renumbering, and target-trigger remap.
- User-confirmed decisions: candidates run on managed release-branch promotion PRs, not `devel`; Release Start has one active train through successful devel reconciliation; it advances `devel` through release alignment to `<next-stable>-devel`; `devel` is normally frozen, exceptional linear/squash PRs are recorded for replay, abandoned stable versions are burned, and reconciliation uses a retained backup ref plus lease-guarded history rewrite.
- Initial review findings incorporated: use `pull_request.head.sha`, not synthetic merge SHA; bind branch/PR/base/repository/train record and admission-time main first parent; reject untrusted write-capable PR execution; make all release-start/rewrite mutations resumable; require one active train through reconciliation; distinguish `R1` continuation base from mutable candidate head `Rk`; preserve only a recorded linear continuation list; reopen Phase 3–5 integration validation; remove candidate-time OCI creation.
- Final review evidence: Oracle and Architect passed the candidate binding, version reservation/burn, admission-time main-parent, one-train lock, continuation replay, and Phase 3–8 sequencing contracts. Remote-policy feasibility and implementation remain open plan work.

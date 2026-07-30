# 1.0.1-to-2.0.0 Release-History Evidence

_Baseline assembled 2026-07-30. It separates already released/completed work
from work planned by this track; it is the evidence input for the curated final
changelog, not itself a release announcement._

## Verified range

| Item | Evidence |
| --- | --- |
| 1.0.1 release point | `CHANGELOG.md:237-241` records 1.0.1 on 2024-03-13; commit `7f97c217b958bb8723d390d5d75336cf38361392` is titled `v1.0.1` and is dated 2024-03-13T11:38:48Z. |
| Current planning baseline | `db54d058fb4d71dca958272ca67fccff793a9970`, dated 2026-07-30T00:16:50Z, before this track's implementation branch was created. |
| Ancestry and scale | `7f97c217` is an ancestor of the baseline; `git rev-list --count 7f97c217..db54d058` returns 967 commits and the first-parent count is 271. |
| Public-package cross-check still required | The final changelog must recheck npm/package publication metadata before claiming publication dates or versions. This baseline does not create a git tag or release. |

## Curated historical milestones

| Date/period | Verified completed change evidence | Release-note treatment |
| --- | --- | --- |
| 2024-03 | Post-1.0.1 configuration, runner, topic, Kubernetes, and dependency fixes (`CHANGELOG.md:9-25`). | Summarize as maintenance after the 1.0.1 release. |
| 2024-10 to 2024-11 | Docker, Kubernetes, and process adapters split from STH; adapter-owned config and lazy Kubernetes loading (`CHANGELOG.md:35-60`). | Breaking/package-structure migration guidance. |
| 2025-02 to 2025-05 | RPC/API/storage work, adapters-common extraction, Node 22 support, local BPMux fork, and frame-stream addition (`CHANGELOG.md:73-142`). | Highlight feature and compatibility changes; do not claim independent upstream-package releases. |
| 2026-05 | Runner-node isolation, process executor, lifecycle/stream forwarding, and BDD runner-container support (`CHANGELOG.md:168-182`). | Highlight runtime deployment changes. |
| 2026-06 | Sequence-test and Zod config packages, Commander replacement, API v2, Verser2 topology, type split, runner scaffolding, and memory-safe tooling (`CHANGELOG.md:184-220`). | Major upgrade guidance and breaking-change section. |
| 2026-07 | Cleanup-roadmap outcomes, documentation ownership, Python contract docs, and BDD teardown hardening (`CHANGELOG.md:221-235`). | Documentation and reliability highlights. |

## Release-note candidates requiring explicit migration guidance

1. Adapter packages are now separate from `@scramjet/sth`
   (`CHANGELOG.md:39-42`).
2. Active legacy Verser/BPMux call sites were removed while standalone legacy
   packages remain buildable (`CHANGELOG.md:198`).
3. Commander was replaced with Scramjet-owned runtime option registries
   (`CHANGELOG.md:190-191`).
4. Lint/format tooling moved from ESLint/Prettier to Biome
   (`CHANGELOG.md:205-208`).
5. `@scramjet/types` is deprecated in favor of `@scramjet/runtime-types`,
   `@scramjet/sequence-types`, and `@scramjet/api-types`
   (`CHANGELOG.md:200`).
6. Manager and MultiManager are currently at 0.35.1 while the broader first-
   party set is largely 1.1.0 (`inventory.md`); the 2.0.0 alignment must not
   describe this as completed until the validator and package tests pass.

## Evidence constraints

- `CHANGELOG.md` labels `Pre-2.0.0` as a historical record, not an npm
  publication (`CHANGELOG.md:5-7`).
- The final changelog must cite repository evidence for completed changes and
  label this track's MIT conversion, version alignment, grants acknowledgment,
  and documentation work as planned until their respective phase validations
  pass.
- External npm and GitHub release facts require an up-to-date public-source
  check in the changelog phase rather than being inferred from local history.

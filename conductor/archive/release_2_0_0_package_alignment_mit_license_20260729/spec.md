# Release 2.0.0: Package Alignment, MIT Licensing, and Release Documentation

## Overview

Prepare a coherent 2.0.0 release for Scramjet-owned Transform Hub packages. The release will align the included package graph, migrate its distribution licensing to MIT under authorization already granted by Scramjet Sp. z o.o. as IP owner and authorized by its supervisory board, simplify and verify the release-alignment tooling, and publish complete release documentation.

## Scope

- Build an ownership and publishability inventory for the repository and identify the Scramjet-related packages included in the 2.0.0 release, explicitly including the independently released STH, CLI, Manager, and MultiManager packages plus their compatible first-party dependencies.
- Exclude legacy Verser packages and externally tracked or upstream-derived packages such as bpmux and frame-stream from the 2.0.0 version-alignment and license-conversion set unless a later written ownership decision expands scope.
- Treat the authorization for MIT conversion as obtained; no additional authorization-gathering or approval-recording task is part of this track.
- Apply MIT licensing consistently to every included package and its distributed artifacts, including manifest metadata, package license files/notices, and published package contents.
- Set every included package version to `2.0.0` and align all internal dependency, peer-dependency, optional-dependency, Docker image-tag, release metadata, and lockfile references that must resolve within that package set.
- Replace duplicated or fragile package/dependency/image alignment scripts with a documented, deterministic release-alignment workflow that validates the final package graph without changing excluded packages.
- Create a complete, curated 2.0.0 changelog covering material changes and important dates from the last public 1.0.1 release through the 2.0.0 release, including breaking changes, upgrade guidance, package changes, and acknowledgments where applicable.
- Convert the selected official Scramjet grants-page HTML to Markdown and add its verified wording using the page's NCBiR terminology, source attribution, and a manual checkpoint after conversion.
- Review the remaining legacy feature-request documentation, remove or archive items that are obsolete or completed, and retain or redirect material that remains actionable.
- Review completed or stale Conductor track material and registry entries, archiving or consolidating only records confirmed safe to move while preserving active tracks and their traceability.
- In the final documentation phase, run a stakeholder interview to decide the purpose, content, ownership, and update process for a new `roadmap.md`; create the file only if that interview reaches a documented decision to do so.

## Functional Requirements

1. The release inventory shall list included packages, excluded packages, their current versions/licenses, and the rationale for each exclusion.
2. The included package set shall publish as version `2.0.0` with valid internal package ranges and no unintended references to obsolete first-party versions.
3. Release scripts shall provide a single supported way to check and apply package/dependency/image alignment, be safe to rerun, and fail clearly on version or ownership-boundary violations.
4. The license conversion shall use the standard MIT text and correct copyright notices; excluded packages shall retain their existing licensing and version policies.
5. The grants acknowledgment shall be converted from the selected official HTML source to Markdown, distinguish historical release facts from future roadmap decisions, and shall not imply endorsement or funding claims beyond the verified source wording.
6. The changelog shall be traceable to repository and public-release history, identify significant dates, and provide migration notes for 2.0.0 consumers.

## Acceptance Criteria

- A reviewed package inventory demonstrates that STH, CLI, Manager, and MultiManager are included as separate release targets and that legacy Verser, bpmux, and frame-stream are excluded.
- All included package manifests and distributed package contents declare/include MIT licensing with the required copyright notices.
- All included packages and their internal references are aligned to `2.0.0`; excluded packages remain untouched unless an explicit scope decision authorizes a change.
- Alignment tooling has focused automated coverage or equivalent checked fixtures proving successful alignment, idempotence, and detection of version drift.
- The release build, focused alignment validation, and appropriate package/metadata checks pass without introducing dependency resolution errors.
- The grants acknowledgment is converted from the selected `https://scramjet.org/grants/` HTML source to Markdown, reproduces the source's NCBiR nomenclature where quoted, includes suitable attribution, and passes the requested manual checkpoint.
- The changelog contains a curated history from public 1.0.1 to 2.0.0 with important dates, package/release highlights, breaking changes, and migration guidance.
- Feature-request and completed-track cleanup preserves traceability; active tracks are not removed or altered as part of cleanup.
- The final stakeholder interview is recorded and determines whether a maintained `roadmap.md` is created and what it contains.

## Constraints and Risks

- MIT conversion applies only to the included Scramjet-owned package set; excluded packages retain their existing legal and release policies.
- Major version alignment must preserve valid dependency relationships for Manager, MultiManager, adapters, runners, and published consumers.
- The existing upstream identity and release history of excluded forks must not be overwritten by a fixed 2.0.0 policy.
- Historic documentation and Conductor records must be archived or linked rather than silently discarded when they retain audit or project value.

## Out of Scope

- Changing the runtime protocol, API behavior, or product features solely because of the 2.0.0 version number.
- Relicensing, versioning, or releasing legacy Verser, bpmux, frame-stream, or other excluded external/upstream packages.
- Creating roadmap content before the final stakeholder interview decides its scope and maintenance ownership.
- Claiming grant endorsements, altering grant facts, or copying material from non-authoritative sources.

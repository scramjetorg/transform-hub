# Release 2.0.0 Package Inventory

_Research reconciled: 2026-07-30. Repository evidence establishes first-party
workspace membership and track scope; it is not an independent legal ownership
opinion._

## Release boundary

The 2.0.0/MIT conversion candidate set contains first-party `@scramjet/*`
workspaces that support Transform Hub, including the separate STH, CLI, Manager,
and MultiManager release targets. The set is fixed by the track specification
and must not be expanded without a written scope decision.

| Package(s) | Current version(s) | Current license(s) | 2.0.0 / MIT disposition | Rationale |
| --- | --- | --- | --- | --- |
| `@scramjet/sth`, `@scramjet/cli` | 1.1.0 | AGPL-3.0 | Included | Explicit named release targets; both are published CLI surfaces. |
| `@scramjet/manager`, `@scramjet/multi-manager` | 0.35.1 | AGPL-3.0 | Included | Explicit named release targets. MultiManager presently depends on Manager `^0.35.1`, which must be aligned. |
| `@scramjet/host`, `@scramjet/pre-runner` | 1.1.0 | AGPL-3.0 | Included | First-party core runtime components; pre-runner also has a Docker image. |
| `@scramjet/runner`, `@scramjet/runner-node`, `@scramjet/runner-bun` | 1.1.0 | MIT | Included | First-party published/runtime wrapper components; retain MIT materials while aligning versions. |
| `@scramjet/api-client`, `@scramjet/client-utils`, `@scramjet/sequence-test` | 1.1.0 | MIT | Included | First-party published consumer/test packages. |
| `@scramjet/config`, `@scramjet/rest-api2`, `@scramjet/api-router`, `@scramjet/api-server` | 1.1.0 | AGPL-3.0 | Included | First-party configuration and API stack. |
| `@scramjet/api-types`, `@scramjet/runtime-types`, `@scramjet/sequence-types`, `@scramjet/types` | 1.1.0 | AGPL-3.0 | Included | First-party type packages; `types` remains the deprecated compatibility barrel. |
| `@scramjet/symbols`, `@scramjet/model`, `@scramjet/utility`, `@scramjet/telemetry` | 1.1.0 | AGPL-3.0, AGPL-3.0, ISC, ISC | Included | First-party shared packages. Utility and telemetry need MIT metadata/material conversion. |
| `@scramjet/adapters`, `@scramjet/adapters-common`, `@scramjet/adapter-docker`, `@scramjet/adapter-kubernetes`, `@scramjet/adapter-process` | 1.1.0 | AGPL-3.0 | Included | First-party adapter graph. |
| `@scramjet/load-check`, `@scramjet/monitoring-server`, `@scramjet/obj-logger`, `@scramjet/logger`, `@scramjet/module-loader` | 1.1.0 | AGPL-3.0 | Included | First-party support components. |
| `@scramjet/middleware-api-client`, `@scramjet/multi-manager-api-client` | 1.1.0 | AGPL-3.0 | Included | First-party clients for the Manager/MultiManager control planes. |
| `@scramjet/verser` | 1.1.0 | AGPL-3.0 | Excluded | Explicit legacy-Verser exclusion in the specification. Preserve its version and licensing policy. |
| `@scramjet/bpmux` | 9.0.0 | MIT | Excluded | Explicit upstream-derived exclusion; preserve existing David Halls attribution and version. |
| `@scramjet/frame-stream` | 5.0.0 | MIT | Excluded | Explicit upstream-derived exclusion; preserve existing upstream attribution and version. |
| `@scramjet/runner-python` | 2.0.0 | MIT | Included | Per user direction on 2026-07-30, it is a public npm release target with its own MIT notice and is consumed by the outer runner. |
| `scramjet-bdd` | 1.1.0 | ISC | Version/publish excluded; MIT licensing included | Test-only `bdd/` workspace, excluded from the publish workspace group. Per user direction on 2026-07-30, it receives MIT metadata and a notice without entering the 2.0.0 version/publish set. |

## Publishing, internal references, and image evidence

- Root `package.json` is private (`@scramjet/transform-hub` 1.1.0,
  AGPL-3.0); `packages/*` and `bdd/` are workspaces. The `modules` group is
  `packages/*`, while release packing excludes BDD.
- `pack:pub` calls `scripts/build-all.js -w '!bdd'`; `publish:dist` currently
  publishes every `dist/**/package.json`. `dist/package.json` lists the
  excluded Verser, bpmux, and frame-stream packages, so the new release
  workflow must explicitly prevent their accidental 2.0.0 publication.
- `packages/config/src/sth/image-config.ts` pins runner-related images to
  `1.1.0`. Dockerfiles also use dynamic commit tags; MultiManager uses
  `$npm_package_version`.
- Manager and MultiManager have the material internal reference
  `@scramjet/manager: ^0.35.1`; all included internal dependency, peer,
  optional-dependency, release metadata, and image references need a scoped
  2.0.0 validation.
- `@signicode/verser-*` packages and `scramjet` are external npm dependencies,
  not alignment or relicensing targets.

## Existing release tooling

| Path | Current behavior | Boundary risk |
| --- | --- | --- |
| `scripts/add-to-packages-json.js` | Generic field changes under `packages/**/package.json`. | Does not encode the release boundary. |
| `scripts/bump-dependencies-versions.sh` | Changes `@scramjet/*` dependency ranges and image config. | Does not exclude Verser/upstream packages. |
| `scripts/bump_docker_images.sh` | Updates image tags from root version. | Must be scoped to included release images. |
| `scripts/build-all.js`, `scripts/lib/pre-pack.js`, `scripts/publish.js` | Build/flat-pack/publish support. | Current publish glob can include excluded packages. |

## Required safeguards for the next phases

1. Keep `@scramjet/verser` at 1.1.0 and bpmux/frame-stream at 9.0.0/5.0.0;
   preserve their license files and manifest policies.
2. Make the supported alignment command validate both inclusion and exclusion
   boundaries before it writes. It must flag drift and excluded-package changes.
3. Verify license material in the packed contents of representative STH, CLI,
   Manager, and MultiManager packages.
4. Review stale repository URLs in Manager, MultiManager, monitoring-server,
   module-loader, middleware-api-client, and multi-manager-api-client as
   release metadata—not as evidence to alter the boundary automatically.

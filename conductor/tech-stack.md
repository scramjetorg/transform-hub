# Tech Stack

## Stack Summary

Scramjet Transform Hub is a TypeScript/Node.js monorepo with multiple packages for the hub, CLI, host, adapters, shared types, runtime launchers, runtime wrappers, and schema-aware API routing. It supports Transform Sequence execution through local process, Docker, and Kubernetes adapters, with Node.js and Python runtime support and active multi-runtime extension work.

## Languages and Runtimes

- **TypeScript**: Primary implementation language for hub, CLI, host, adapters, runner launcher, shared types, and most packages.
- **JavaScript**: Supported through TypeScript `allowJs` and as a runtime target for Node-based Transform Sequences.
- **Node.js**: Primary runtime for the hub and TypeScript/JavaScript packages.
- **Python**: Supported through the Python runtime wrapper and parity tests.
- **Bun**: Present as a runtime wrapper package and extension surface.

## Monorepo Structure

- **Package manager**: npm for agent-run commands in this environment.
- **Workspaces**: the npm-facing workspace set is an explicit first-party release package list. Legacy Verser/upstream packages, the private Python runner, and BDD remain outside that release-resolution set.
- **Workspace groups**: custom groups include broad modules, runners, BDD workflows, and an explicit release group used for release packing.
- **Primary package output**: built packages are emitted into `dist/`.

## TypeScript Configuration

- **Module format**: CommonJS.
- **Target**: ES2019.
- **Strictness**: strict mode enabled, `noImplicitAny`, `noUnusedLocals`, and consistent casing checks enabled.
- **Declarations**: Type declaration generation enabled.
- **Interop**: `esModuleInterop` and JSON module resolution enabled.

## Core Product Packages

- `packages/sth`: top-level host wrapper and CLI-facing startup façade.
- `packages/config`: Zod-backed config loading, validation, masking, option descriptors, native command descriptors, parser abstraction, STH/Manager configuration defaults, and merge behavior.
- `packages/host`: host lifecycle, API handling, local storage, and service behavior.
- `packages/api-router`: schema-aware route declaration, hook pipeline, HTTP/verser2 registration adapters, OpenAPI generation, schema-mode loading, and generic client transport contracts.
- `packages/rest-api2`: v2 REST API contracts, Zod schemas, handlerless route sets, and common v2 client surface.
- `packages/cli`: command-line client behavior and completion support.
- `packages/runtime-types`: runtime-neutral type foundation for AppContext, logger/storage primitives, runtime config, and protocol-neutral contracts.
- `packages/sequence-types`: sequence-author-facing AppContext and sequence application/function types; canonical import surface for sequence authors.
- `packages/api-types`: API/user-facing DTOs, REST contracts, APIExpose, client interface stubs, and strict API-specific AppContext aliases.
- `packages/types`: deprecated compatibility barrel preserving legacy shared type imports while new code uses the split packages.
- `packages/runner`: outer runner launcher and executor selection.
- `packages/runner-node`: Node runtime wrapper reference implementation.
- `packages/runner-python`: Python runtime wrapper implementation and parity reference.
- `packages/runner-bun`: Bun runtime wrapper surface.
- `packages/adapter-process`: local process adapter.
- `packages/adapter-docker`: Docker adapter.
- `packages/adapter-kubernetes`: Kubernetes adapter.
- `packages/adapters-common`: shared adapter utilities and sequence metadata handling.

## Infrastructure and Adapters

- **Process adapter**: runs sequences as local child processes.
- **Docker adapter**: stores and executes sequences in Docker containers and selects runner images.
- **Kubernetes adapter**: schedules runner pods and manages Kubernetes execution concerns.
- **Runner image selection**: handled through shared adapter logic and adapter-specific packages.

## Testing Stack

- **Unit/package tests**: AVA-style TypeScript specs run through `scripts/run-ava.js`; package sources are staged into a temporary sibling tree, compiled with TypeScript, linked to sibling packages, and removed after the run. The runner defaults to `--max-old-space-size=2048`, JIT with capped WASM resources, concurrency 2, and a 600000 ms runner timeout. AVA 8 worker-thread isolates reserve substantial virtual address space, so `test:runner` and memory-guard runs use child-process workers instead; the preload reports retained event-loop resources after tests complete and fails the worker immediately.
- **BDD tests**: Cucumber-based scenarios under `bdd/`. The supported entrypoint is `scripts/run-bdd.js` (Docker mode default for memory-constrained runs). Direct mode (`--mode=direct`) is diagnostic/local only. All exit paths include post-run leak detection for STH/Host/runner/Manager/MultiManager/cucumber processes.
- **Runner regression tests**: `npm run test:runner` covers AVA and BDD runner helper tests.
- **Coverage**: nyc/istanbul tooling.
- **Runtime parity tests**: used especially for runtime wrapper behavior.
- **API route/client tests**: package-level route-manifest, OpenAPI, generic-client, no-circumvention, and v1/v2 compatibility tests for migrated API surfaces.
- **Package-test command preference**: use `npm run test:packages` locally (j4, 3.5 GiB aggregate-RSS budget) and `npm run test:packages:ci` in GitHub (j2, 2.5 GiB aggregate-RSS budget). These are RSS budgets, not `ulimit -v` caps; phase-final remains serial.

## Build and Tooling

- **Build orchestration**: custom scripts under `scripts/`, including package builds and workspace script runners.
- **Release alignment**: `npm run release:align:check`, `npm run release:align:dry-run`, and `npm run release:align:apply` are the supported 2.0.0 package/dependency/image alignment commands. They share an explicit inclusion boundary, preserve excluded packages, and gate release publication.
- **Development entrypoint**: `npm run start:dev` for source-based hub startup.
- **Built entrypoint**: `npm run start` after package build output exists in `dist/`.
- **Linting/Formatting**: Biome is the active lint/format command surface during the migration from ESLint/Prettier. Use `npm run lint`, `npm run lint:quick`, `npm run lint:fix`, and `npm run format`; scripts set `RAYON_NUM_THREADS=12`, `lint` runs Biome linting, and formatting is explicit to avoid broad format churn. Do not run legacy ESLint commands unless a track explicitly re-enables them.
- **CI security policy**: GitHub Actions replacement work uses Gitleaks for redacted secret detection, Actionlint for workflow syntax, Zizmor for Actions security analysis, and a repository-specific deterministic policy checker. Tool releases, action revisions, and security images must be checksum/digest pinned; local Git-hook feedback is repository-managed, while protected CI is the enforcement boundary.
- **Docs**: generated documentation under `docs/` and package README files.
- **API routing**: `@scramjet/api-router` provides decorator and imperative route declaration, Zod-first validation, route hooks, OpenAPI 3.1 generation, schema-mode route loading, HTTP registration, verser2 registration, and generic client transports.
- **API contracts**: `@scramjet/rest-api2` provides v2 DTO contracts, Zod schemas, handlerless route sets, typed route binding, and the common v2 client surface.
- **Type contracts**: `@scramjet/runtime-types`, `@scramjet/sequence-types`, and `@scramjet/api-types` split runtime-neutral, sequence-author, and API/user contract ownership. `@scramjet/types` remains as a deprecated compatibility package.
- **Config validation**: Zod is used by `@scramjet/config` as the canonical validation and type inference layer for migrated config flows.
- **CLI parsing**: `cac` is used internally behind `@scramjet/config`; parser types must not leak into package public APIs.
- **Config file loading**: `@scramjet/config` supports JSON, YAML, and JSONC for migrated consumers.
- **Verser2 CLI transport**: `@scramjet/cli` uses `@signicode/verser2-guest-node` with file-backed mTLS profiles and shares API-router routed transport plus RestAPI2 contracts for native v2 and raw API calls; HTTP/v1 remains the separate compatibility path.

## Operational Dependencies

- Node.js/npm for development and package execution.
- Docker for Docker adapter behavior, runner images, and many BDD flows.
- A verified security-tool bootstrap for the pinned Gitleaks binary and a Git client for installing the repository-managed hooks.
- Kubernetes tooling/configuration for Kubernetes adapter execution.
- Python tooling for Python runtime wrapper development and tests.
- File-backed CA and client certificate/key or PKCS#12 material for mTLS CLI control-plane connections.

## Stack Guidance

- Document existing stack behavior before proposing changes.
- Prefer npm commands for agent-run operations in this repository.
- Avoid full Docker or BDD workflows unless required by a track.
- Keep runtime wrapper behavior protocol-compatible across supported languages.
- Keep adapter-specific behavior explicit when process, Docker, and Kubernetes differ.
- Keep parser and option-registration details behind Scramjet-owned descriptors instead of exposing third-party CLI parser APIs.
- Keep v2 API route contracts in `@scramjet/rest-api2`, runtime routing primitives in `@scramjet/api-router`, and v1 compatibility adapters covered by explicit v1 tests.

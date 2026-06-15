# Tech Stack

## Stack Summary

Scramjet Transform Hub is a TypeScript/Node.js monorepo with multiple packages for the hub, CLI, host, adapters, shared types, runtime launchers, and runtime wrappers. It supports Transform Sequence execution through local process, Docker, and Kubernetes adapters, with Node.js and Python runtime support and active multi-runtime extension work.

## Languages and Runtimes

- **TypeScript**: Primary implementation language for hub, CLI, host, adapters, runner launcher, shared types, and most packages.
- **JavaScript**: Supported through TypeScript `allowJs` and as a runtime target for Node-based Transform Sequences.
- **Node.js**: Primary runtime for the hub and TypeScript/JavaScript packages.
- **Python**: Supported through the Python runtime wrapper and parity tests.
- **Bun**: Present as a runtime wrapper package and extension surface.

## Monorepo Structure

- **Package manager**: npm for agent-run commands in this environment.
- **Workspaces**: `packages/*` and `bdd/`.
- **Workspace groups**: custom groups include modules, runners, and BDD workflows.
- **Primary package output**: built packages are emitted into `dist/`.

## TypeScript Configuration

- **Module format**: CommonJS.
- **Target**: ES2019.
- **Strictness**: strict mode enabled, `noImplicitAny`, `noUnusedLocals`, and consistent casing checks enabled.
- **Declarations**: Type declaration generation enabled.
- **Interop**: `esModuleInterop` and JSON module resolution enabled.

## Core Product Packages

- `packages/sth`: top-level host wrapper and CLI-facing startup façade.
- `packages/config`: Zod-backed config loading, validation, masking, option descriptors, native command descriptors, and parser abstraction.
- `packages/sth-config`: configuration defaults, image defaults, and merge behavior.
- `packages/host`: host lifecycle, API handling, local storage, and service behavior.
- `packages/cli`: command-line client behavior and completion support.
- `packages/types`: shared contracts, DTOs, config types, and runtime interfaces.
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

- **Unit/package tests**: AVA-style TypeScript specs using `ts-node/register`.
- **BDD tests**: Cucumber-based scenarios under `bdd/`.
- **Coverage**: nyc/istanbul tooling.
- **Runtime parity tests**: used especially for runtime wrapper behavior.
- **CI-safe command preference**: serial package tests via `npm run test:packages-no-concurrent` when needed.

## Build and Tooling

- **Build orchestration**: custom scripts under `scripts/`, including package builds and workspace script runners.
- **Development entrypoint**: `npm run start:dev` for source-based hub startup.
- **Built entrypoint**: `npm run start` after package build output exists in `dist/`.
- **Linting**: ESLint with TypeScript parser and project-wide rules.
- **Formatting**: Prettier with minimal configuration.
- **Docs**: generated documentation under `docs/` and package README files.
- **Config validation**: Zod is used by `@scramjet/config` as the canonical validation and type inference layer for migrated config flows.
- **CLI parsing**: `cac` is used internally behind `@scramjet/config`; parser types must not leak into package public APIs.
- **Config file loading**: `@scramjet/config` supports JSON, YAML, and JSONC for migrated consumers.

## Operational Dependencies

- Node.js/npm for development and package execution.
- Docker for Docker adapter behavior, runner images, and many BDD flows.
- Kubernetes tooling/configuration for Kubernetes adapter execution.
- Python tooling for Python runtime wrapper development and tests.

## Stack Guidance

- Document existing stack behavior before proposing changes.
- Prefer npm commands for agent-run operations in this repository.
- Avoid full Docker or BDD workflows unless required by a track.
- Keep runtime wrapper behavior protocol-compatible across supported languages.
- Keep adapter-specific behavior explicit when process, Docker, and Kubernetes differ.
- Keep parser and option-registration details behind Scramjet-owned descriptors instead of exposing third-party CLI parser APIs.

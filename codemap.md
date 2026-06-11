# Repository Atlas: Scramjet Transform Hub

## Project Responsibility

Scramjet Transform Hub is a TypeScript monorepo for supervising sequence deployment, execution, and monitoring across process, Docker, and Kubernetes runtime adapters. The repository combines the host-facing CLI/configuration packages, adapter implementations, shared symbols/type contracts, experimental sequence test harnesses, and runtime wrapper packages that execute Node, Bun, and Python sequences behind a common outer runner protocol.

## Root Assets

- `package.json`: Private workspace manifest for `packages/*` and `bdd/`, monorepo build/test scripts, published `scramjet-transform-hub` bin mapping to `dist/sth/bin/hub.js`, and runner workspace grouping.
- `package-lock.json`: npm lockfile for reproducible agent/CI installs; prefer npm commands for agent-run workflows.
- `tsconfig*.json`: TypeScript project references and strict CommonJS/ES2019 build configuration used by package builds.
- `scripts/`: Monorepo orchestration scripts for workspace builds, package script fan-out, Docker image checks, BDD wrappers, and generated assets.
- `AGENTS.md`: Agent operating notes, high-value commands, and repository map discovery instructions.
- `.slim/codemap.json`: Codemap state file used to detect additions, removals, and modifications for targeted atlas refreshes.

## System Entry Points

- `packages/sth/src/bin/hub.ts`: CLI bootstrap that parses flags, merges command options into STH configuration, selects the runtime adapter, and starts the host.
- `packages/sth-config/src/config-service.ts`: Configuration assembly layer that merges defaults, image config, adapter options, and public-safe config views.
- `packages/runner/src/bin/start-runner.ts`: Adapter-launched outer runner entrypoint that validates environment, writes boot config, selects a runtime executor, and connects host channels.
- `packages/runner/src/executor/select.ts`: Runtime executor strategy selection for Node, Bun, and Python child processes.
- `packages/adapter-docker/src/docker-sequence-adapter.ts`: Docker stored-sequence adapter and runner image/container orchestration.
- `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`: Kubernetes runner pod lifecycle and runtime image selection.
- `packages/symbols/src/runtime-kind.ts`: Canonical runtime-kind inference from sequence engine metadata, shared by adapters, runner selection, and tests.
- `packages/types/src/runtime-executor.ts`: Shared runtime executor contracts used by the outer runner and runtime-specific launchers.
- `packages/sequence-test/src/index.ts`: Experimental sequence testing harness API that composes fixtures, runner launch plans, fake instance transport, captures, and hub mocks.

## Repository Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `packages/types/` | Shared type package for CLI options, merged STH config, runtime executor contracts, and adapter-facing DTOs. | [View Map](packages/types/codemap.md) |
| `packages/types/src/` | Canonical configuration, adapter, and runtime-executor declarations shared across STH packages. | [View Map](packages/types/src/codemap.md) |
| `packages/symbols/` | Shared constants and protocol symbol package for message codes, statuses, stream states, headers, exit/error codes, and runtime-kind inference. | [View Map](packages/symbols/codemap.md) |
| `packages/symbols/src/` | Concrete enum/constant modules and runtime-kind helper exports used by host, runner, API, adapters, and type contracts. | [View Map](packages/symbols/src/codemap.md) |
| `packages/sth/` | Top-level STH wrapper that owns process-facing lifecycle around a configured host instance. | [View Map](packages/sth/codemap.md) |
| `packages/sth/src/` | Runtime wrapper code for starting STH from a configuration object. | [View Map](packages/sth/src/codemap.md) |
| `packages/sth/src/bin/` | CLI bootstrap that parses flags, builds `STHConfiguration`, selects the runtime adapter, and launches the host process. | [View Map](packages/sth/src/bin/codemap.md) |
| `packages/sth-config/` | STH configuration defaults, image defaults, deep-merge updates, and runtime-adapter selection. | [View Map](packages/sth-config/codemap.md) |
| `packages/sth-config/src/` | Config defaults, image defaults, merge/update semantics, adapter selection, and public config extraction. | [View Map](packages/sth-config/src/codemap.md) |
| `packages/runner/` | Outer runtime launcher for adapter-launched sequences; validates env, writes boot config, opens host transport, and selects Bun/Node/Python child runtimes. | [View Map](packages/runner/codemap.md) |
| `packages/runner/src/` | Runner launcher and runtime-executor plumbing for outer startup, host client mediation, runtime selection, and child-process helpers. | [View Map](packages/runner/src/codemap.md) |
| `packages/runner/src/bin/` | Outer runner entrypoint for adapter env validation, boot config writing, child runtime selection, and host stdio/control/monitoring streams. | [View Map](packages/runner/src/bin/codemap.md) |
| `packages/runner/src/executor/` | Child-process runtime executors and launch helpers for Node, Bun, and Python. | [View Map](packages/runner/src/executor/codemap.md) |
| `packages/runner-node/` | Node sequence runtime that owns boot-config parsing, host channel setup, lifecycle control, and sequence execution. | [View Map](packages/runner-node/codemap.md) |
| `packages/runner-node/src/` | Core Node runtime implementation: boot config, fd streams, host client, contexts, handshake, lifecycle, and sequence execution. | [View Map](packages/runner-node/src/codemap.md) |
| `packages/runner-node/src/bin/` | Executable entrypoint for the Node runtime. | [View Map](packages/runner-node/src/bin/codemap.md) |
| `packages/runner-bun/` | Bun sequence runtime wrapper for boot-config validation, optional direct execution, and Node runtime delegation when needed. | [View Map](packages/runner-bun/codemap.md) |
| `packages/runner-bun/src/` | Bun runtime helpers for boot config parsing/validation, runtime constants, and bootstrap delegation logic. | [View Map](packages/runner-bun/src/codemap.md) |
| `packages/runner-bun/src/bin/` | Executable Bun runtime entrypoint that loads boot config and either executes locally or hands off to Node runtime bootstrap. | [View Map](packages/runner-bun/src/bin/codemap.md) |
| `packages/runner-python/` | Python sequence runtime and parity reference for host-channel connection, control/monitoring codecs, context, lifecycle, and sequence loading. | [View Map](packages/runner-python/codemap.md) |
| `packages/sequence-test/` | Experimental sequence testing harness for exercising runner protocol paths with fixtures, fake instance transport, hub mocks, captures, and assertions. | [View Map](packages/sequence-test/codemap.md) |
| `packages/sequence-test/src/` | Implementation layer for test harness primitives: runner launch plans, fake transport, hub simulation, fixtures, captures, input drivers, and request helpers. | [View Map](packages/sequence-test/src/codemap.md) |
| `packages/adapters-common/` | Shared adapter helpers for stored-sequence metadata loading, language detection, and runner env shaping. | [View Map](packages/adapters-common/codemap.md) |
| `packages/adapters-common/src/` | Implementation of runner env generation, sequence package validation, and stored-sequence config reconstruction. | [View Map](packages/adapters-common/src/codemap.md) |
| `packages/adapter-docker/` | Docker adapter package for stored-sequence identification, runner container execution, config augmentation, and network bootstrap. | [View Map](packages/adapter-docker/codemap.md) |
| `packages/adapter-docker/src/` | Docker-based sequence discovery, runner container orchestration, helper utilities, and Docker networking setup. | [View Map](packages/adapter-docker/src/codemap.md) |
| `packages/adapter-kubernetes/` | Kubernetes adapter package for sequence storage, runner pod execution, CLI/config augmentation, and client initialization. | [View Map](packages/adapter-kubernetes/codemap.md) |
| `packages/adapter-kubernetes/src/` | Kubernetes sequence persistence, runner pod lifecycle management, config decoding, and Kubernetes client access. | [View Map](packages/adapter-kubernetes/src/codemap.md) |
| `packages/adapter-process/` | Process adapter runtime package bridging host-side adapter contracts to process-based execution and packaging. | [View Map](packages/adapter-process/codemap.md) |
| `packages/api-server/src/` | API server runtime surface for request routing, middleware wrapping, forwarding, and HTTP/HTTPS server setup. | [View Map](packages/api-server/src/codemap.md) |
| `packages/host/src/lib/` | Shared host-side library code for service discovery and low-level utilities. | [View Map](packages/host/src/lib/codemap.md) |
| `packages/utility/src/file/` | File abstraction helpers that choose concrete file implementations by extension. | [View Map](packages/utility/src/file/codemap.md) |

## Runtime Wrapper Implementation Flow

1. CLI/config code in `packages/sth` and `packages/sth-config` builds adapter configuration, including runner image names and runtime defaults.
2. Docker/Kubernetes/process adapters inspect stored sequence metadata through `packages/adapters-common`, use `packages/symbols` runtime-kind semantics, and choose a runtime-specific runner image or process executor path.
3. The selected adapter still launches `packages/runner/src/bin/start-runner.ts` as the outer runner.
4. The outer runner writes a boot-config file, selects an executor via `selectExecutor()`, resolves the runtime wrapper entry, and spawns the child process with the fixed fd layout.
5. Runtime wrapper packages (`runner-node`, `runner-bun`, and `runner-python`) consume the same boot config protocol and report lifecycle/monitoring over the same channels.
6. `packages/sequence-test` can exercise portions of this protocol through generated fixtures, fake instance channels, captures, and hub mocks; it remains experimental and is not the default package testing strategy.

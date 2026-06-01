# Repository Atlas: Scramjet Transform Hub

## Project Responsibility

Scramjet Transform Hub is a TypeScript monorepo for supervising sequence deployment, execution, and monitoring across process, Docker, and Kubernetes runtime adapters. The active implementation surface for the Bun runner wrapper spans shared runtime types, the outer runner launcher, Node/Python runtime wrappers used as parity references, configuration assembly, CLI flags, and adapter image selection.

## System Entry Points

- `package.json`: Monorepo manifest, workspace scripts, build/test orchestration, and published `scramjet-transform-hub` bin mapping.
- `packages/sth/src/bin/hub.ts`: CLI bootstrap that merges command options into STH configuration and starts the host.
- `packages/sth-config/src/config-service.ts`: Default/image config merge layer used before host startup.
- `packages/runner/src/bin/start-runner.ts`: Adapter-launched outer runner entrypoint that writes boot config and spawns the runtime executor.
- `packages/runner/src/executor/select.ts`: Runtime executor strategy selection.
- `packages/adapter-docker/src/docker-sequence-adapter.ts`: Docker runner image selection for stored sequences.
- `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`: Kubernetes runner pod image selection.

## Repository Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `packages/types/` | Shared type surface for STH configuration, command options, adapter contracts, runtime executor contracts, and cross-package DTOs. | [View Map](packages/types/codemap.md) |
| `packages/types/src/` | Canonical TypeScript declarations consumed by config, host, runner, CLI, and adapter packages. | [View Map](packages/types/src/codemap.md) |
| `packages/runner/` | Outer launcher that validates adapter env, writes boot config, connects to host, and spawns runtime-specific child processes. | [View Map](packages/runner/codemap.md) |
| `packages/runner/src/` | Host/executor mediation, local storage agent, and runner runtime plumbing. | [View Map](packages/runner/src/codemap.md) |
| `packages/runner/src/bin/` | Process entrypoint for outer runner boot, channel setup, child spawn, and exit propagation. | [View Map](packages/runner/src/bin/codemap.md) |
| `packages/runner/src/executor/` | Strategy-based runtime executor selection and child-process wiring. | [View Map](packages/runner/src/executor/codemap.md) |
| `packages/runner-node/` | Node runtime wrapper used as the protocol-compatible reference for JavaScript/TypeScript sequence execution. | [View Map](packages/runner-node/codemap.md) |
| `packages/runner-node/src/bin/` | Node runtime entrypoint and bootstrap lifecycle. | [View Map](packages/runner-node/src/bin/codemap.md) |
| `packages/runner-python/` | Python runtime wrapper and Docker/runtime parity reference for non-Node executor behavior. | [View Map](packages/runner-python/codemap.md) |
| `packages/sth-config/` | Central configuration assembly layer with defaults, image defaults, deep merge, and adapter config selection. | [View Map](packages/sth-config/codemap.md) |
| `packages/sth-config/src/` | Default config, image config, and config service implementation. | [View Map](packages/sth-config/src/codemap.md) |
| `packages/sth/` | Top-level host wrapper package and CLI-facing STH startup façade. | [View Map](packages/sth/codemap.md) |
| `packages/sth/src/bin/` | CLI option parsing and config-to-host boot flow. | [View Map](packages/sth/src/bin/codemap.md) |
| `packages/adapters-common/` | Shared sequence metadata, language detection, package validation, and runner env utilities for adapters. | [View Map](packages/adapters-common/codemap.md) |
| `packages/adapter-docker/` | Docker-backed sequence identification and instance execution, including runner image selection. | [View Map](packages/adapter-docker/codemap.md) |
| `packages/adapter-docker/src/` | Dockerode helper integration, container/volume/network flow, and sequence runner container setup. | [View Map](packages/adapter-docker/src/codemap.md) |
| `packages/adapter-kubernetes/` | Kubernetes-backed sequence storage and runner pod execution, including config decoding and image selection. | [View Map](packages/adapter-kubernetes/codemap.md) |
| `packages/adapter-kubernetes/src/` | Kubernetes client wrapping, pod lifecycle, quota checks, config decoder, and runner image selection. | [View Map](packages/adapter-kubernetes/src/codemap.md) |

## Runtime Wrapper Implementation Flow

1. CLI/config code in `packages/sth` and `packages/sth-config` builds adapter configuration, including runner image names.
2. Docker/Kubernetes adapters inspect sequence `package.json` engines through `packages/adapters-common` and choose the correct runner image.
3. The selected image still launches `packages/runner/src/bin/start-runner.ts` as the outer runner.
4. The outer runner writes a boot-config file, selects an executor via `selectExecutor()`, resolves the runtime wrapper entry, and spawns the child process with the fixed fd layout.
5. Runtime wrapper packages (`runner-node`, `runner-python`, and planned `runner-bun`) consume the same boot config protocol and report lifecycle/monitoring back over the same channels.

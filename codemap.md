# Repository Atlas: Scramjet Transform Hub

## Project Responsibility

Scramjet Transform Hub is a TypeScript monorepo for supervising sequence deployment, execution, and monitoring across process, Docker, and Kubernetes runtime adapters. The repository combines the host-facing CLI/configuration packages, adapter implementations, shared symbols/type contracts, sequence test harnesses (scoped local fixture/harness validation), and runtime wrapper packages that execute Node, Bun, and Python sequences behind a common outer runner protocol.

## Root Assets

- `package.json`: Private workspace manifest for `packages/*` and `bdd/`, monorepo build/test scripts, published `scramjet-transform-hub` bin mapping to `dist/sth/bin/hub.js`, and runner workspace grouping.
- `package-lock.json`: npm lockfile for reproducible agent/CI installs; prefer npm commands for agent-run workflows.
- `tsconfig*.json`: TypeScript project references and strict CommonJS/ES2019 build configuration used by package builds.
- `scripts/`: Monorepo orchestration scripts for workspace builds, package script fan-out, Docker image checks, BDD wrappers, generated assets, AVA runtime wrapping, and codemap staleness reporting.
- `AGENTS.md`: Agent operating notes, high-value commands, and repository map discovery instructions.
- `.slim/codemap.json`: Codemap state file used to detect additions, removals, and modifications for targeted atlas refreshes.

## System Entry Points

- `packages/sth/src/bin/hub.ts`: CLI bootstrap that parses flags, merges command options into STH configuration, selects the runtime adapter, and starts the host.
- `packages/sth-config/src/config-service.ts`: Configuration assembly layer that merges defaults, image config, adapter options, Verser2 defaults, trust bootstrap, and public-safe config views.
- `packages/host/src/lib/host-id.ts`: Stable Host identity derivation used to register runner Verser2 hosts without colliding across MultiManager-controlled hubs.
- `packages/runner/src/bin/start-runner.ts`: Adapter-launched outer runner entrypoint that validates environment, writes boot config, selects a runtime executor, and connects host channels.
- `packages/runner/src/executor/select.ts`: Runtime executor strategy selection for Node, Bun, and Python child processes.
- `packages/adapter-docker/src/docker-sequence-adapter.ts`: Docker stored-sequence adapter and runner image/container orchestration.
- `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`: Kubernetes runner pod lifecycle and runtime image selection.
- `packages/symbols/src/runtime-kind.ts`: Canonical runtime-kind inference from sequence engine metadata, shared by adapters, runner selection, and tests.
- `packages/types/src/runtime-executor.ts`: Shared runtime executor contracts used by the outer runner and runtime-specific launchers (also re-exported from `@scramjet/runtime-types`).
- `packages/sequence-test/src/index.ts`: Sequence testing harness API (scoped local fixture/harness validation) that composes fixtures, runner launch plans, fake instance transport, captures, and hub mocks.
- `packages/runtime-types/src/index.ts`: Foundation layer of the typings split — `BaseAppContext`, runtime-neutral logger/storage/error types.
- `packages/sequence-types/src/index.ts`: Sequence-author-facing types — `SequenceAppContext`, application/function entrypoint types.
- `packages/api-types/src/index.ts`: API/user-facing type contracts — REST DTOs, `APIExpose`, `StrictAppContext`, client stubs.

## Repository Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `packages/` | Monorepo workspace directory index for all 42 `@scramjet/*` packages including adapters, runners, API clients, config, types, utilities, manager, and split type packages. | [View Map](packages/codemap.md) |
| `packages/runtime-types/` | Generic low-level runtime-neutral types: BaseAppContext, logger/storage interfaces, runner configs. Foundation of the typings split. | [View Map](packages/runtime-types/codemap.md) |
| `packages/sequence-types/` | Sequence-author-facing frozen AppContext API and application/function types. Canonical import for sequence authors. | [View Map](packages/sequence-types/codemap.md) |
| `packages/api-types/` | API/user-facing type contracts: REST DTOs, APIExpose, client stubs, and StrictAppContext. | [View Map](packages/api-types/codemap.md) |
| `packages/types/` | [DEPRECATED] Compatibility re-export package for `@scramjet/types`. New code should import from `@scramjet/runtime-types`, `@scramjet/sequence-types`, or `@scramjet/api-types`. | [View Map](packages/types/codemap.md) |
| `packages/types/src/` | Canonical configuration, adapter, and runtime-executor declarations shared across STH packages. | [View Map](packages/types/src/codemap.md) |
| `packages/types/src/manager/` | Manager-facing type contracts for STH connection lifecycle, service discovery, topic-based actor registration, and host/sequence/instance info tracking. | [View Map](packages/types/src/manager/codemap.md) |
| `packages/symbols/` | Shared constants and protocol symbol package for message codes, statuses, stream states, headers, exit/error codes, and runtime-kind inference. | [View Map](packages/symbols/codemap.md) |
| `packages/symbols/src/` | Concrete enum/constant modules and runtime-kind helper exports used by host, runner, API, adapters, and type contracts. | [View Map](packages/symbols/src/codemap.md) |
| `packages/sth/` | Top-level STH wrapper that owns process-facing lifecycle around a configured host instance. | [View Map](packages/sth/codemap.md) |
| `packages/sth/src/` | Runtime wrapper code for starting STH from a configuration object. | [View Map](packages/sth/src/codemap.md) |
| `packages/sth/src/bin/` | CLI bootstrap that parses flags, builds `STHConfiguration`, selects the runtime adapter, and launches the host process. | [View Map](packages/sth/src/bin/codemap.md) |
| `packages/sth-config/` | STH configuration defaults, image defaults, deep-merge updates, and runtime-adapter selection. | [View Map](packages/sth-config/codemap.md) |
| `packages/sth-config/src/` | Config defaults, image defaults, merge/update semantics, adapter selection, and public config extraction. | [View Map](packages/sth-config/src/codemap.md) |
| `packages/config/` | Zod-backed configuration loading, validation, secret masking, CLI option descriptors, and native command model utilities. | [View Map](packages/config/codemap.md) |
| `packages/config/src/` | Config file/env/CLI merge pipeline, public-safe masking helpers, and descriptor-driven command tree implementation. | [View Map](packages/config/src/codemap.md) |
| `packages/manager-config/` | Manager default configuration and singleton config service for deep-merge runtime updates. | [View Map](packages/manager-config/codemap.md) |
| `packages/manager-config/src/` | Manager default config values, `ConfigService` singleton with deep-merge partial updates, and immutable defaults factory. | [View Map](packages/manager-config/src/codemap.md) |
| `packages/manager/` | Manager control plane for connected STH nodes, cluster API routing, sequence/instance/topic registry, and storage proxying. | [View Map](packages/manager/codemap.md) |
| `packages/manager/src/` | Manager source entrypoints and library modules for orchestration, STH controllers, service discovery, storage routers, and transport helpers. | [View Map](packages/manager/src/codemap.md) |
| `packages/manager/src/bin/` | Manager executable entrypoint that starts the Manager process and reports startup failures. | [View Map](packages/manager/src/bin/codemap.md) |
| `packages/manager/src/lib/` | Core Manager orchestration layer for REST routes, STH connection lifecycle, health/audit/log streams, and verser2 transport abstraction. | [View Map](packages/manager/src/lib/codemap.md) |
| `packages/manager/src/lib/storage-routers/` | Disk and S3 sequence storage proxy routers with shared upload, retrieval, deletion, and sequence identification flow. | [View Map](packages/manager/src/lib/storage-routers/codemap.md) |
| `packages/multi-manager/` | MultiManager control plane for sub-Manager lifecycle, API proxying, Verser host routing, audit/log aggregation, and health monitoring. | [View Map](packages/multi-manager/codemap.md) |
| `packages/multi-manager/src/` | MultiManager source entrypoints split across CLI startup, config classes, core orchestration, and public type definitions. | [View Map](packages/multi-manager/src/codemap.md) |
| `packages/multi-manager/src/bin/` | MultiManager CLI entrypoint for parsing options, building config, creating the API server, and starting orchestration. | [View Map](packages/multi-manager/src/bin/codemap.md) |
| `packages/multi-manager/src/config/` | MultiManager configuration merge and validation classes for defaults, JSON config, CLI values, and server sub-config. | [View Map](packages/multi-manager/src/config/codemap.md) |
| `packages/multi-manager/src/lib/` | MultiManager orchestration layer for sub-manager stores, MultiHost controllers, auditor aggregation, and ports parsing. | [View Map](packages/multi-manager/src/lib/codemap.md) |
| `packages/multi-manager/src/types/` | MultiManager option, command, server, and start-manager request type contracts. | [View Map](packages/multi-manager/src/types/codemap.md) |
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
| `packages/sequence-test/` | Supported sequence testing harness for scoped local fixture/hub-harness/AppContext validation with fixtures, fake instance transport, hub mocks, captures, and assertions (not a full Hub/runner parity replacement). | [View Map](packages/sequence-test/codemap.md) |
| `packages/sequence-test/src/` | Implementation layer for test harness primitives: runner launch plans, fake transport, hub simulation, fixtures, captures, input drivers, and request helpers. | [View Map](packages/sequence-test/src/codemap.md) |
| `packages/adapters-common/` | Shared adapter helpers for stored-sequence metadata loading, language detection, and runner env shaping. | [View Map](packages/adapters-common/codemap.md) |
| `packages/adapters-common/src/` | Implementation of runner env generation, sequence package validation, and stored-sequence config reconstruction. | [View Map](packages/adapters-common/src/codemap.md) |
| `packages/adapter-docker/` | Docker adapter package for stored-sequence identification, runner container execution, config augmentation, and network bootstrap. | [View Map](packages/adapter-docker/codemap.md) |
| `packages/adapter-docker/src/` | Docker-based sequence discovery, runner container orchestration, helper utilities, and Docker networking setup. | [View Map](packages/adapter-docker/src/codemap.md) |
| `packages/adapter-kubernetes/` | Kubernetes adapter package for sequence storage, runner pod execution, CLI/config augmentation, and client initialization. | [View Map](packages/adapter-kubernetes/codemap.md) |
| `packages/adapter-kubernetes/src/` | Kubernetes sequence persistence, runner pod lifecycle management, config decoding, and Kubernetes client access. | [View Map](packages/adapter-kubernetes/src/codemap.md) |
| `packages/adapter-process/` | Process adapter runtime package bridging host-side adapter contracts to process-based execution and packaging. | [View Map](packages/adapter-process/codemap.md) |
| `packages/api-server/` | HTTP API server package for router construction, server setup, REST/stream handlers, middleware, and routed forwarding. | [View Map](packages/api-server/codemap.md) |
| `packages/api-server/src/` | API server runtime surface for request routing, middleware wrapping, forwarding, and HTTP/HTTPS server setup. | [View Map](packages/api-server/src/codemap.md) |
| `packages/api-client/` | Typed HTTP API client classes for Host, Instance, Sequence, and Manager REST endpoints. | [View Map](packages/api-client/codemap.md) |
| `packages/client-utils/` | Base HTTP client utilities and abstractions for REST API communication with Node.js and browser support. | [View Map](packages/client-utils/codemap.md) |
| `packages/load-check/` | System resource monitoring — CPU load, memory, disk space health checks and load stats for instance scheduling. | [View Map](packages/load-check/codemap.md) |
| `packages/load-check/src/` | `LoadCheck` class and composable health component functions for process/OS resource diagnostics. | [View Map](packages/load-check/src/codemap.md) |
| `packages/logger/` | Console Web API-compatible logger with streaming output, colorized formatting, and reference-counted stream registration. | [View Map](packages/logger/codemap.md) |
| `packages/middleware-api-client/` | Middleware API client for space-level Manager routing through the Middleware layer. | [View Map](packages/middleware-api-client/codemap.md) |
| `packages/multi-manager-api-client/` | MultiManager API client for starting and managing sub-Managers through the MultiManager control plane. | [View Map](packages/multi-manager-api-client/codemap.md) |
| `packages/model/` | Domain model — message serialization, stream handler protocol, error types, ID provider, and delayed stream utility. | [View Map](packages/model/codemap.md) |
| `packages/model/src/` | Stream handler implementation, message serialization/deserialization, error hierarchy, and utility classes. | [View Map](packages/model/src/codemap.md) |
| `packages/module-loader/` | Runtime module loading utility supporting dynamic import() and require() with memory tracking. | [View Map](packages/module-loader/codemap.md) |
| `packages/monitoring-server/` | Lightweight HTTP health-check server with configurable check functions and path validation. | [View Map](packages/monitoring-server/codemap.md) |
| `packages/obj-logger/` | Object-mode structured logger with pipeable stream output, log level control, multi-target support, and source aggregation. | [View Map](packages/obj-logger/codemap.md) |
| `packages/obj-logger/src/` | `ObjLogger` class implementation with fallthrough log levels, stream plumbing, and pretty-print utilities. | [View Map](packages/obj-logger/src/codemap.md) |
| `packages/utility/` | Shared utility functions — merge, defer, typeguards, validators, URL normalization, stream helpers, typed emitter, and reference counting. | [View Map](packages/utility/codemap.md) |
| `packages/utility/src/` | Implementation of all shared utility modules: deferred promises, deep merge, type guards, stream utilities, free port finding, and key generation. | [View Map](packages/utility/src/codemap.md) |
| `packages/utility/src/typeguards/` | Runtime type-checking functions for DTO validation, URL/path/port/id validation, and log level checking. | [View Map](packages/utility/src/typeguards/codemap.md) |
| `packages/utility/src/typeguards/dto/` | DTO-specific type guard functions for sequence start and instance set endpoint payload validation. | [View Map](packages/utility/src/typeguards/dto/codemap.md) |
| `packages/utility/src/file/` | File abstraction helpers that choose concrete file implementations by extension. | [View Map](packages/utility/src/file/codemap.md) |
| `packages/host/src/lib/` | Shared host-side library code for host identity derivation, API controllers, service discovery, runner transport, audit middleware, and low-level utilities. | [View Map](packages/host/src/lib/codemap.md) |
| `packages/host/src/lib/api/` | Host v1/v2 API handlers that bind legacy APIExpose routes and typed RestAPI2 routers to host runtime controllers. | [View Map](packages/host/src/lib/api/codemap.md) |
| `packages/host/src/lib/middlewares/` | Host API middleware modules, currently audit lifecycle/byte-count tracking around request streams. | [View Map](packages/host/src/lib/middlewares/codemap.md) |
| `packages/host/src/lib/serviceDiscovery/` | Topic-based service discovery facade, routers, topic stream transforms, and topic-id validation utilities. | [View Map](packages/host/src/lib/serviceDiscovery/codemap.md) |
| `packages/verser/` | Legacy CONNECT/BPMux reverse-server connectivity package targeted for removal from active paths by the verser2 rollout. | [View Map](packages/verser/codemap.md) |
| `packages/verser/src/` | Source implementation of Verser server, client, and connection modules with BPMux multiplexing. | [View Map](packages/verser/src/codemap.md) |
| `packages/verser/src/lib/` | Concrete Verser, VerserClient, and VerserConnection class implementations with default config. | [View Map](packages/verser/src/lib/codemap.md) |
| `template/` | Package template/scaffold with standard AVA, TypeScript, and typedoc configuration for bootstrapping new packages. | [View Map](template/codemap.md) |
| `bdd/` | Cucumber BDD smoke and end-to-end validation workspace for CLI, hub, Manager, instance API, runtime, and streaming behavior. | [View Map](bdd/codemap.md) |

## Runtime Wrapper Implementation Flow

1. CLI/config code in `packages/sth` and `packages/sth-config` builds adapter configuration, including runner image names and runtime defaults.
2. Host startup derives a stable runner Verser2 host identity from explicit config, hub id, or endpoint metadata before registering with Manager/MultiManager control planes.
3. Docker/Kubernetes/process adapters inspect stored sequence metadata through `packages/adapters-common`, use `packages/symbols` runtime-kind semantics, and choose a runtime-specific runner image or process executor path.
4. The selected adapter still launches `packages/runner/src/bin/start-runner.ts` as the outer runner.
5. The outer runner writes a boot-config file, selects an executor via `selectExecutor()`, resolves the runtime wrapper entry, and spawns the child process with the fixed fd layout.
6. Runtime wrapper packages (`runner-node`, `runner-bun`, and `runner-python`) consume the same boot config protocol and report lifecycle/monitoring over the same channels.
7. `packages/sequence-test` provides fixtures, fake instance channels, captures, and hub mocks for scoped local fixture/harness/AppContext validation; it is supported for this scope and is not the default package testing strategy for other concerns.

## Codemap Maintenance Flow

1. `.slim/codemap.json` stores the file/folder hash state for the codemap skill.
2. `scripts/codemap-staleness.mjs` compares codemap creation/update commits with the latest non-codemap commit in each mapped folder.
3. Stale folder maps are refreshed in place, then `node ~/.config/opencode/skills/codemap/scripts/codemap.mjs update --root ./` records the new content hashes.

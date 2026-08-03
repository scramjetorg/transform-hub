# packages/

## Responsibility

Monorepo workspace directory containing all Scramjet Transform Hub packages under `@scramjet/*` scope. Each subdirectory is an independent npm package with its own `package.json`, build config, tests, and package-local codemap. Managed via npm workspaces declared in the root `package.json`, with custom workspace groups (`modules`, `runners`, `bdd`). Recent package maps also document package-specific AVA runtime modes used to keep WebAssembly-sensitive suites inside the repository memory cap.

## Directory Index

| Package | Responsibility | Map |
|---------|---------------|------|
| `adapter-docker/` | Docker stored-sequence adapter and runner image/container orchestration. | [View](adapter-docker/codemap.md) |
| `api-types/` | API/user-facing type contracts: REST DTOs, APIExpose, client stubs, config types, and strict AppContext aliases. Split from `@scramjet/types`. | [View](api-types/codemap.md) |
| `adapter-kubernetes/` | Kubernetes sequence persistence, runner pod lifecycle management, config decoding, and client access. | [View](adapter-kubernetes/codemap.md) |
| `adapter-process/` | Process adapter runtime bridging host-side adapter contracts to process-based execution. | [View](adapter-process/codemap.md) |
| `adapters/` | Adapter selector and host-side runtime adapter abstraction layer. | [View](adapters/codemap.md) |
| `adapters-common/` | Shared adapter helpers for stored-sequence metadata loading, language detection, and runner env shaping. | [View](adapters-common/codemap.md) |
| `api-client/` | Dual v1/v2 HTTP API clients plus factory helpers for Host, Instance, Sequence, Space, and Manager endpoints. | [View](api-client/codemap.md) |
| `api-router/` | Typed API router, validation, hook pipeline, decorator API, OpenAPI output, and generated client/server bindings. | [View](api-router/codemap.md) |
| `api-server/` | HTTP API server for router construction, server setup, REST/stream handlers, middleware, routed forwarding, and no-jitless AVA coverage. | [View](api-server/codemap.md) |
| `cli/` | CLI tool for interacting with STH and Manager deployments. | [View](cli/codemap.md) |
| `client-utils/` | Base HTTP client utilities and abstractions for REST API communication. | [View](client-utils/codemap.md) |
| `config/` | Zod-backed configuration loading, validation, secret masking, CLI option descriptors, and Verser2 config schemas. | [View](config/codemap.md) |
| `host/` | Core host implementation — stable runner host identity, sequence lifecycle, instance management, service discovery, and API controllers. | [View](host/codemap.md) |
| `load-check/` | System resource monitoring, load checking, and health summary generation. | [View](load-check/codemap.md) |
| `logger/` | Console Web API-compatible logger with streaming output support. | [View](logger/codemap.md) |
| `manager/` | Manager control plane for connected STH nodes, metadata-rich hub inventory, cluster API routing, and registry. | [View](manager/codemap.md) |
| `middleware-api-client/` | Middleware API client for space-level Manager routing through the Middleware layer. | [View](middleware-api-client/codemap.md) |
| `model/` | Domain model classes — stream handler, message serialization, error types, ID provider. | [View](model/codemap.md) |
| `module-loader/` | Runtime module loading utility (import/require) with memory tracking. | [View](module-loader/codemap.md) |
| `monitoring-server/` | Lightweight HTTP health-check server with configurable check functions. | [View](monitoring-server/codemap.md) |
| `multi-manager/` | MultiManager control plane for sub-Manager lifecycle, API proxying, and health monitoring. | [View](multi-manager/codemap.md) |
| `multi-manager-api-client/` | MultiManager API client for starting and managing sub-Managers. | [View](multi-manager-api-client/codemap.md) |
| `obj-logger/` | Object-mode structured logger with pipeable stream output and log level control. | [View](obj-logger/codemap.md) |
| `rest-api2/` | Second-generation typed REST API contracts, fluent route sets, schemas, and client builders. | [View](rest-api2/codemap.md) |
| `runtime-types/` | Generic low-level runtime-neutral types: BaseAppContext, logger/storage interfaces, error types, function/stream primitives, runner configs. Foundation layer of the typings split. | [View](runtime-types/codemap.md) |
| `runner/` | Outer runtime launcher for adapter-launched sequences; validates env, selects Bun/Node/Python child runtimes, and runs fetch-disabled AVA under jitless. | [View](runner/codemap.md) |
| `runner-bun/` | Bun sequence runtime wrapper for boot-config validation and delegated execution. | [View](runner-bun/codemap.md) |
| `runner-node/` | Node sequence runtime: boot-config parsing, host channel setup, lifecycle, and sequence execution. | [View](runner-node/codemap.md) |
| `runner-python/` | Python sequence runtime and parity reference for host-channel connection. | [View](runner-python/codemap.md) |
| `sequence-test/` | Supported sequence testing harness for scoped local fixture/hub-harness/AppContext validation (not full Hub/runner parity replacement). | [View](sequence-test/codemap.md) |
| `sequence-types/` | Sequence-author-facing types: frozen SequenceAppContext API, application/function types. Canonical import for sequence authors. | [View](sequence-types/codemap.md) |
| `sth/` | Top-level STH wrapper owning process-facing lifecycle around a configured host instance. | [View](sth/codemap.md) |
| `symbols/` | Shared constants and protocol symbols — message codes, statuses, stream states, headers, exit/error codes, runtime-kind. | [View](symbols/codemap.md) |
| `telemetry/` | Telemetry adapter registry, Loki integration, and telemetry data contracts. | [View](telemetry/codemap.md) |
| `types/` | Shared type package for CLI options, merged STH configuration, runtime executor contracts, and adapter-facing DTOs. | [View](types/codemap.md) |
| `utility/` | Shared utility functions — merge, defer, typeguards, validators, URL normalization, stream helpers. | [View](utility/codemap.md) |
| `verser/` | Legacy CONNECT/BPMux reverse-server connectivity package. | [View](verser/codemap.md) |

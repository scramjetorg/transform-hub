# packages/

## Responsibility

Monorepo workspace directory containing all Scramjet Transform Hub packages under `@scramjet/*` scope. Each subdirectory is an independent npm package with its own `package.json`, build config, and tests. Managed via npm workspaces declared in the root `package.json`, with custom workspace groups (`modules`, `runners`, `bdd`).

## Directory Index

| Package | Responsibility | Map |
|---------|---------------|------|
| `adapter-docker/` | Docker stored-sequence adapter and runner image/container orchestration. | [View](adapter-docker/codemap.md) |
| `adapter-kubernetes/` | Kubernetes sequence persistence, runner pod lifecycle management, config decoding, and client access. | [View](adapter-kubernetes/codemap.md) |
| `adapter-process/` | Process adapter runtime bridging host-side adapter contracts to process-based execution. | [View](adapter-process/codemap.md) |
| `adapters/` | Adapter selector and host-side runtime adapter abstraction layer. | [View](adapters/codemap.md) |
| `adapters-common/` | Shared adapter helpers for stored-sequence metadata loading, language detection, and runner env shaping. | [View](adapters-common/codemap.md) |
| `api-client/` | HTTP API client classes for Host, Instance, Sequence, and Manager REST endpoints. | [View](api-client/codemap.md) |
| `api-router/` | API router package for building and composing route definitions. | [View](api-router/codemap.md) |
| `api-server/` | HTTP API server for router construction, server setup, REST/stream handlers, middleware, and routed forwarding. | [View](api-server/codemap.md) |
| `bpmux/` | BPMux stream multiplexing library for connection mux/demux. | [View](bpmux/codemap.md) |
| `cli/` | CLI tool for interacting with STH and Manager deployments. | [View](cli/codemap.md) |
| `client-utils/` | Base HTTP client utilities and abstractions for REST API communication. | [View](client-utils/codemap.md) |
| `config/` | Zod-backed configuration loading, validation, secret masking, and CLI option descriptors. | [View](config/codemap.md) |
| `frame-stream/` | Frame stream protocol helpers for typed message framing. | [View](frame-stream/codemap.md) |
| `host/` | Core host implementation — sequence lifecycle, instance management, service discovery, and API controllers. | [View](host/codemap.md) |
| `load-check/` | System resource monitoring, load checking, and health summary generation. | [View](load-check/codemap.md) |
| `logger/` | Console Web API-compatible logger with streaming output support. | [View](logger/codemap.md) |
| `manager/` | Manager control plane for connected STH nodes, cluster API routing, and registry. | [View](manager/codemap.md) |
| `manager-config/` | Manager default configuration and singleton config service for deep-merge runtime updates. | [View](manager-config/codemap.md) |
| `middleware-api-client/` | Middleware API client for space-level Manager routing through the Middleware layer. | [View](middleware-api-client/codemap.md) |
| `model/` | Domain model classes — stream handler, message serialization, error types, ID provider. | [View](model/codemap.md) |
| `module-loader/` | Runtime module loading utility (import/require) with memory tracking. | [View](module-loader/codemap.md) |
| `monitoring-server/` | Lightweight HTTP health-check server with configurable check functions. | [View](monitoring-server/codemap.md) |
| `multi-manager/` | MultiManager control plane for sub-Manager lifecycle, API proxying, and health monitoring. | [View](multi-manager/codemap.md) |
| `multi-manager-api-client/` | MultiManager API client for starting and managing sub-Managers. | [View](multi-manager-api-client/codemap.md) |
| `obj-logger/` | Object-mode structured logger with pipeable stream output and log level control. | [View](obj-logger/codemap.md) |
| `pre-runner/` | Pre-runner bootstrap utilities. | [View](pre-runner/codemap.md) |
| `rest-api2/` | Second-generation REST API implementation. | [View](rest-api2/codemap.md) |
| `runner/` | Outer runtime launcher for adapter-launched sequences; validates env, selects Bun/Node/Python child runtimes. | [View](runner/codemap.md) |
| `runner-bun/` | Bun sequence runtime wrapper for boot-config validation and delegated execution. | [View](runner-bun/codemap.md) |
| `runner-node/` | Node sequence runtime: boot-config parsing, host channel setup, lifecycle, and sequence execution. | [View](runner-node/codemap.md) |
| `runner-python/` | Python sequence runtime and parity reference for host-channel connection. | [View](runner-python/codemap.md) |
| `sequence-test/` | Experimental sequence testing harness for exercising runner protocol paths. | [View](sequence-test/codemap.md) |
| `sth/` | Top-level STH wrapper owning process-facing lifecycle around a configured host instance. | [View](sth/codemap.md) |
| `sth-config/` | STH configuration defaults, image defaults, deep-merge updates, and runtime-adapter selection. | [View](sth-config/codemap.md) |
| `symbols/` | Shared constants and protocol symbols — message codes, statuses, stream states, headers, exit/error codes, runtime-kind. | [View](symbols/codemap.md) |
| `telemetry/` | Telemetry data collection and reporting utilities. | [View](telemetry/codemap.md) |
| `types/` | Shared type package for CLI options, merged STH configuration, runtime executor contracts, and adapter-facing DTOs. | [View](types/codemap.md) |
| `utility/` | Shared utility functions — merge, defer, typeguards, validators, URL normalization, stream helpers. | [View](utility/codemap.md) |
| `verser/` | Legacy CONNECT/BPMux reverse-server connectivity package. | [View](verser/codemap.md) |

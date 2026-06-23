# Source Entry (`src/`)

## Responsibility
Contains the complete source for the `@scramjet/manager` package: the `Manager` class (801 lines), STH controller and connection store, service discovery, topic wiring, health/audit infrastructure, storage routing (S3/disk), Verser2 broker transport, route classification (293 lines with follow/direct-route-metadata support), verser2 trust export, V1+V2 API handlers (v2 handler 375 lines with hub delete/disconnect, storage ops, topic streams), and the CLI entrypoint.

## File Structure

```
src/
  index.ts              — Package barrel export (re-exports all lib modules except storage-routers)
  bin/
    start.ts            — CLI entrypoint (ts-node)
  lib/
    manager.ts            — Core Manager class (801 lines)
    sth-controller.ts     — STH node controller (Verser2-based, description/tags/accessKey metadata)
    sth-connection-store.ts — In-memory map of active STH connections (81 lines, includes delete/force)
    sth-info-register.ts  — Aggregated sequence/instance registry across all STHs (227 lines, hubId/location tracking)
    service-discovery.ts  — Topic-based pub/sub actor wiring with lazy-init host streams (392 lines)
    common-logs-pipe.ts   — Aggregated log stream combiner (ReReadable)
    health-check.ts       — Health endpoint data provider
    manager-auditor.ts    — Audit stream multiplexer with heartbeat (106 lines, flowing state)
    s3-router.ts          — Factory selecting S3Proxy vs DiskProxy
    verser2-transport.ts  — Verser2-based broker transport for STH routing (255 lines, polling, abort signals)
    verser2-trust-export.ts — Verser2 certificate trust export helper (50 lines)
    route-classifier.ts   — Route classification with follow/direct-route-metadata/redirect decisions (293 lines)
    start-manager.ts      — Startup factory (7 lines)
    utils.ts              — Error translation & disconnect validation helpers
    api/
      manager-api.ts        — Composes v1 + v2 API handlers
      manager-api-v1.ts     — Legacy v1 REST API handler (219 lines, v1 compatibility router)
      manager-api-v2.ts     — V2 REST API handler (375 lines, via @scramjet/api-router, hub resolver, storage proxy)
    storage-routers/
      disk-proxy.ts       — Local filesystem sequence storage proxy
      s3-proxy.ts         — Minio S3-compatible sequence storage proxy
```

## Key Design Decisions
- `index.ts` re-exports all `lib/` modules except internal storage-routers for public consumption.
- The `bin/` entrypoint is minimal — it calls `startManager()` from `start-manager.ts`.
- All stateful subsystems are instantiated by the `Manager` class and composed via dependency injection in the constructor.
- V2 API handlers use `@scramjet/api-router`'s `registerHttpRoutes()` and `RestAPI2RouteSets.space` for contract-first route registration. Hub resolver uses verser2 route domain redirect.
- Route classification supports three forwarding modes: HTTP 308 redirect, direct-route-metadata (for CPM-internal requests), and unsupported-bidirectional (duplex streams).
- STH registration supports enrollment token validation, metadata (description/tags), and rollback on init failure.

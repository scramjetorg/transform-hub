# Source Entry (`src/`)

## Responsibility
Contains the complete source for the `@scramjet/manager` package: the `Manager` class, STH controller and connection store, service discovery, topic wiring, health/audit infrastructure, storage routing (S3/disk), Verser2 transport, route classification, verser2 trust export, V1+V2 API handlers, and the CLI entrypoint.

## File Structure

```
src/
  index.ts              — Package barrel export (re-exports all lib modules)
  bin/
    start.ts            — CLI entrypoint (ts-node)
  lib/
    manager.ts            — Core Manager class
    sth-controller.ts     — STH node controller (Verser-based communication)
    sth-connection-store.ts — In-memory map of active STH connections
    sth-info-register.ts  — Aggregated sequence/instance registry across all STHs
    service-discovery.ts  — Topic-based pub/sub actor wiring
    common-logs-pipe.ts   — Aggregated log stream combiner (ReReadable)
    health-check.ts       — Health endpoint data provider
    manager-auditor.ts    — Audit stream multiplexer with heartbeat
    s3-router.ts          — Factory selecting S3Proxy vs DiskProxy
    verser2-transport.ts  — Verser2-based broker transport for STH routing
    verser2-trust-export.ts — Verser2 certificate trust export helper
    route-classifier.ts   — Route classification (Manager-owned / STH-forward / multiplex)
    start-manager.ts      — Startup factory
    utils.ts              — Error translation & disconnect validation helpers
    api/
      manager-api.ts        — Composes v1 + v2 API handlers
      manager-api-v1.ts     — Legacy v1 REST API handler
      manager-api-v2.ts     — V2 REST API handler (via @scramjet/api-router)
    storage-routers/
      disk-proxy.ts       — Local filesystem sequence storage proxy
      s3-proxy.ts         — Minio S3-compatible sequence storage proxy
```

## Key Design Decisions
- `index.ts` re-exports all `lib/` modules for public consumption.
- The `bin/` entrypoint is minimal — it calls `startManager()` from `start-manager.ts` (re-exported via `index.ts`).
- All stateful subsystems are instantiated by the `Manager` class and composed via dependency injection in the constructor.
- V2 API handlers use `@scramjet/api-router`'s `registerHttpRoutes()` and `RestAPI2RouteSets` for contract-first route registration.

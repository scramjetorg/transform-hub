# packages/sth-config/src/

## Responsibility

Implements config defaults, image defaults, merge/update semantics, adapter selection, public config extraction (with verser2 secret masking), and Manager trust bootstrap for verser2 transport.

## Files

### `default-config.ts` (133 lines)

Seeds the full `STHConfiguration` defaults including host, docker, kubernetes, runtime, timings, telemetry, and **verser2** sections. Verser2 defaults define:
- `runnerHost.enabled: true`, `runnerHost.identityDir` under `~/.scramjet/verser2-runner-host`, runner host binding on `127.0.0.1:2444`, `localBroker.peerId: "auto"` (deferred host-ID-based resolution).
- Broker/guest peer IDs (`sth.default.broker`, `sth.default.guest`), target domains, TLS (empty), timeouts (`10s` route readiness, `10s` lease acquire, `30s` request), and leases.

### `config-service.ts` — `ConfigService` (72 lines)

Mutable singleton-like config service:
- **Constructor**: If a `DeepPartial<STHConfiguration>` is provided, calls `update()` (deep merge) on top of `defaultConfig`.
- **`update(config)`**: Deep-merges the partial config into the running config via `@scramjet/utility`'s `merge()`.
- **`selectRuntimeAdapter()`**: Dynamically imports `@scramjet/adapters` (graceful if unavailable) and calls `updateAdaptersConfig()` for adapter-specific augmentation.
- **`getConfigInfo()` (static)**: Strips kubernetes `authConfigPath`/`sequencesRoot`, then applies `maskConfig()` with `sthOutboundVerser2Options` to mask verser2 secret fields. Also masks `platform.apiKey` and `couchdb.pass`.

### `manager-trust-bootstrap.ts` — `applyManagerTrustBootstrap()` (56 lines)

Validates and applies Manager verser2 trust bootstrap material to an `STHConfiguration`. Performs fingerprint matching between the reported fingerprint, the computed X.509 cert fingerprint, and an optional pinned fingerprint. On success, merges the Manager's CA cert into `config.verser2.tls.ca`, optionally updates `hostUrl` and broker `targetDomain`.

### `image-config.json`

Baked Docker/kubernetes runner image tags. Merged into defaults by `ConfigService` at import time via `merge(_defaultConfig, { docker: { ... }, kubernetes: { ... } })`.

## Design/Patterns

Mutable in-memory default config hydrated by deep merge; adapter resolution is deferred so startup avoids a hard dependency when adapters are unused. Verser2 options are registered via `sthOutboundVerser2Options` from `@scramjet/config` and masked in public config views.

## Data & Control Flow

1. `default-config.ts` seeds host/docker/kubernetes/runtime/verser2 defaults.
2. `image-config.json` baked image tags are merged into defaults at module load.
3. Update calls (`ConfigService.update()`) overlay CLI/file config via deep merge.
4. `selectRuntimeAdapter()` optionally augments config with adapter-specific defaults.
5. `getConfigInfo()` strips local-only fields and masks verser2 secrets via `sthOutboundVerser2Options` for safe external exposure.
6. `applyManagerTrustBootstrap()` patches verser2 TLS CA and hostUrl/broker targetDomain from Manager-provided trust material.

## Integration Points

- Consumes `@scramjet/types` and `@scramjet/utility`; may import `@scramjet/adapters` for runtime-specific augmentation.
- Uses `sthOutboundVerser2Options` from `@scramjet/config` for secret masking in public config views.
- `config-service.ts` is consumed by `packages/sth/src/bin/hub.ts` (CLI bootstrap) and `packages/host/src/lib/host.ts` (runtime config lookup).
- `manager-trust-bootstrap.ts` is consumed by Manager-facing bootstrap flows (not directly by STH startup).

# packages/sth-config/

## Responsibility

Owns STH configuration defaults, image defaults, Verser2 outbound defaults, trust-bootstrap helpers, deep-merge updates, and runtime-adapter selection.

## Design/Patterns

- **Default-object hydration**: `default-config.ts` supplies host, API, runner, adapter, and Verser2 baseline values.
- **Layered updates**: `config-service.ts` deep-merges partial overrides and exposes a public-safe config view with secret masking.
- **Trust bootstrap**: `manager-trust-bootstrap.ts` materializes Manager trust certificates for outbound Verser2 connections.
- **Adapter augmentation**: Runtime adapter packages can extend CLI/config descriptors before host startup.

## Data & Control Flow

Boot starts from `default-config` plus image config, applies `DeepPartial<STHConfiguration>` updates from CLI/file input, merges manager trust material, then resolves adapter-specific values before host startup.

## Integration Points

Used by `packages/sth/src/bin/hub.ts`, `packages/sth/src/index.ts`, host startup, and adapter selectors; reads `@scramjet/types`, `@scramjet/utility`, `@scramjet/config`, and optional `@scramjet/adapters` hooks.

Legacy v1 API client for Scramjet Transform Hub. Provides typed clients for interacting with Hub/STH, Manager, Instance, and Sequence APIs using the `/api/v1` route tree.

## When to use

Use `@scramjet/api-client` when maintaining existing integrations that target the v1 API. The v1 API remains supported for backwards compatibility.

For new integrations, prefer [@scramjet/rest-api2](../rest-api2/README.md) which provides the current v2 API contract with typed route definitions, fluent clients, and transport-agnostic usage.

## Quick start

```typescript
import { HostClient } from "@scramjet/api-client";
import { ManagerClient } from "@scramjet/api-client";

// Host client — connect directly to an STH instance
const host = new HostClient("http://localhost:8000/api/v1");

// Manager client — connect to a Manager
const manager = new ManagerClient("http://manager-host:8200/api/v1");
```

## Stability

This package is **stable** and maintained for backwards compatibility. The v1 API route tree is not being extended with new features.

## Legacy status

The v1 API client targets the `/api/v1` route tree on STH and Manager. The `HostClient`, `InstanceClient`, and `SequenceClient` provide methods for lifecycle management, input/output streaming, and monitoring using the v1 API contract.

See the [legacy v1 API client documentation](../../docs-source/api/legacy/v1-api-client.md) for detailed v1 usage patterns.

## See also

- [API client usage](../../docs-source/api/client-usage.md) for the current v2 API surface.
- [Legacy v1 API client docs](../../docs-source/api/legacy/v1-api-client.md) for v1-only features.

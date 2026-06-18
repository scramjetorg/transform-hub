# Package Atlas: rest-api2

## Responsibility

`@scramjet/rest-api2` owns v2 REST API public contracts and the single common v2 client used across MultiManager, Manager, Host, Sequence, Instance/CSI, audit, stdio, and RPC surfaces.

## Design / Patterns

- New public API contracts are exported under the `RestAPI2` namespace.
- The common client dispatches through `@scramjet/api-router` manifests and transports instead of surface-specific clients.
- Legacy v1 REST DTO namespaces are behavioral references only and must not be exported or aliased by this package.

## Integration Points

- Uses `@scramjet/api-router` for route manifest client dispatch and HTTP/verser2 transport boundaries.
- Later migration phases wire Host-owned, Manager-owned, and MultiManager-owned route definitions to these contracts.

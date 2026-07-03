# packages/api-types/

## Responsibility

API/user-facing type contracts for Scramjet Transform Hub. Owns REST DTO namespaces (`STHRestAPI`, `MRestAPI`, `MMRestAPI`, `MWRestAPI`), `APIExpose` and related server types, client interface stubs (`HostClient`, `ManagerClient`, etc.), configuration contracts (`ManagerConfiguration`, `STHConfiguration`), adapter and monitoring types, message protocol types, and strict API-specific AppContext aliases — all built on `@scramjet/runtime-types` without importing `@scramjet/rest-api2` or `@scramjet/types`.

## Design / Patterns

- **REST DTO namespaces**: four dedicated REST API namespaces are owned directly by this package — `STHRestAPI` (STH host), `MRestAPI` (Manager), `MMRestAPI` (Multi-Manager), `MWRestAPI` (Middleware). Each namespace barrel is generated from flat file definitions in `rest-api-sth/`, `rest-api-manager/`, `rest-api-multi-manager/`, `rest-api-middleware/`, `rest-api-commons/`, and `rest-api-error/`.
- **API client interfaces**: typed client interface stubs for `HostClient`, `ManagerClient`, `InstanceClient`, `SequenceClient`, `SpaceClient` with factory type `ApiClientFactory`.
- **`StrictAppContext`**: API-specific AppContext alias that binds `BaseAppContext` to concrete `HostClient` and `ManagerClient` types, exposing typed `hubClient()` and `spaceClient()` accessors. Sequence authors should use `SequenceAppContext` from `@scramjet/sequence-types` instead.
- **No `@scramjet/rest-api2` dependency**: REST DTO types are self-contained; the REST API v2 route sets, schemas, and client builders live in `@scramjet/rest-api2` and are not pulled into this package.
- **Depends on `@scramjet/runtime-types`** for the base app context, host-client, and runtime-executor primitives.
- **Depends on `@scramjet/symbols`** for message codes and shared constants.

## Data and control flow

The types in this package flow through:
1. **REST API handlers**: DTO shapes are used by both v1 (`HostAPIV1Handler`, `ManagerAPIV1Handler`) and v2 API handler response serialization.
2. **Client construction**: `ApiClientFactory<HostClient, ClientUtils>` types flow into `createHostClient`, `InstanceClient`, `ManagerClient` creation.
3. **AppContext construction**: `StrictAppContext` is used by runner/runner-node to construct the sequence-facing context with typed API clients.
4. **Configuration assembly**: `STHConfiguration`, `ManagerConfiguration`, adapter configs flow from CLI parsing → config service → host/manager startup.

## Integration points

- Consumed by `@scramjet/sth`, `@scramjet/host`, `@scramjet/manager`, `@scramjet/multi-manager`, adapters, runners, and API client packages.
- Consumed by `@scramjet/types` (re-exports REST DTO namespaces and AppContext types via compatibility barrel).
- ~45 exported modules across the package root.

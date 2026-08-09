Internal Manager middleware routing client for Scramjet Transform Hub. Provides typed HTTP client methods for communication between the Manager and its middleware stack — specifically the CPM (Cloud Platform Manager) connector, topic router, and audit stream.

## When to use

Use `@scramjet/middleware-api-client` when you are working on the Manager middleware layer and need typed routing calls between middleware components. This is an **internal** package, not a public API client.

For public-facing API access, prefer [@scramjet/rest-api2](../rest-api2/README.md) or [@scramjet/api-client](../api-client/README.md) for v1 compatibility.

## Stability

This package is **stable** and actively maintained as part of the Manager middleware infrastructure. It is not a public replacement for `@scramjet/rest-api2`.

## See also

- [Manager overview](../../docs-source/manager/overview.md) for Manager architecture and middleware routing.
- [@scramjet/api-client](../api-client/README.md) for the public v1 API client.
- [@scramjet/rest-api2](../rest-api2/README.md) for the public v2 API client.

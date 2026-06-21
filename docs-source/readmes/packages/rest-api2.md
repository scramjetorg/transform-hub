v2 REST API contracts, shared handlerless route definitions, Zod schemas, and a manifest-backed common client for Scramjet Transform Hub.

The `RestAPI2` namespace defines all v2 request/response types, generic structures, operation identifiers, route sets (`RestAPI2RouteSets`), pre-built routers (`RestAPI2Routes`), and the common client factory (`createRestAPI2Client()`). Fluent clients (`createRootClient`, `createSpaceClient`, `createHubClient`, `createInstanceClient`) provide typed traversal of the route tree over HTTP or verser2 transports.

See the [rest-api2 reference](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/rest-api2/README.md) for detailed usage and migration notes.

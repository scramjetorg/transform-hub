// ---------------------------------------------------------------------------
// @scramjet/api-types — API/user-facing type contracts
// ---------------------------------------------------------------------------
// Owns APIExpose, APIRoute, APIServer, client factory and client contracts,
// REST API DTO types, message protocol types needed by API
// client/server packages, config types, and strict API-specific AppContext
// aliases built on @scramjet/runtime-types.
//
// Must NOT depend on rest-api2 or types (both @scramjet/*).
// ---------------------------------------------------------------------------

export * from "./host-client";
export * from "./manager-client";
export * from "./api-expose";
export * from "./api-client";
export * from "./message-types";
export * from "./config-types";
export * from "./rest-api-sth";
export * from "./rest-api-manager";
export * from "./rest-api-middleware";
export * from "./rest-api-multi-manager";
export * from "./rest-api-error/rest-api-error";
export * from "./strict-app-context";

// New modules added during Phase 3 typings split migration:
export * from "./monitoring-server";
export * from "./telemetry";
export * from "./adapter-types";

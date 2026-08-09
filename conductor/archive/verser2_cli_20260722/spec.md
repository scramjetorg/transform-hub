# Verser2 CLI

## Overview

Add an mTLS-authenticated Verser2 transport to the Scramjet CLI so supported non-middleware operations can address MultiManager, Manager, and Hub APIs without relying on the MultiManager HTTP listener. Preserve the existing HTTP(S)/v1 CLI behavior for backwards compatibility. Make Verser2 use the native v2 REST contract surface, extending `@scramjet/rest-api2` when required.

## Functional Requirements

1. Provide a CLI connection/profile model for an outbound Verser2 broker, including endpoint, CA trust, certificate/key or PKCS#12 credential paths, passphrase reference, peer/route selection, timeouts, and safe diagnostics. Do not store inline private-key material or expose secrets in output.
2. Require and validate mTLS for Verser2 CLI connections. Use the certificate as a privileged control-plane transport credential; granular authorization and RBAC are out of scope for this open-source track and remain Enterprise functionality.
3. Implement one reusable Verser2 broker bridge for typed REST clients and raw API calls. It must resolve targets/routes, encode path/query/headers/bodies, map responses and errors, support cancellation/timeouts, and correctly handle JSON, binary, uploads, and streaming without leaking connections or streams.
4. Support topology-aware targets:
   - MultiManager or Manager ingress can access the control-plane routes it advertises or federates.
   - A direct Hub connection is restricted to that Hub and its downstream sequence/instance routes; it must not imply upstream control-plane access.
   - Missing, duplicate, stale, or ambiguous routes must fail deterministically and provide an explicit route-domain override where necessary.
5. Expose all applicable `rest-api2` routes to the Verser2 CLI transport. Add missing v2 contracts, resolvers, or Verser2 route registrations when they are needed for supported non-middleware CLI capability.
6. Retain the current HTTP(S)/v1 CLI implementation and behavior as the backwards-compatible path. Do not silently fall back from a requested Verser2 command to HTTP(S).
7. Add a raw API command family, including `si api get <endpoint>`, with the approved design covering methods, base/version resolution, target selection, query parameters, headers, JSON/file/stdin/binary bodies, streamed output, status/error rendering, destructive-method confirmation, and non-interactive behavior.
8. Inventory every existing CLI command in a capability matrix. For each command, record owner, target scope, HTTP/v1 and Verser2/v2 availability, request/response streaming needs, and whether it is middleware-only, supported, deferred, or intentionally unavailable.
9. Support the approved non-middleware named command set across read/control, uploads, and streams: sequence, instance, Hub, and topic operations where the corresponding Manager/Hub v2 API exists. Middleware-owned account, membership, access-key, and other middleware-only operations remain unavailable through direct Verser2 CLI access.
10. Preserve existing CLI output conventions and provide machine-usable errors/exit codes for mTLS, connection, route-discovery, API, timeout, and cancellation failures.

## Command-Design Gate

Before implementation of named commands or the raw API command, create a command-structure document and pause for explicit user review. It must define transport and profile selection, v1 HTTP(S) versus v2 Verser2 behavior, MultiManager/Manager/Hub target selection, route-domain discovery and override, command capability matrix, raw API syntax, input/output and streaming semantics, confirmation rules, error/exit-code behavior, profile migration, and secret handling.

## Non-Functional Requirements

- Reuse transport-neutral API-router and rest-api2 abstractions instead of implementing per-command Verser2 request glue.
- Keep mTLS credentials file-backed, permission-checked where supported, redacted from logs/config dumps, and excluded from generated examples.
- Cover positive and negative mTLS, route readiness/selection, request encoding, stream cleanup, interruption, and cross-level traversal with focused tests; add an end-to-end CLI path for MultiManager, Manager, and Hub.
- Maintain current HTTP(S)/v1 CLI compatibility and avoid unapproved server, runner, or middleware behavior changes.

## Acceptance Criteria

- A configured mTLS CLI connection can call supported v2 endpoints through Verser2 at MultiManager, Manager, and direct Hub scope according to the topology rules.
- Invalid/untrusted/missing credentials and unavailable or ambiguous routes fail without sending a request or leaking sensitive values.
- Existing HTTP(S)/v1 CLI commands continue to work unchanged.
- The approved capability matrix identifies every current command and makes unavailable middleware-only commands explicit.
- `si api get <endpoint>` and the approved raw-command options invoke the same reusable transport bridge as typed command paths.
- Supported named command coverage includes the approved read/control, upload, and streaming capabilities without implicit HTTP fallback.
- Tests demonstrate request/response streaming, cancellation cleanup, error mapping, direct Hub isolation, and MultiManager/Manager traversal.

## Out of Scope

- Enterprise granular authorization/RBAC or certificate-to-user authorization propagation.
- Replacing the existing HTTP(S)/v1 CLI path.
- Middleware-owned product APIs and account/tenant management functionality.
- Unrelated runner protocol, adapter, or cloud orchestration changes.

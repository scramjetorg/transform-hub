# packages/monitoring-server/

## Responsibility

Provides a lightweight HTTP health-check server for Scramjet Transform Hub components. The `MonitoringServer` starts an HTTP server on a configurable port/path and runs user-supplied check functions, returning a plain-text health status.

## Design / Patterns

- **Configurable checks**: Accepts an array of `MonitoringServerValidator` check functions (sync or async, returning `boolean | Promise<boolean>`). All checks must pass for the server to report healthy.
- **Path validation**: Server path is validated against RFC 3986 unreserved/reserved character set. Default path is `"healtz"`.
- **Lightweight**: Uses Node's built-in `http.createServer` — no Express or other framework dependency.
- **Config validation**: `MonitoringServerConf` validates the incoming configuration object and reports validation errors.

## Data & Control Flow

```
MonitoringServer(config)
  → validates config via MonitoringServerConf
  → registers checks from config.check (function or array)
  → start() → creates HTTP server
  → GET /{path} → handleHealtzRequest() → Promise.all(checks) → "OK" | "NOT OK"
```

## Source Files

| File | Role |
|------|------|
| `src/monitoring-server.ts` | `MonitoringServer` class — HTTP server with health check endpoint. |
| `src/config/monitoringConfig.ts` | `MonitoringServerConf` — configuration validation. |

## Integration Points

- Types from `@scramjet/types` (`IMonitoringServer`, `MonitoringServerOptions`, `MonitoringServerValidator`, `MonitoringServerConfig`).
- Depends on `@scramjet/utility`.
- Used by host and Manager processes for health probe endpoints.

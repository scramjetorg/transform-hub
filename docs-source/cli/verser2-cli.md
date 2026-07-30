---
id: cli-verser2
slug: /cli/verser2
title: Verser2 CLI setup and usage
---

# Verser2 CLI setup and usage

The `si` CLI supports two transport paths:

- **HTTP(S)/v1** — the existing path using the Hub/Manager v1 REST API via `apiUrl`. Default when no Verser2 profile is configured.
- **Verser2/v2 (native)** — a Verser2 broker transport (with optional mTLS client authentication) that resolves typed v2 REST API contracts through the control-plane topology. Activated by a configured `verser2` profile block.

A configured Verser2 profile **never** silently falls back to HTTP(S)/v1. Commands without a native v2 counterpart exit immediately with exit code `80` (`UNAVAILABLE`). The HTTP(S)/v1 path remains active only when no Verser2 profile is selected.

[inline]: # (Table of Contents)

<!--
  This page documents the operator-facing Verser2 CLI behaviour.
  The authoritative command descriptors and capability matrix are in:
    - packages/cli/src/lib/commands/api.ts — raw API transport and error mapping
    - packages/cli/src/lib/capabilities.ts — native capability facade
    - packages/cli/src/lib/config/verser2Profile.ts — credential validation
    - packages/config/src/verser2-profile.ts — profile schema and redaction
    - conductor/archive/verser2_cli_20260722/capability-matrix.md — full command inventory
    - conductor/archive/verser2_cli_20260722/command-structure.md — approved design
-->

## Prerequisites

- `si` CLI installed (see [CLI usage](./usage.md)).
- A Verser2 broker at the target endpoint (MultiManager, Manager, or Hub).
- Server CA certificate (PEM) to verify the broker's TLS server certificate. Required for every Verser2 profile.
- Client credential for mTLS (optional): either a PEM certificate + key pair, or a PKCS#12 (PFX) file. Only needed when the configured ingress enforces client certificate authentication.
- Passphrase for the private key or PFX (optional) — supplied via a file or environment variable reference.
- The target broker ID, ingress level/ID/domain values provided by the platform operator.
- Linux or macOS (POSIX permission checks are not enforced on Windows).

## Profile configuration

A Verser2 profile is a set of properties under the `verser2` key in a CLI profile. Configure it with `si config set verser2.<field> <value>`.

**Minimal profile — CA only (no client credentials).** Use this when the target ingress does not require client authentication:

```text
si config set verser2.endpoint https://broker.example.com:2444
si config set verser2.brokerId my-broker
si config set verser2.ingress.level platform
si config set verser2.ingress.expectedId mm-1
si config set verser2.ingress.routeDomain mm-1-default
si config set verser2.tls.caFile /etc/scramjet/ca.pem
si config set verser2.timeoutMs 15000
```

**With mTLS client credentials (PEM).** Add these when the ingress requires client certificate authentication:

```text
si config set verser2.tls.certFile /etc/scramjet/client.pem
si config set verser2.tls.keyFile /etc/scramjet/client-key.pem
```

Alternatively use a PKCS#12 (PFX) credential, which replaces the PEM identity:

```text
si config set verser2.tls.pfxFile /etc/scramjet/client.pfx
si config set verser2.tls.passphraseReference /etc/scramjet/passphrase.txt
```

Reset fields with `si config reset verser2.<field>` or remove the entire Verser2 block with `si config reset verser2`.

### Schema reference

| Field | Required | Description |
|---|---|---|
| `endpoint` | yes | `https://` URL of the Verser2 broker |
| `brokerId` | yes | Stable non-secret peer identifier (alphanumeric, dots, hyphens, underscores) |
| `ingress.level` | yes | `platform` (MultiManager), `space` (Manager), or `hub` (direct Hub) |
| `ingress.expectedId` | yes | Expected `serviceId` from `GET /api/v2/ingress/identity` |
| `ingress.routeDomain` | yes | Route domain to wait for and use (must match the broker's advertisement) |
| `target.spaceId` | no | Default space target (must be consistent with ingress level) |
| `target.hubId` | no | Default hub target (must be consistent with ingress level and space target) |
| `tls.caFile` | yes | Absolute path to CA certificate PEM (plain file, not a symlink) |
| `tls.certFile` | no | Absolute path to client certificate PEM (omit if using PFX) |
| `tls.keyFile` | no | Absolute path to client private key PEM, owner-only (omit if using PFX) |
| `tls.pfxFile` | no | Absolute path to PKCS#12 file, owner-only (omit if using cert+key) |
| `tls.passphraseReference` | no | Passphrase source: absolute file path or `env://VAR_NAME` |
| `timeoutMs` | no | Connection and request timeout in milliseconds (default varies) |

### Mutual exclusivity

- Neither `certFile`+`keyFile` nor `pfxFile` is required — the profile is valid with only `tls.caFile` when the target ingress does not require mTLS.
- When using client credentials, `certFile` + `keyFile` is one option; `pfxFile` is an alternative. Setting one clears the other.
- `passphraseReference` is optional and applies only when a private key or PFX is configured. Use a file path to read the first line, or `env://MY_VAR` to read from an environment variable.

### Permission checks (POSIX)

On Linux and macOS, when private credential files (`keyFile` or `pfxFile`) are configured, they are validated at connection time:

- Must be a regular file (not a symlink).
- Must be owner-only (`chmod 600` or stricter; no group/other permissions).
- The file owner must match the current process user.

Violations produce exit code `53` (`PERMISSION`) before any network request. Profiles with only `tls.caFile` (no private credential material) are not subject to these checks.

### Secret redaction

When printing configuration (`si config print`), private credential paths (`keyFile`, `pfxFile`, `passphraseReference`) are replaced with `"********"`. The resolved passphrase value and private key material are never displayed, logged, or included in error diagnostics. The `caFile`, `certFile`, endpoint, broker ID, and ingress fields remain visible.

The `publicVerser2Profile` function in `@scramjet/config` (see `packages/config/src/verser2-profile.ts`) performs the masking. Only `config print` and `--output json` use it; all other output paths redact or omit private material.

## Ingress levels and topology

### `platform` (MultiManager)

Targets the MultiManager root control-plane ingress. Can reach:
- Root-owned routes: space list, root audit, root identity.
- Space-owned routes under a selected space ID.
- Hub-owned routes under a selected space ID + hub ID.

Requires at least a `target.spaceId` for space-owned commands and a `target.hubId` for hub-owned commands.

### `space` (Manager)

Targets a specific Manager (the `expectedId`). Can reach:
- Space-owned routes: space info, space logs, space version.
- Hub-owned routes under a selected hub ID (via `target.hubId` or interactive `hub use`).

The Manager identity is fixed by the configured `ingress.expectedId` — it cannot be changed per-request regardless of whether mTLS is active. Selecting a different `--space-id` that contradicts the fixed ingress fails with exit code `54` (`TARGET`).

### `hub` (direct Hub)

Targets a dedicated Hub Verser2 host listener. Can reach:
- Hub-owned routes only: sequences, instances, topics, hub logs, hub audit, hub load/version.
- **Cannot traverse upstream**: Manager, space, or platform operations are unavailable.
- Has no descendant `target` — attempting `--space-id` or `--hub-id` fails with exit code `54`.

This ingress is isolated to a single Host v2 router. It provides the same REST surface as the Hub's HTTP API but through a dedicated TLS Verser2 port (with optional mTLS). In the default port topology, the Hub control ingress listens on port `2446` when an explicit legacy Hub runner port `2444` is already in use; otherwise, the default TLS control ingress port is `2444`.

### Route domain

The configured `routeDomain` selects a unique broker route. The CLI:
1. Connects to the endpoint over TLS (with optional client certificate when mTLS credentials are configured).
2. Waits for the exact configured domain to appear in the route list.
3. Calls `GET /api/v2/ingress/identity` over that domain.
4. Verifies `level`, `serviceId`, and `routeDomain` all match the profile exactly.
5. Dispatches the business request.

If the domain is missing, duplicate, or not ready within the timeout, the command fails with exit code `55` (`ROUTE`). No alternate domain or HTTP fallback is attempted.

## Command selection

### How Verser2 mode is activated

When a profile has a complete and valid `verser2` block:

1. Named command actions call `getNativeCapabilities()` which returns a `NativeCapabilities` facade.
2. If the facade is available, the action dispatches through the typed Verser2 broker bridge with manifest-backed v2 route contracts.
3. If the facade is unavailable (incomplete profile), the command fails with exit code `61` (`PROFILE`).
4. If no `verser2` block exists, the same command uses the existing HTTP(S)/v1 client path — unchanged.

### No silent fallback

A selected Verser2 profile **never** downgrades to HTTP(S)/v1. A command that has no v2 counterpart throws `CapabilityUnavailableError` with exit code `80` (`UNAVAILABLE`). This is explicit and deterministic.

### Commands that are natively available

The following commands dispatch through the Verser2 broker when a profile is active. Key examples:

- **Hub**: `version`, `load`, `logs`, `audit`, `use`, `list`, `info`, `disconnect`, `delete`, `config get`
- **Space**: `info`, `list`, `use`, `audit`, `logs`, `version`
- **Sequence**: `list`, `use`, `info`, `send`, `update`, `start`, `deploy`, `delete`, `prune`
- **Instance**: `list`, `use`, `info`, `health`, `log`, `kill`, `stop`, `restart`, `input`, `output`, `stdio`, `event emit`, `event on`, `event on --next`, `stdin`, `stderr`, `stdout`
- **Topic**: `create`, `delete`, `get` (hub/space), `send` (hub/space), `list` (hub/space)
- **Store**: `list`, `prune`
- **Raw API**: `api get|post|put|patch|delete|head`

### Commands that are intentionally unavailable

The following commands throw exit code `80` (`UNAVAILABLE`) when a Verser2 profile is active. They remain usable under HTTP(S)/v1 without a Verser2 profile:

- `space access create|list|revoke` (middleware-only)
- `inst inout` (no coupled duplex operation in v2)
- `inst event on --stream` (no event stream operation in v2)
- `api endpoints` (placeholder — inventory not bound)
- `space|hub|sequence|instance config set|reload` (not bound on server side)
- `space|sequence|instance config get` (not bound on server side)
- `store send|delete` (deferred until server binding)

## Raw API: `si api`

### Syntax

```text
si api <method> <path> [options]
```

**Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` (case-insensitive).

**Path**: Must start with `/`. If it already starts with `/api/v2/`, it is used verbatim. Otherwise it is resolved once against `/api/v2` (so `/version` becomes `/api/v2/version`). No other base or version rewriting occurs.

**Options**:

| Option | Description |
|---|---|
| `--space-id <id>` | Descendant space target |
| `--hub-id <id>` | Descendant hub target |
| `--query <key=value>` | Repeatable query parameter |
| `-H, --header <name:value>` | Repeatable request header |
| `--json <json>` | JSON request body (sets `application/json`) |
| `--file <path>` | Binary file body (sets `application/octet-stream`) |
| `--stdin` | Read request body from stdin (requires `--no-confirm`) |
| `--binary <base64>` | Base64-decoded body |
| `--timeout <ms>` | Per-request timeout |
| `--output <json\|text\|raw>` | Response render mode |
| `--stream` | Pipe response bytes raw to stdout/file |
| `-o, --output-file <path>` | Write response to file |
| `--no-confirm` | Skip destructive-method confirmation |

### Body rules

- Exactly zero or one body source (`--json`, `--file`, `--stdin`, `--binary`). Multiple sources fail.
- `GET` and `HEAD` reject any body.
- `--stdin` body is forbidden during an interactive confirmation (add `--no-confirm`).
- File-read failures are pre-dispatch errors (exit code `1`).

### Output

- **Without `--stream`**: Response body is collected up to a 1 MiB safe limit. Exceeding it fails with exit code `59` (`RESPONSE_LIMIT`). The collected bytes are rendered as JSON pretty-print (`--output json`), decoded text (`text`), or raw bytes (`raw`).
- **With `--stream`**: Response bytes are piped directly to stdout or `-o` without buffering. Streamed responses may still be inspected for v2 operation-failed envelopes.
- **`HEAD`**: Emits status line and response headers only — no body collection.
- **2xx**: Written to stdout (or file). Non-2xx: diagnostic body collected and written as an error to stderr.

### Destructive confirmation

`POST`, `PUT`, `PATCH`, and `DELETE` require an exact `yes` confirmation on a TTY unless `--no-confirm` is supplied. Outside a TTY they fail without `--no-confirm`. Prompts and errors go to stderr; normal output goes to stdout.

### Forbidden headers

The following headers are rejected: `host`, `connection`, `keep-alive`, `transfer-encoding`, `upgrade`, `content-length`, and any `x-scramjet-*` header. The transport supplies routing and framing headers. `content-type` is user-settable.

## Exit codes

| Exit | Code | Meaning |
|---:|---|---|
| 0 | OK | 2xx operation completed |
| 1 | USAGE | grammar, body, header, confirmation, or argument error |
| 50 | CREDENTIAL | missing/unreadable credential or secret reference |
| 51 | TRUST | server certificate/CA validation failed |
| 52 | AUTH | TLS client authentication rejected |
| 53 | PERMISSION | unsafe private-material permission (not owner-only, symlink) |
| 54 | TARGET | target level/IDs violate ingress boundary |
| 55 | ROUTE | configured domain absent, duplicate, or not ready |
| 56 | IDENTITY | ingress identity mismatch or unavailable |
| 57 | TIMEOUT | route or request timeout |
| 58 | CONNECTION | broker connection failure |
| 59 | RESPONSE_LIMIT | non-stream response exceeded safe collection limit |
| 60 | CANCELLED | SIGINT/AbortSignal cancellation |
| 61 | PROFILE | invalid profile/bootstrap |
| 70 | API_4XX | remote 4xx response |
| 71 | API_5XX | remote 5xx response |
| 80 | UNAVAILABLE | capability intentionally unavailable |
| 81 | DEFERRED | capability not yet v2-parity |

Human error format is `Error [CODE]: message` on stderr. With `--output json`, errors are `{"error":true,"code":"CODE","message":"...","exitCode":N}` on stderr; successful JSON remains on stdout.

## Cancellation and streaming

### SIGINT

`SIGINT` (Ctrl+C):

1. Aborts the in-flight request.
2. Destroys request and response body streams.
3. Awaits response cleanup and session close.
4. Exits with code `60` (`CANCELLED`).

No automatic retries are performed.

### Named stream cleanup

Typed named streams (`hub logs`, `inst output`, `topic get`, etc.) register cleanup listeners:

- `end`, `error`, and `close` on the output stream trigger listener removal, stream destruction, and session close.
- A `SIGINT` handler replaces the initial abort handler and closes all streams before exit.
- `--log-format` streams forward the source `ApiCommandError` through the format transform, preserving the exit code.

### Stdio lifecycle (`inst stdio`)

When attaching native stdio:

1. The instance descriptor is checked for stdin (writable), stdout (readable), and stderr (readable).
2. Stdout and stderr streams are acquired.
3. `process.stdin` is uploaded to the instance stdin. Stdout and stderr are piped to `process.stdout` and `process.stderr`.
4. On any stream failure, cancellation, or destination close, all streams are destroyed and listeners are removed.
5. Cleanup is awaited once.

## Direct-Hub isolation

A Hub ingress (`ingress.level: "hub"`) profile:

- Connects **only** to the targeted Hub's v2 router.
- Cannot reach Manager, MultiManager, or any upstream control-plane route.
- Cannot specify `target.spaceId` or `target.hubId`.
- Rejects paths starting with `/api/v2/spaces/` or `/api/v2/hubs/`.
- The identity proof (`GET /api/v2/ingress/identity`) must return `level: "hub"` matching the configured domain.

This isolation is enforced at the transport layer — the CLI never sends an upstream request through a Hub ingress, and the Hub listener itself restricts the v2 router to Hub-owned routes only.

## Troubleshooting

### Common errors and resolutions

| Error | Exit | Likely cause |
|---|---|---|
| `Error [CREDENTIAL]: ...` | 50 | Credential file missing, unreadable, or passphrase reference resolves to empty. Check paths and environment variable names. |
| `Error [TRUST]: ...` | 51 | Server certificate validation failed. Verify the CA file is correct, the server presents a certificate signed by that CA, and the hostname matches. |
| `Error [AUTH]: ...` | 52 | TLS client authentication rejected. The server required a client certificate but none was provided, or the provided certificate was expired, or its fingerprint was not in the server's allowlist. Add or correct `tls.certFile`/`tls.keyFile` (or `tls.pfxFile`) in the profile. |
| `Error [PERMISSION]: ...` | 53 | Private key or PFX file has unsafe permissions. Run `chmod 600 <file>`. |
| `Error [TARGET]: ...` | 54 | Selected space/hub target contradicts the fixed ingress level, or a hub ingress was used with an upstream path. |
| `Error [ROUTE]: ...` | 55 | Configured route domain not found, not ready, or ambiguous. Check the broker's advertised routes and the `routeDomain` value. |
| `Error [IDENTITY]: ...` | 56 | Ingress identity (`level`, `serviceId`, or `routeDomain`) does not match profile. Verify `ingress.level`, `ingress.expectedId`, and `ingress.routeDomain`. |
| `Error [TIMEOUT]: ...` | 57 | Connection, route readiness, or request exceeded timeout. Increase `timeoutMs` or check network/broker health. |
| `Error [CONNECTION]: ...` | 58 | Broker connection failed — unreachable endpoint, TLS handshake failure, or redirect error. |
| `Error [RESPONSE_LIMIT]: ...` | 59 | Non-stream response exceeded 1 MiB safe collection limit. Use `--stream` for larger responses. |
| `Error [CANCELLED]: ...` | 60 | Request cancelled by SIGINT or timeout. |
| `Error [PROFILE]: ...` | 61 | Verser2 profile is invalid or incomplete. Run `si config print` to inspect and fix fields. |
| `Error [UNAVAILABLE]: ...` | 80 | The requested command has no native v2 counterpart. Remove the Verser2 profile or switch to an HTTP(S)/v1 profile to use the v1 command path. |
| `Error [API_4XX]: ...` | 70 | Remote endpoint returned a 4xx HTTP status. Check the diagnostic body for details. |
| `Error [API_5XX]: ...` | 71 | Remote endpoint returned a 5xx HTTP status. Check server health. |

### Connection diagnostics

- Use `si config print` to verify the profile fields. Private fields are redacted.
- Try the raw API path first for troubleshooting: `si api get /api/v2/ingress/identity` proves connectivity and identity matching without involving named command routing.
- Increase `timeoutMs` if route readiness or identity verification times out.
- Verify the broker is running and the endpoint is reachable: `curl -k https://<endpoint>:<port>/` (the Verser2 protocol is not HTTP, but a TCP check proves reachability).
- Check the server's advertised routes. `broker.getRoutes()` lists them; the CLI's `routeDomain` must match one exactly.
- For PFX files, verify the file is a valid PKCS#12 container: `openssl pkcs12 -info -in client.pfx`.

### Logging and debugging

- Set `si config set log --debug true` before running commands to see internal client request/response tracing.
- Use `--output json` with `si api` for structured error output.
- On the server side (MultiManager, Manager, Hub), check the Verser2 listener logs for TLS handshake and route registration messages.

## Limitations

- **End-to-end CLI Verser2 coverage**: A configured CLI process with file-backed profiles traversing a real non-mTLS Hub ingress (CA-only, no client credentials) is covered by a focused integration test. The same test also validates hub-level isolation (upstream traversal rejection). The existing mTLS full-stack test covers MultiManager, Manager, and Hub ingress with real client certificate authentication, including successful traversal, upstream isolation, and rejected/invalid credentials. Broader scenario coverage (e.g. BDD CLI scenarios or multi-hop route chains) has not been exercised separately from the typed integration and unit coverage of the broker bridge, transport encoding, and route resolution layers.
- **Endpoint inventory**: `si api endpoints` is an explicit exit-80 placeholder until the v2 endpoint-inventory route is bound.
- **Config control**: `space|sequence|instance config set|reload`, `space|sequence|instance config get`, and `hub config set|reload` are exit-80 placeholders. Only `hub config get` is native.
- **Store send/delete**: Deferred until server-side binding — exit-80 under Verser2.
- **File-loaded configuration**: The `@scramjet/config` loader handles JSON, JSONC, and YAML. The Verser2 profile itself is a CLI profile block, not loaded from a standalone config file. Use `si config set` commands or edit the profile JSON directly.
- **Enterprise authorization**: Granular RBAC and certificate-to-user mapping are not part of the open-source CLI. When mTLS is used, the client certificate is a privileged control-plane credential.
- **Windows**: POSIX permission checks (owner-only) are not enforced; only basic file-read validation applies.
- **PKI lifecycle**: The CLI does not manage certificate renewal, revocation checking, or CSR generation. Use platform tooling (cert-manager, OpenSSL, etc.) for certificate lifecycle.

## See also

- [CLI usage](./usage.md) — basic CLI setup and common workflows
- [Capability matrix — full command inventory](../../conductor/archive/verser2_cli_20260722/capability-matrix.md) — every command variant with v1/v2 availability
- [Command structure — approved design](../../conductor/archive/verser2_cli_20260722/command-structure.md) — profile model, identity sequence, error exits
- [Transform Hub configuration](../transform-hub/configuration.md) — Verser2 server-side setup
- [Manager overview](../manager/overview.md) — orchestration layer architecture
- [API client documentation](../api/client-usage.md) — programmatic access

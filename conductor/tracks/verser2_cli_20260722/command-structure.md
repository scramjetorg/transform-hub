# Command Structure: Approved Verser2 CLI Target

## Status, profile, and trust

This is a planned design. Current CLI commands remain HTTP(S)/v1 or local until
implemented. A selected Verser2 profile has no implicit HTTP(S) fallback.

```ts
type Verser2Profile = {
  endpoint: string; // https URL
  brokerId: string; // non-secret stable broker/peer identity
  ingress: { level: "platform" | "space" | "hub"; expectedId: string; routeDomain: string };
  target?: { spaceId?: string; hubId?: string };
  tls: { caFile: string; certFile?: string; keyFile?: string; pfxFile?: string; passphraseReference?: string };
  timeoutMs?: number;
};
```

`endpoint`, `brokerId`, ingress level/ID/domain, and CA file are mandatory. `brokerId`
is validated as a non-empty safe identifier (not a credential or secret), is used to
construct `createVerserBroker`, and is safe to display in diagnostics. PEM cert/key or
PFX is a file-backed alternative; `passphraseReference` identifies a secret source,
never a literal secret. The planned bootstrap resolves it only at connection time,
checks private-material permissions where supported (owner-only on POSIX), and
redacts key/PFX/passphrase values and resolved content from `config print`, errors,
and debug output. Paths may be shown only when useful; secret values never are.
Missing/contradictory target IDs fail validation, not route inference.

Planned `platform` ingress is a MultiManager root guest; planned `space` ingress is
an independently enabled Manager, including managed Managers when configured;
planned `hub` ingress is a dedicated Hub CLI broker/Host/listener with a trust root
restricted to the Host v2 router. Direct Hub ingress cannot traverse into Manager or
MultiManager. Every listener fails closed at startup
with client-CA trust and optional configured fingerprint allowlists; Manager policy
can propagate to its configured ingress. Clients validate server CA and present a
credential, but cannot prove server-side mTLS/allowlist enforcement. Server tests
prove it. Current routes/bindings are in `packages/rest-api2/src/routes.ts` and
`packages/manager/src/lib/api/manager-api-v2.ts`; these planned listeners/identity
operation are not current APIs.

## Mandatory identity sequence

The planned authenticated `GET /api/v2/ingress/identity` returns
`{ level, serviceId, routeDomain }` and is bound at MultiManager, enabled Manager,
and dedicated Host ingress. Before *each session's first business request*:

1. connect with mTLS;
2. wait for the exact configured `routeDomain` (no substitution);
3. call identity over that domain;
4. require exact matches for profile `expectedId`, ingress `level`, and domain;
5. dispatch the business request.

Missing/not-ready/duplicate domain, identity failure, or mismatch fails terminally;
there is no alternate ingress/domain or HTTP fallback.

## Shared transport and typed calls

Phase 2 provides the planned `RoutedBrokerTransport` and profile/config support. It
accepts explicit route domain, method, path, query,
headers, body, timeout, and `AbortSignal`; response supplies status/headers/body
stream plus awaited `cleanup()`, and the session has awaited `close()`. Both typed
and raw calls use it. Typed adapters materialize routes from actual manifests; raw
calls never fabricate a `RouteManifestEntry`.

Use real lowercase fluent APIs in `packages/rest-api2/src/client.ts`, e.g.
`root.space(id).hubs.get()` and `hub.instance(id).logs.get()`. Required traversal
or fluent extensions are planned and tested work, not existing CLI functionality.
Phase 4 migrates the named commands covered by the full 111-variant capability matrix.

## Named-command additions

### Endpoint inventory

The planned authenticated operations `root.endpoints`, `space.endpoints`,
`hub.endpoints`, and `instance.endpoints` read the bound v2 router's OpenAPI endpoint
list. They are planned, not current routes. Their explicit command is:

```text
si api endpoints [--space-id <id>] [--hub-id <id>] [--instance-id <id>]
                 [--format openapi|markdown]
```

The selected profile fixes physical `platform`/`space`/`hub` ingress. Omitted
descendant IDs select that ingress's own list; supplied IDs traverse only to that
descendant under the established profile boundary and identity sequence. `openapi`
emits the collected endpoint representation. `markdown` uses a planned known-endpoint
formatter to make a stable table of method, path, request kind, response kind, and
stream direction. It neither probes routes nor invents endpoint definitions.

### Config control and restart

Planned named forms are `space|hub|sequence|instance config get|set|reload`.
`get` reads the respective v2 config operation where bound; `set` accepts a JSON
configuration patch; `reload` asks the service to reload its configuration. Current
space/hub config reads are route inventory only, not current CLI support; no current
set/reload or sequence/instance config operation is claimed. Until the corresponding
server operation is bound, each command is an explicit deterministic unsupported
placeholder (exit `80`), never an HTTP fallback; after approved server work it is a
native command.

`inst restart` is planned as **stop, then kill only if stopping fails or exceeds its
configured limit, then start**. Phase 3 still must establish the v2 stop/kill option
and lifecycle parity before this command becomes native.

### Completion and direct log formatting

`si completion` (with no side-effect subcommand) prints the generated shell
completion script to stdout. `si completion install` and `si completion uninstall`
remain explicit opt-in filesystem side effects.

Log-producing commands gain `--log-format pretty|json|raw`: `space audit`, `space
logs`, `hub logs`, `hub audit`, and `inst log`. The flag transforms each received log
record directly to stdout; `raw` preserves the received stream bytes. Without it,
current output behavior remains unchanged, preserving pipe compatibility with
`si util log-format`. This rendering option does not change transport, target,
streaming, or no-fallback semantics.

## Raw API: `si api`

### Grammar

```text
si api <method> <path>
  [--space-id <id>] [--hub-id <id>] [--query <key=value>]... [-H <name:value>]...
  [--json <json> | --file <path> | --stdin | --binary <base64>]
  [--timeout <ms>] [--output json|text|raw] [--stream] [-o <file>] [--no-confirm]
```

Allowed methods are exactly `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `HEAD`
(case-insensitive input, normalized uppercase). `<path>` is absolute. If it starts
`/api/v2/`, it is used verbatim. Otherwise it is resolved once against `/api/v2`
(`foo` is invalid; `/version` becomes `/api/v2/version`). No other base/version
rewrite occurs.

The selected full profile fixes endpoint, TLS, broker ID, ingress identity (`platform`
= MultiManager, `space` = Manager, `hub` = Host), and
route domain. Raw commands cannot replace physical ingress. `--space-id` and
`--hub-id` may select only descendant traversal IDs; a Manager/Hub path requiring
an omitted ID fails. A different ingress requires selecting a different full
profile. The command never guesses IDs or domains; direct-Hub profiles reject paths
outside the Host v2 router.

`--query key=value` is repeatable; repeated keys form repeated query values in
argument order. `-H/--header name:value` is repeatable; duplicate names are rejected
except headers whose HTTP grammar allows comma joining, which are joined only after
the user supplied values are validated. Reject `host`, `connection`, `keep-alive`,
`transfer-encoding`, `upgrade`, `content-length`, and every `x-scramjet-*` header.
`content-type` is allowed. The transport supplies routing and framing headers.

Exactly zero or one body source is allowed: `--json` parses JSON and defaults
content type to `application/json`; `--file` streams bytes and defaults to
`application/octet-stream`; `--stdin` streams stdin with that binary default; and
`--binary` base64-decodes bytes with that default. Multiple sources are usage error.
GET/HEAD reject a body; other methods may have an empty body. File failures are
pre-dispatch errors. `--stdin` body is forbidden when an interactive confirmation
would consume stdin unless `--no-confirm` is supplied.

With `--stream`, response bytes are piped raw to stdout or `-o` without buffering or
JSON parsing. Without `--stream`, raw calls collect a bounded response body, then
pretty-print JSON for `--output json`, decode text for `text`, or write bytes for
`raw`; collection exceeding the configured safe limit fails with `RESPONSE_LIMIT`
before rendering partial data. Content type, transfer framing, and an open response
do not imply an indefinite stream. Success status is 2xx; non-2xx collects the same
bounded diagnostic body and writes an error rather than successful output. `HEAD`
emits status/headers only.

POST/PUT/PATCH/DELETE require an exact `yes` confirmation on a TTY unless
`--no-confirm`. In non-TTY mode they fail unless `--no-confirm`; stdin body also
requires `--no-confirm`. Prompts/errors go to stderr, normal data to stdout. SIGINT
aborts the signal, destroys both request/response streams, awaits response cleanup
and session close, and exits cancelled. No automatic retries are performed.

Human error format is `Error [CODE]: message`. With `--output json`, errors are
`{"error":true,"code":"CODE","message":"...","exitCode":N}` on stderr;
successful JSON remains stdout.

| Exit | Code | Meaning |
|---:|---|---|
| 0 | OK | 2xx operation completed |
| 1 | USAGE | grammar, body, header, confirmation, or argument error |
| 50 | CREDENTIAL | missing/unreadable credential or secret reference |
| 51 | TRUST | server certificate/CA validation failed |
| 52 | AUTH | TLS client authentication rejected |
| 53 | PERMISSION | unsafe private-material permission |
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

## Profile migration

Planned config leaves are `config set verser2.endpoint`,
`config set verser2.ingress.level`, `.expectedId`, `.routeDomain`, optional target
IDs, `verser2.brokerId`, CA/cert/key/PFX files, passphrase reference, and timeout; corresponding reset
leaves remove/reset them. They must preserve existing HTTP(S) fields and profiles.
`config profile` continues to select profiles locally. A profile without this block
uses existing HTTP(S) only because that is explicitly its selected transport; a
profile with the block cannot silently downgrade. Credential references are displayed
as references, while private paths/material are redacted according to the bootstrap
rules above.

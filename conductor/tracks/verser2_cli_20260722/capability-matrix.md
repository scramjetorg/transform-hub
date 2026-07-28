# Capability Matrix: CLI to v2 Migration

**Counting unit:** one command leaf, plus one row for each distinct scoped variant;
aliases are not leaves. A distinct explicit target or output-mode invocation is a
variant where this design adds one. Total: **111 = 19 config + 4 scope + 9 space + 9 hub + 10
sequence + 19 instance + 8 topic + 1 init + 4 store + 1 util + 3 completion + 3
developerTools + 4 endpoint inventory + 12 config control + 5 log-format variants**.
Source for command ownership: `packages/cli/src/lib/commands/*.ts`; v2 routes: `packages/rest-api2/src/routes.ts`; Manager bindings: `packages/manager/src/lib/api/manager-api-v2.ts`;
Verser2 native capability facade: `packages/cli/src/lib/capabilities.ts`; raw API dispatch: `packages/cli/src/lib/commands/api.ts`.

All 111 variants are implemented: local commands remain local, native-v2-backed
commands use the Verser2 broker bridge and typed client via the capability facade,
explicitly unavailable commands throw exit-80 `CapabilityUnavailableError`, and
deferred store operations use the same exit-80 classification until the server
side is bound. No command silently falls back from Verser2 to HTTP/v1; the
HTTP/v1 client path remains active when no Verser2 profile is selected.

Key: `M`=Manager, `H`=Hub/Host, `MM`=MultiManager, `MW`=Middleware; `—`=none;
`u/d/x`=unary/downstream/upstream; `local`, `native`, `deferred`, `unavailable`
are current/target classifications as stated in the last column.

| Command variant | Owner | Ingress / target | Current v1 client / route | Planned v2 operation | Req | Res | Stream | Current → Target |
|---|---|---|---|---|---|---|---|---|
| config print | local | — | — | — | — | text | — | local → local |
| config session | local | — | — | — | — | text | — | local → local |
| config set json | local | — | — | — | JSON | — | — | local → local |
| config set apiUrl | local | — | — | — | text | — | — | local → local |
| config set log | local | — | — | — | options | — | — | local → local |
| config set middlewareApiUrl | local | — | — | — | text | — | — | local → local |
| config set scope | local | — | — | — | text | — | — | local → local |
| config set token | local | — | — | — | text | — | — | local → local |
| config set env | local | — | — | — | text | — | — | local → local |
| config reset apiUrl | local | — | — | — | — | — | — | local → local |
| config reset log | local | — | — | — | — | — | — | local → local |
| config reset middlewareApiUrl | local | — | — | — | — | — | — | local → local |
| config reset token | local | — | — | — | — | — | — | local → local |
| config reset env | local | — | — | — | — | — | — | local → local |
| config reset all | local | — | — | — | — | — | — | local → local |
| config profile list | local | — | — | — | — | text | — | local → local |
| config profile use | local | — | — | — | text | — | — | local → local |
| config profile create | local | — | — | — | text | — | — | local → local |
| config profile remove | local | — | — | — | text | — | — | local → local |
| scope list | local | — | — | — | — | text | — | local → local |
| scope print | local | — | — | — | text | text | — | local → local |
| scope use | local | — | — | — | text | — | — | local → local |
| scope delete | local | — | — | — | text | — | — | local → local |
| space info | M | manager / selected space | ManagerClient `GET /version` | space.version | — | JSON | u | HTTP/v1 retained; Verser2 native |
| space list | MM | multimanager / root | MiddlewareClient managers | root.spaces | — | JSON | u | HTTP/v1 retained; Verser2 native |
| space use | M | manager / named space | ManagerClient `GET /version` | ingress.identity + space.version | — | JSON | u | HTTP/v1 retained; Verser2 native |
| space audit | MM | multimanager / root | MiddlewareClient `GET /audit` | root.audit | — | stream | x | HTTP/v1 retained; Verser2 native where bound |
| space logs | M | manager / space | ManagerClient `GET /log` | space.logs | — | stream | x | HTTP/v1 retained; Verser2 native |
| space version | M | manager / space | ManagerClient `GET /version` | space.version | — | JSON | u | HTTP/v1 retained; Verser2 native |
| space access create | MW | platform | MiddlewareClient | — | JSON | JSON | u | unavailable → unavailable |
| space access list | MW | platform | MiddlewareClient | — | — | JSON | u | unavailable → unavailable |
| space access revoke | MW | platform | MiddlewareClient | — | options | JSON | u | unavailable → unavailable |
| hub use | M | manager / selected hub | ManagerClient `GET /hosts` | space.hubs + ingress.identity | — | JSON | u | current MW → native |
| hub list | M | manager / space | ManagerClient `GET /hosts` | space.hubs | — | JSON | u | current MW → native |
| hub info | M | manager / selected hub | Manager host inventory via `helpers/various.ts:getInfo()` → `ManagerClient GET /hosts` | space.hubs + hub.status | — | JSON | u | current MW inventory selection → native |
| hub disconnect | M | manager / space | ManagerClient `POST /disconnect` | space.deleteHub (disconnect query) | JSON | JSON | u | current MW → native |
| hub delete | M | manager / space | ManagerClient `DELETE /sth/:id` | space.deleteHub (delete query) | query | JSON | u | current MW → native |
| hub logs | H | hub / target hub | HostClient `GET /log` | hub.logs | — | stream | x | current HTTP → native |
| hub audit | H | hub / target hub | HostClient `GET /audit` | hub.audit | — | stream | x | current HTTP → native |
| hub load | H | hub / target hub | HostClient `GET /load-check` | hub.load | — | JSON | u | current HTTP → native |
| hub version | H | hub / target hub | HostClient `GET /version` | hub.version | — | JSON | u | current HTTP → native |
| seq list | H | hub | HostClient `GET /sequences` | hub.sequences | — | JSON | u | current HTTP → native |
| seq use | H | hub | HostClient `GET /sequence/:id` | sequence.getSequence | — | JSON | u | current HTTP → native |
| seq info | H | hub | HostClient `GET /sequence/:id` | sequence.getSequence | — | JSON | u | current HTTP → native |
| seq pack | local | — | — | — | files | file | — | local → local |
| seq send | H | hub | HostClient `POST /sequence` | sequence.sendSequence | stream | JSON | d | current contract-only → native after Phase 3 parity |
| seq update | H | hub | SequenceClient `PUT /sequence/:id` | sequence.updateSequence | stream | JSON | d | current contract-only → native after Phase 3 parity |
| seq start | H | hub | SequenceClient `POST /sequence/:id/start` | sequence.startSequence | JSON | JSON | u | current HTTP → native |
| seq deploy | H | hub | pack + send + start | composite | stream | JSON | d | current missing upload parity → native after Phase 3 parity |
| seq delete | H | hub | HostClient `DELETE /sequence/:id` | sequence.deleteSequence | — | JSON | u | current HTTP → native |
| seq prune | H | hub | repeated delete | repeated deleteSequence | — | JSON | u | current HTTP → native |
| inst list | H | hub | HostClient `GET /instances` | hub.instances | — | JSON | u | current HTTP → native |
| inst use | H | hub | HostClient `GET /instance/:id` | instance.info | — | JSON | u | current HTTP → native |
| inst info | H | hub | InstanceClient `GET /instance/:id` | instance.info | — | JSON | u | current HTTP → native |
| inst health | H | hub | InstanceClient `GET /instance/:id/health` | instance.health | — | JSON | u | current HTTP → native |
| inst log | H | hub | InstanceClient `GET /instance/:id/log` | instance.logs | — | stream | x | current HTTP → native |
| inst kill | H | hub | InstanceClient `POST /instance/:id/_kill` | instance.deleteInstance | JSON | JSON | u | native |
| inst stop | H | hub | InstanceClient `POST /instance/:id/_stop` | instance.deleteInstance | JSON | JSON | u | native |
| inst restart | H | hub | info → immediate kill → wait for disappearance → start | GET info → DELETE stop → DELETE kill if stop fails → POST start | JSON | JSON | u | native (stop → kill-if-failed → start) |
| inst input | H | hub | InstanceClient `POST /instance/:id/input` | instance.input | stream | stream | d | current HTTP → native |
| inst inout | H | hub | InstanceClient `POST /instance/:id/inout` | — | stream | stream | duplex | current route missing → unavailable (native has no coupled duplex) |
| inst output | H | hub | InstanceClient `GET /instance/:id/output` | instance.output | — | stream | x | current HTTP → native |
| inst stdio | H | hub | stdin/stdout/stderr routes | instance.stdioRead/Write | stream | stream | both | current HTTP → native |
| inst event emit | H | hub | InstanceClient `POST /instance/:id/_event` | instance.sendEvent | JSON | JSON | u | current HTTP → native |
| inst event on | H | hub | InstanceClient `GET /instance/:id/event/:name` | instance.getEvent | — | JSON | u | current HTTP → native |
| inst event on --next | H | hub | InstanceClient `GET /instance/:id/once/:name` | instance.getNextEvent | — | JSON | u | current HTTP → native |
| inst event on --stream | H | hub | InstanceClient `GET /instance/:id/events/:name` | — | — | stream | x | current route missing → unavailable (no v2 event stream operation) |
| inst stdin | H | hub | InstanceClient `PUT /instance/:id/stdin` | instance.stdioWrite | stream | stream | d | current HTTP → native |
| inst stderr | H | hub | InstanceClient `GET /instance/:id/stderr` | instance.stdioRead | — | stream | x | current HTTP → native |
| inst stdout | H | hub | InstanceClient `GET /instance/:id/stdout` | instance.stdioRead | — | stream | x | current HTTP → native |
| topic create (hub) | H | hub | HostClient v2 `POST /topics` | hub.createTopic | JSON | JSON | u | current HTTP → native |
| topic delete (hub) | H | hub | HostClient v2 `DELETE /topics/:name` | hub.deleteTopic | — | JSON | u | current HTTP → native |
| topic get (hub) | H | hub | HostClient v2 `GET /topics/:name/stream` | hub.topicRead | — | stream | x | current HTTP → native |
| topic send (hub) | H | hub | HostClient v2 `POST /topics/:name/stream` | hub.topicWrite | stream | JSON | d | current HTTP → native |
| topic list (hub) | H | hub | HostClient v2 `GET /topics` | hub.topics | — | JSON | u | current HTTP → native |
| topic get (space) | M | manager / space | ManagerClient topic stream | space.topicRead | — | stream | x | current MW → native |
| topic send (space) | M | manager / space | ManagerClient topic stream | space.topicWrite | stream | JSON | d | current MW → native |
| topic list (space) | M | manager / space | ManagerClient `GET /topic` | space.topics | — | JSON | u | current MW → native |
| init sequence | local | — | — | — | args | files | — | local → local |
| store list | M | manager / space | ManagerClient `GET s3` | space.storageSequences | — | JSON | u | current MW → native |
| store send | M | manager / space | ManagerClient `PUT s3/:id` | — | stream | JSON | d | current binding skipped → unavailable (exit-80 until server bound) |
| store delete | M | manager / space | ManagerClient `DELETE s3/:id` | — | — | JSON | u | current binding skipped → unavailable (exit-80 until server bound) |
| store prune | M | manager / space | ManagerClient `DELETE /store` | space.storageClear | — | JSON | u | current MW → native |
| util log-format | local | — | — | — | stdin | text | — | local → local |
| completion install | local | — | — | — | — | files | — | local → local |
| completion uninstall | local | — | — | — | — | files | — | local → local |
| completion (script output) | local | — | bundled shell script | completion script generator | — | shell text | — | local → local |
| dev cmdToJson | local | — | — | — | options | file | — | local → local |
| dev cmdToList | local | — | — | — | options | file | — | local → local |
| dev cmdToMd | local | — | — | — | options | file | — | local → local |
| api endpoints (platform) | MM | platform / root | none | — | — | OpenAPI/Markdown | u | planned → unavailable (explicit exit-80 placeholder) |
| api endpoints (space) | M | space / target space | none | — | — | OpenAPI/Markdown | u | planned → unavailable (explicit exit-80 placeholder) |
| api endpoints (hub) | H | hub / target hub | none | — | — | OpenAPI/Markdown | u | planned → unavailable (explicit exit-80 placeholder) |
| api endpoints (instance) | H | hub / target instance | none | — | — | OpenAPI/Markdown | u | planned → unavailable (explicit exit-80 placeholder) |
| space config get | M | space | ManagerClient `GET /config` where available | — | — | JSON | u | current partial → unavailable (explicit exit-80 placeholder) |
| space config set | M | space | none | planned space.configSet | JSON | JSON | u | current missing → unsupported placeholder, then native |
| space config reload | M | space | none | planned space.configReload | — | JSON | u | current missing → unsupported placeholder, then native |
| hub config get | H | hub | none in current CLI | GET /api/v2/config via native facade | — | JSON | u | native (bound natively; falls to exit-80 without Verser2 profile) |
| hub config set | H | hub | none | planned hub.configSet | JSON | JSON | u | current missing → unsupported placeholder, then native |
| hub config reload | H | hub | none | planned hub.configReload | — | JSON | u | current missing → unsupported placeholder, then native |
| sequence config get | H | hub / sequence | none | planned sequence.config | — | JSON | u | current missing → unsupported placeholder, then native |
| sequence config set | H | hub / sequence | none | planned sequence.configSet | JSON | JSON | u | current missing → unsupported placeholder, then native |
| sequence config reload | H | hub / sequence | none | planned sequence.configReload | — | JSON | u | current missing → unsupported placeholder, then native |
| instance config get | H | hub / instance | none | planned instance.config | — | JSON | u | current missing → unsupported placeholder, then native |
| instance config set | H | hub / instance | none | planned instance.configSet | JSON | JSON | u | current missing → unsupported placeholder, then native |
| instance config reload | H | hub / instance | none | planned instance.configReload | — | JSON | u | current missing → unsupported placeholder, then native |
| space audit --log-format | MM | platform / root | MiddlewareClient `GET /audit` | root.audit | — | formatted text | x | HTTP/v1 retained; Verser2 native where bound |
| space logs --log-format | M | space | ManagerClient `GET /log` | space.logs | — | formatted text | x | HTTP/v1 retained; Verser2 native |
| hub logs --log-format | H | hub | HostClient `GET /log` | hub.logs | — | formatted text | x | HTTP/v1 retained; Verser2 native |
| hub audit --log-format | H | hub | HostClient `GET /audit` | hub.audit | — | formatted text | x | HTTP/v1 retained; Verser2 native |
| inst log --log-format | H | hub / instance | InstanceClient `GET /instance/:id/log` | instance.logs | — | formatted text | x | HTTP/v1 retained; Verser2 native |

### Planned uniform ingress identity

`GET /api/v2/ingress/identity` is an **implemented** authenticated v2 operation bound
at `platform` (MultiManager), enabled `space` (Manager) ingress, and the dedicated
`hub` (Host) CLI listener. It
returns `{ level, serviceId, routeDomain }`. The native capability facade and raw
API commands both verify identity before every session's first business request:
(1) connect with mTLS; (2) wait for the exact configured domain; (3) call identity
over that domain; (4) require exact matches for configured `expectedId`, ingress
`level`, and `routeDomain`; (5) only then issue the business request. Failure at
any step is terminal and never falls back to an alternate domain or HTTP.

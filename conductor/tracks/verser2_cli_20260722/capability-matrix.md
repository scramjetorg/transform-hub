# Capability Matrix: CLI to v2 Migration

**Counting unit:** one command leaf, plus one row for each distinct scoped variant;
aliases are not leaves. Total: **89 = 19 config + 4 scope + 9 space + 9 hub + 10
sequence + 19 instance + 8 topic + 1 init + 4 store + 1 util + 2 completion + 3
developerTools**. `Current` records current code; `Target` is planned, never an
assertion that a CLI component exists. Source for command ownership: `packages/cli/src/lib/commands/*.ts`; v2 routes: `packages/rest-api2/src/routes.ts`; Manager bindings: `packages/manager/src/lib/api/manager-api-v2.ts`.

This is the intended full 89-variant named-command matrix. Phase 2 supplies shared
transport/config; Phase 4 migrates the named commands. Planned profile ingress
levels are `platform` (MultiManager), `space` (Manager), and `hub` (Host).

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
| space info | M | manager / selected space | ManagerClient `GET /version` | space.version | — | JSON | u | current MW → native |
| space list | MM | multimanager / root | MiddlewareClient managers | root.spaces | — | JSON | u | current MW → native |
| space use | M | manager / named space | ManagerClient `GET /version` | ingress.identity + space.version | — | JSON | u | current MW → native |
| space audit | MM | multimanager / root | MiddlewareClient `GET /audit` | root.audit | — | stream | x | current MW → native |
| space logs | M | manager / space | ManagerClient `GET /log` | space.logs | — | stream | x | current MW → native |
| space version | M | manager / space | ManagerClient `GET /version` | space.version | — | JSON | u | current MW → native |
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
| inst kill | H | hub | InstanceClient `POST /instance/:id/_kill` | instance.deleteInstance | JSON | JSON | u | current semantics missing → native after Phase 3 parity |
| inst stop | H | hub | InstanceClient `POST /instance/:id/_stop` | instance.deleteInstance | JSON | JSON | u | current semantics missing → native after Phase 3 parity |
| inst restart | H | hub | kill + start | composite | JSON | JSON | u | current kill/stop parity missing → native after Phase 3 parity |
| inst input | H | hub | InstanceClient `POST /instance/:id/input` | instance.input | stream | stream | d | current HTTP → native |
| inst inout | H | hub | InstanceClient `POST /instance/:id/inout` | planned instance.inout | stream | stream | duplex | current route missing → native after Phase 3 parity |
| inst output | H | hub | InstanceClient `GET /instance/:id/output` | instance.output | — | stream | x | current HTTP → native |
| inst stdio | H | hub | stdin/stdout/stderr routes | instance.stdioRead/Write | stream | stream | both | current HTTP → native |
| inst event emit | H | hub | InstanceClient `POST /instance/:id/_event` | instance.sendEvent | JSON | JSON | u | current HTTP → native |
| inst event on | H | hub | InstanceClient `GET /instance/:id/event/:name` | instance.getEvent | — | JSON | u | current HTTP → native |
| inst event on --next | H | hub | InstanceClient `GET /instance/:id/once/:name` | instance.getNextEvent | — | JSON | u | current HTTP → native |
| inst event on --stream | H | hub | InstanceClient `GET /instance/:id/events/:name` | planned instance.eventStream | — | stream | x | current route missing → native after Phase 3 parity |
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
| store send | M | manager / space | ManagerClient `PUT s3/:id` | space.storageObjectWrite | stream | JSON | d | current binding skipped → deferred |
| store delete | M | manager / space | ManagerClient `DELETE s3/:id` | space.storageObjectDelete | — | JSON | u | current binding skipped → deferred |
| store prune | M | manager / space | ManagerClient `DELETE /store` | space.storageClear | — | JSON | u | current MW → native |
| util log-format | local | — | — | — | stdin | text | — | local → local |
| completion install | local | — | — | — | — | files | — | local → local |
| completion uninstall | local | — | — | — | — | files | — | local → local |
| dev cmdToJson | local | — | — | — | options | file | — | local → local |
| dev cmdToList | local | — | — | — | options | file | — | local → local |
| dev cmdToMd | local | — | — | — | options | file | — | local → local |

### Planned uniform ingress identity

`GET /api/v2/ingress/identity` is a **planned**, authenticated v2 operation bound
at `platform` (MultiManager), enabled `space` (Manager) ingress, and the dedicated
`hub` (Host) CLI listener. It
returns `{ level, serviceId, routeDomain }`. No current route claims this operation.
For every remote request: (1) connect with mTLS; (2) wait for the exact configured
domain; (3) call identity over that domain; (4) require exact matches for configured
`expectedId`, ingress `level`, and `routeDomain`; (5) only then issue the business
request. Failure at any step is terminal and never falls back.

# Sequence Writing Guide Map

This inventory is the context-recovery index. It distinguishes documentation,
capability work, and synthetic test evidence.

| Area | Phases | Dry guide | Wet guide | Case | Opening synthetic progression | Capability |
|---|---|---|---|---|---|---|
| Lifecycle | 2, 6 | `docs-source/sequences/sequence-lifecycle.md` | `docs-source/examples/lifecycle-local-validation-service.md` | [Server Fault](https://serverfault.com/questions/412134/server-unreachable-best-way-to-find-out-the-cause) | validate → deferred listener → active; failure → log/event → errored | readiness |
| Control | 3, 6 | `docs-source/sequences/sequence-control.md` | `docs-source/examples/customer-site-health-control.md` | [Server Fault](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet) | health → Hub/Manager; stop → flush; kill → cleanup | health and control conformance |
| API exposure | 2, 6 | `docs-source/sequences/sequence-api-exposure.md` | `docs-source/examples/mcp-bridged-job-status.md` | [Galaxy/Loom #74](https://github.com/galaxyproject/loom/issues/74) | deferred listener → bounded API/stream | readiness and autostart |
| Communication | 4, 6 | `docs-source/sequences/sequence-communication.md` | `docs-source/examples/local-object-filter-to-consumer.md` | [NVIDIA AIStore #305](https://github.com/NVIDIA/aistore/issues/305) | source → filter → consumer; event transient | Hub/Space contract |
| Topics | 4, 6 | `docs-source/sequences/sequence-topics.md` | `docs-source/examples/customer-site-topic-probe-pipeline.md` | [Server Fault](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet) | create → publish → input/output route; disconnect | Hub/Space topic parity |
| Testing | 1, 6 | `docs-source/testing/testing-sequences.md` | `docs-source/examples/tested-incremental-log-aggregator.md` | [DVC #829](https://github.com/treeverse/dvc/issues/829) | input → file-backed mock cursor → aggregate; store failure | fixture extensions only |
| AppContext parity | 5, 6 | `docs-source/sequences/sequence-app-context.md` | `docs-source/examples/app-context-health-parity.md` | [Server Fault](https://serverfault.com/questions/96468/how-to-monitor-multiple-remote-sites-over-the-internet) | equivalent health/details, event, log, lifecycle, clients | runtime conformance |
| Resources/state | 1 | `docs-source/sequences/sequence-configuration-resources-state.md` | `docs-source/examples/source-side-data-summary.md` | [Open Energy Platform #2362](https://github.com/OpenEnergyPlatform/oeplatform/issues/2362) | rules → source → summary → file-backed mock cursor | resource/store boundaries |

## Delivery and validation decisions

- Wet examples use inline executable Markdown code, not maintained example
  packages. Contract-bearing TypeScript/Python snippets are compiled or
  extraction-tested; Compose YAML is extracted to temporary test files for the
  MCP smoke only.
- The MCP walkthrough uses a private Hub-only Compose topology with a
  file-loaded/autostarted sequence; the Node MCP SDK bridge runs separately
  against that private Hub. Private-network/tunnel, MCP bridge, and sequence
  API ownership/security boundaries remain separate.
- The file-backed mock cursor is fixture- and documentation-only, requires no
  external service, and is an ordinary sequence-local temporary file rather than
  a Compose service, container, or production recommendation. Guides state its
  local-path, cleanup, durability/failure limitations, and non-transactional
  semantics; `this.save()` is not documented as checkpointing.
- Every phase starts with synthetic fixture tests. Full wet walkthroughs are not
  fixture tests; targeted runtime/API/CLI/Manager/Compose tests prove only
  changed contracts.

## Phase and publication matrix

| Phase | First test work | Deliver | Publication gate |
|---|---|---|---|
| 1. No-change docs | Resource, source-summary, file-backed mock cursor/store-failure fixtures | Resources/state and testing pairs; navigation/indexes | No unimplemented claim |
| 2. Readiness/autostart | Validation, deferred listener, readiness, file loading, autostart fixtures | Runtime/host/config readiness and Compose startup | Lifecycle/API/MCP claims pass |
| 3. Health/control | Details merge, malformed handler, stop/kill/error/state fixtures | Health propagation and Hub/Manager control | Control claims pass |
| 4. Topics | Names, routes, content types, routing, reconnect/no replay fixtures | Settled Hub/Space contract and clients/routing | Communication/topic claims pass |
| 5. Runtime parity | Node/Python/Bun AppContext conformance fixtures | Shared/runtime parity changes | Parity matrix claims pass |
| 6. Dependent docs | Guide progression and snippet extraction fixtures | Lifecycle, control, API/MCP, communication, topics, parity guides and collateral docs | Every claim links to passing evidence |

## Ownership and collateral inventory

| Contract | Owners | Targeted integration |
|---|---|---|
| Readiness/API | `runner-*`, `host`, `sequence-test` | Hub API and Compose smoke |
| Health/control/parity | `runtime-types`, `sequence-types`, runtime wrappers, `host`, `manager`, `cli` | runtime parity, Hub/Manager API, CLI |
| Topics/communication | `host`, `manager`, `api-client`, `rest-api2`, `cli`, sequence clients/types | Hub/Space API/CLI and reconnect |
| Autostart/MCP | `config`, `sth`, `host`, docs generator | Compose readiness smoke |

Update `writing-sequences.md`, `sequence-monitoring.md`,
`packaging-deploying.md`, relevant API/client/CLI/Manager/Host/runner/runtime/
configuration/sequence-test references, navigation, generated references, and
`docs/` output whenever changed contracts affect them.

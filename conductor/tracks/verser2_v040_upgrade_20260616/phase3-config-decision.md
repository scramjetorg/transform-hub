# Phase 3 Configuration Decision

## Decision

Do not add new public verser2 configuration fields for Phase 3 upstream Host federation.

The STH-local hub-level verser2 Host should connect to the Manager/MultiManager Host using the existing STH outbound verser2 settings:

- `verser2.hostUrl` as the upstream Host URL;
- `verser2.tls` as the upstream client trust/identity material;
- `verser2.enabled` and `verser2.runnerHost.enabled` as the existing feature gates.

## Rationale

- `STHOutboundVerser2Config.hostUrl` already means “the Manager/MultiManager verser2 Host this STH connects to”. Repeating the same endpoint under `runnerHost.upstream`, `managerUpstream`, or a new `upstreams` array would duplicate configuration and create drift risk.
- Phase 3 has exactly one required upstream: the owning Manager Host. Multiple upstreams, failover upstreams, or a runner-only upstream URL are not yet proven requirements.
- Existing operator controls are sufficient for this phase: `verser2.enabled`, `verser2.hostUrl`, `verser2.tls`, `verser2.runnerHost.enabled`, and the existing CPM/platform connection state.
- Adding public fields would require schema, default, CLI/env, public masking, docs, and tests without changing the current architecture.
- `ManagerVerser2Config` describes the Manager/MultiManager local listening Host. Adding Manager outbound upstream config now would model the wrong owner for the Phase 3 sequence-to-space path.

## Implementation direction

When the STH-local runner Host is enabled and the STH is configured to connect to a Manager, Host startup should call verser2 v0.4.0 upstream federation roughly as:

```ts
await runnerVerser2Host.connectUpstream({
  upstreamId: "manager",
  url: config.verser2.hostUrl,
  tls: createVerser2ClientTlsOptions(config.verser2.tls)
});
```

This keeps the tunnel settings internal and derived from the existing Manager connection contract.

## Deferred public config

Revisit public configuration only if one of these concrete requirements appears:

- multiple upstream Manager Hosts;
- upstream failover policy;
- a runner/sequence-only upstream Host different from `verser2.hostUrl`;
- an operator policy to disable Host federation while preserving ordinary Manager registration;
- proxy/tunnel credentials or transport settings that cannot be represented by the existing TLS/URL fields.

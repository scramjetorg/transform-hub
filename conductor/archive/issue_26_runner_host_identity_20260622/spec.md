# Specification: Fix Issue 26 - Auto-Derive Unique STH Runner Verser2 Host Identities

## Overview

Fix GitHub issue #26 by replacing the unsafe static default STH runner Verser2 broker identity with an automatic, host-ID-derived identity. Multi-STH deployments connected to the same Manager/MultiManager must no longer collide on the runner Host ID derived from `verser2.runnerHost.localBroker.peerId`.

Today, multiple STH instances using `verser2.runnerHost.enabled=true` can inherit the same default broker peer ID:

```text
sth.default.runner.broker
```

That derives to the same federated runner Host ID:

```text
sth.default.runner.broker.host
```

The fix should make the default behavior stable and unique per STH while preserving explicit custom configuration.

## Track Type

Bug fix / operational correctness.

## Functional Requirements

1. The default `verser2.runnerHost.localBroker.peerId` must become an automatic sentinel value rather than the unsafe static broker ID.
2. When the runner Host local broker peer ID is automatic, Host startup must resolve it from the owning STH host ID.
3. For STH host ID `<hostId>`, the derived runner broker peer ID must be:

```text
sth.<hostId>.runner.broker
```

4. The derived runner Verser2 Host ID must remain based on the existing derivation rule:

```text
<runnerHost.localBroker.peerId>.host
```

5. Explicit custom `verser2.runnerHost.localBroker.peerId` values must be preserved unchanged.
6. Explicit legacy configuration using `sth.default.runner.broker` must not be silently accepted as safe. It should produce a clear actionable warning when `runnerHost.enabled=true`.
7. Host startup must ensure a stable host ID is available before resolving automatic runner Host identity.
8. The same resolved STH host ID must be used consistently for runner Host identity and Manager registration.
9. The warning for unsafe legacy config must explain that the value is unsafe for multi-STH deployments and recommend `auto` or a unique value such as `sth.<hostId>.runner.broker`.

## Non-Functional Requirements

1. Preserve backwards compatibility for explicit custom peer IDs.
2. Avoid security-sensitive Manager/MultiManager auto-trust changes in this track.
3. Avoid changing main STH Verser2 broker/guest semantics.
4. Avoid deriving identity from unstable runtime details such as ports, URLs, random per-start values, or identity directory paths.
5. Keep the change narrow and covered by focused package tests.

## Acceptance Criteria

1. A default STH runner Host configuration no longer resolves to `sth.default.runner.broker` when a host ID is available.
2. With host ID `ca-hub-e2e-01`, automatic resolution produces:

```text
sth.ca-hub-e2e-01.runner.broker
```

and the runner Host ID becomes:

```text
sth.ca-hub-e2e-01.runner.broker.host
```

3. Explicit custom peer IDs remain unchanged.
4. Explicit `sth.default.runner.broker` emits a warning when runnerHost is enabled.
5. Missing host ID during automatic resolution fails clearly or is prevented by earlier host ID resolution.
6. Focused package tests cover default derivation, custom override preservation, unsafe legacy warning behavior, and relevant config/default changes.
7. Targeted package build succeeds.

## Out of Scope

1. Manager/MultiManager auto-trust or automatic registration of internal runner hosts.
2. Changing the main STH `verser2.broker` or `verser2.guest` identity model.
3. Changing runner per-instance route domains.
4. Full downstream drumwave-integration E2E validation.
5. Hard-failing explicit legacy config; this track should warn only.
6. Broad duplicate federated Host ID error-message redesign, unless a tiny local warning/log improvement is needed to support this fix.

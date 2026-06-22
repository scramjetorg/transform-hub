# Fix Issue 26 - Auto-Derive Unique STH Runner Verser2 Host Identities

## Intended outcome

This track fixes issue #26 by replacing the unsafe static default STH-local runner Verser2 broker identity with automatic host-ID-derived resolution.

## Planned behavior

- Default `verser2.runnerHost.localBroker.peerId` is `auto`.
- Host startup resolves `auto` to `sth.<hostId>.runner.broker` using the stable STH host ID.
- Runner Verser2 Host ID derivation remains `<resolvedPeerId>.host`.
- Explicit custom runner broker peer IDs remain unchanged.
- Explicit legacy `sth.default.runner.broker` emits an actionable warning when runner Host is enabled.
- No Manager/MultiManager trust model or main STH broker/guest identity semantics change.

## Validation target

- Focused host tests for runner Host identity derivation and warnings.
- Focused sth-config tests for defaults.
- Focused config tests if option help/validation changes are made.
- Targeted package build for changed packages.

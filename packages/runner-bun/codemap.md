# packages/runner-bun/

## Responsibility

Bun runtime facade package for the outer runner. Validates Bun boot config (including `verser2Runtime` block), supports direct no-host execution path, delegates host-integrated execution to `runner-node`, and provides verser2 guest/broker connectivity for direct Bun mode.

## Design / Patterns

- **Path bifurcation by host presence**:
  - no host channels in boot config → direct sequence require/invocation in Bun (optionally with verser2 guest/broker via `verser2-runtime.ts`);
  - host channels present → spawn `runner-node` process for protocol compatibility.
- **Verser2 runtime support in Bun**: `verser2-runtime.ts` provides `createBunSequenceGuest()` (creates `@signicode/verser2-guest-bun` guest with API exposure handler) and `createBunHubFetch()` (creates verser2 broker for hub API calls). `BunSequenceApiExposure` manages deferred handler attachment to the guest.
- **Strict contract reuse**: Bun runtime reads/writes the same boot config shape as Node (including `verser2Runtime`), reuses the same monitoring/control semantics.
- **Runtime resolution strategy**: resolves bundled or source `runner-node` entry dynamically for source-tree and package usage.

## Data & Control Flow

`bin/runner-bun.ts` reads `argv[2]`, validates boot config (including `verser2Runtime`), then:

- **Direct mode** (no host): `require(sequencePath)`, invoke exported functions with input stream + args. If verser2 config is present, `startBunSequenceGuest()` and `createBunHubFetch()` provide API exposure and hub fetch capability.
- **Delegation mode**: spawn Node with resolved `runner-node` entry and forwarded boot-config path (including verser2Runtime block).

Monitoring and exit behavior follows Node's status model; Bun acts as an execution decision layer with optional verser2 connectivity.

## Integration Points

Depends on boot-config contract and parser from `@scramjet/runner-bun`, delegate contract to `@scramjet/runner-node`, `@signicode/verser2-guest-bun` for verser2 guest/broker, and runtime symbols/messaging shared with the outer runner stack.

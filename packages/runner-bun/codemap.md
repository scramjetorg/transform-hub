# packages/runner-bun/

## Responsibility

Bun runtime facade package for the outer runner. Validates Bun boot config, supports direct no-host execution path, and delegates host-integrated execution to `runner-node`.

## Design / Patterns

- **Path bifurcation by host presence**:
  - no host channels in boot config → direct sequence require/invocation in Bun;
  - host channels present → spawn `runner-node` process for protocol compatibility.
- **Strict contract reuse**: Bun runtime reads/writes the same boot config shape as Node and reuses the same monitoring/control semantics.
- **Runtime resolution strategy**: resolves bundled or source `runner-node` entry dynamically for source-tree and package usage.

## Data & Control Flow

`bin/runner-bun.ts` reads `argv[2]`, validates boot config, then:

- **Direct mode** (no host): `require(sequencePath)`, invoke exported functions with input stream + args.
- **Delegation mode**: spawn Node with resolved `runner-node` entry and forwarded boot-config path.

Monitoring and exit behavior follows Node's status model; Bun acts as an execution decision layer.

## Integration Points

Depends on boot-config contract and parser from `@scramjet/runner-bun`, delegate contract to `@scramjet/runner-node`, and runtime symbols/messaging shared with the outer runner stack.

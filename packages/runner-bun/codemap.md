# packages/runner-bun/

## Responsibility

Bun runtime facade package for the outer runner. Validates Bun boot config (including `verser2Runtime` block), requires the hosted runner path (throws if host coordinates are absent), and delegates execution to `runner-node`. The `verser2Runtime` block is validated and forwarded to the Node delegate; Bun itself no longer instantiates verser2 guest/broker connectivity.

## Design / Patterns

- **Single supported execution path**: host channels are required and Bun delegates the sequence to `runner-node` for the complete AppContext contract. Direct/headless sequence invocation in Bun is rejected at startup.
- **Verser2 runtime block passthrough**: `verser2Runtime` config is validated by the Bun boot-config parser but only forwarded to Node's delegate — Bun does not use verser2 helpers locally anymore.
- **Strict contract reuse**: Bun runtime reads/writes the same boot config shape as Node (including `verser2Runtime`), reuses the same monitoring/control semantics.
- **Runtime resolution strategy**: resolves bundled or source `runner-node` entry dynamically for source-tree and package usage.
- **Bun-native test runner**: uses `bun:test` (not AVA) with `mock.module()` for module mocking and native TypeScript support.
- **Legacy env var isolation**: explicitly deletes `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` from process env before delegation to prevent contamination.

## Data & Control Flow

`bin/runner-bun.ts` reads `argv[2]`, validates boot config (including `verser2Runtime`), requires host coordinates (throws if absent), then spawns Node with the resolved `runner-node` entry and forwarded boot-config path. It uses `stdio: [inherit, inherit, inherit, ipc, inherit, inherit]` and therefore exposes the same hosted AppContext behavior as Node.

Monitoring and exit behavior follows Node's status model; Bun acts as an execution decision layer only.

## Integration Points

Depends on boot-config contract and parser from `@scramjet/runner-bun`, delegate contract to `@scramjet/runner-node`, and runtime symbols/messaging shared with the outer runner stack. Verser2 runtime symbols (`BunSequenceApiExposure`, `createBunHubFetch`, `createBunSequenceGuest`, `startBunSequenceGuest`) remain exported from the package `index.ts` for external consumers but are no longer used by the Bun entrypoint.

Tests cover boot-config parity, hosted-delegation rejection of headless config, and boot-config validation (including verser2 block).

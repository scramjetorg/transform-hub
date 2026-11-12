# packages/runner-bun/

## Responsibility

Native Bun sequence runtime for adapter-launched hosted Bun sequences. Requires Bun 1.4.2+, validates boot config (including `verser2Runtime`), and invokes the shared `runner-node` bootstrap in the same process with Bun-specific fd4/fd5 streams. Sequence author code executes under Bun; no Node child or `NODE_BIN` fallback is used. The outer Hub/runner coordinator may remain Node-based.

## Design / Patterns

- **Single supported execution path**: host channels are required. Bun executes the sequence natively while reusing the shared bootstrap and complete AppContext contract; direct/headless invocation is rejected.
- **Bun-compatible host transport**: the shared runner constructs the verser2 Broker/Agent under Bun; runner-bun supplies validated verser2 config and the supported node-fetch Agent implementation.
- **Strict contract reuse**: Bun passes the validated boot config and a Bun-specific fd stream factory into the shared bootstrap, preserving control, monitoring, lifecycle, and output behavior.
- **Runtime floor**: Bun 1.4.2 or newer is required for Agent-aware routed Hub/Space requests.
- **Bun-native test runner**: uses `bun:test` (not AVA) with `mock.module()` for module mocking and native TypeScript support.
- **Legacy env var isolation**: explicitly deletes `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` before entering the shared bootstrap to prevent contamination.

## Data & Control Flow

`bin/runner-bun.ts` verifies Bun 1.4.2+, reads `argv[2]`, validates boot config and hosted coordinates, clears legacy sequence env vars, then calls the exported `@scramjet/runner-node.bootstrap()` in-process with the config and `createBunFdStreams()`. fd4 is bridged from `Bun.file(4).stream()` to a Node Readable; fd5 is a flushed Writable. fd3 remains reserved for process IPC.

Shared lifecycle and monitoring retain the Node runner's protocol semantics. Runtime identity and exit artifacts use the actual Bun process PID. Bun's built-in Node compatibility is used for the supported shared runtime surface; this is not a claim that arbitrary Node packages or native addons work.

## Integration Points

Depends on the boot-config parser from `@scramjet/runner-bun`, the in-process bootstrap contract from `@scramjet/runner-node`, runtime symbols/messaging, Bun's `Bun.file` Web stream, and installed node-fetch used with verser2 Agents. Existing Verser2 helper exports remain available; the entrypoint does not spawn another runtime process.

Tests cover boot-config validation, native Bun process identity, Node-compatible sequence behavior, fd4/fd5 framing and lifecycle, Agent routing, and rejection of unsupported Bun versions.

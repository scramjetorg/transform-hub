# Runner Runtime Wrappers

## Overview

`packages/runner` is the outer runner after the 013 worker isolation split and the 014 Python wrapper extension. From the host perspective, it is the single launcher and executor selector for runtime-specific wrappers, while sequence packages stay language-agnostic.

```text
┌───────────────────────────────────────────────────┐
│                   Host / Adapter                   │
│   spawns packages/runner (Node.js)                │
│                                                    │
│   ┌──────────────────────────────────────────┐     │
│   │          packages/runner                 │     │
│   │  selectExecutor(config) → RuntimeExecutor│     │
│   │  ┌──────────┐  ┌───────────────────┐    │     │
│   │  │ Node     │  │ Python            │    │     │
│   │  │Executor  │  │Executor           │    │     │
│   │  └────┬─────┘  └─────┬─────────────┘    │     │
│   │       │              │                   │     │
│   │       │ spawn        │ spawn             │     │
│   │       ▼              ▼                   │     │
│   │  ┌──────────┐  ┌──────────────┐         │     │
│   │  │runner-   │  │runner-python │         │     │
│   │  │node      │  │(python3 -m   │         │     │
│   │  │          │  │ runner_python│         │     │
│   │  └──────────┘  │ <bootConfig>)│         │     │
│   │                └──────────────┘         │     │
│   └──────────────────────────────────────────┘     │
└───────────────────────────────────────────────────┘
```

## RuntimeExecutor Interface

The canonical TypeScript schema lives in `packages/types/src/runtime-executor.ts`.

The interface is intentionally small and stays at:

```ts
{ kind: RuntimeKind; spawn(opts: SpawnOptions): RuntimeProcessHandles }
```

Contract notes:

- `kind` identifies the runtime wrapper.
- `spawn(opts)` returns the child process plus the four byte channels used by the outer runner.
- The returned handles cover stdout, stderr, fd4 control, and fd5 monitoring.
- `selectExecutor(config): RuntimeExecutor` is the free function in `packages/runner/src/executor/select.ts` that picks the wrapper.

## fd Layout

| fd | Role | Direction | Owner |
|----|------|-----------|-------|
| 0  | stdin | host -> wrapper stdin | outer runner |
| 1  | stdout | wrapper stdout -> host | outer runner |
| 2  | stderr | wrapper stderr -> host | outer runner |
| 3  | IPC (reserved) | unused raw byte channel | reserved by Node |
| 4  | control | host <-> wrapper (CRLF JSON) | outer runner writes, wrapper reads |
| 5  | monitoring | wrapper -> host (CRLF JSON) | wrapper writes, host reads |

fd3 is reserved by Node.js for IPC. When Node spawns a child with `"ipc"` in the stdio array position 3, the child gets `process.channel`. This transport never sends IPC messages, so fd3 stays unused as a raw byte channel.

## Channel Ownership

Ownership is split by responsibility, not by language:

- Outer runner owns `STDIN`, `STDOUT`, `STDERR`, `CONTROL` on fd4, and `MONITORING` on fd5.
- Wrapper opens directly, via TCP to instances server, `IN`, `OUT`, and `LOG`.
- Node wrapper API requests use the runner verser2 runtime when one is provided.
- Python wrapper does not open a request channel.
- fd3 remains reserved IPC.

## Boot-config Protocol

Boot config is a JSON file path passed as the last positional CLI argument.

- `runner-node` reads it from `process.argv[2]`, spawned as `["<entry>", bootConfigPath]`.
- `runner-python` reads it from `sys.argv[1]`, spawned as `["-m", "runner_python", bootConfigPath]`.
- The schema source of truth is `packages/types/src/runtime-executor.ts`.
- Validators live in `packages/runner-node/src/boot-config.ts:validateBootConfig` and `packages/runner-python/src/runner_python/boot_config.py`.
- Lifecycle is simple, outer runner writes a private temp file, child reads it, outer runner removes it after child exit.

## Frame Codec

Control on fd4 and monitoring on fd5 both carry CRLF terminated JSON arrays:

```text
[code,payload]\r\n
```

Rules:

- Serialize with `JSON.stringify([code, payload])` and strict `separators=(',', ':')`.
- Receiver side uses a state machine that buffers until CRLF arrives.
- Do not add base64 wrapping.
- Do not add chunking at the fd layer.

## Adding a New Runtime Wrapper

Use this six step recipe for a new wrapper such as `runner-bun`:

1. Pick a new `RuntimeKind` value, for example `"bun"`.
2. Create `packages/runner-<runtime>/` with language appropriate tooling.
3. Implement `bootstrap(<argv-index>)` so it reads boot config from the correct argv position.
4. Mirror `BootConfig` types in the new language as dataclasses or structs.
5. Add `<runtime>-process-executor.ts` in `packages/runner/src/executor/` that defines the exact spawn form and which argv index carries `bootConfigPath`.
6. Register the wrapper in `selectExecutor()` in `packages/runner/src/executor/select.ts`.

Cross links:

- `docs/roadmap/013-feature-request-runner-worker-isolation.md`
- `docs/roadmap/014-feature-request-python-runner-wrapper.md`

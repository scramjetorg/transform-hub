# packages/runner-python/

## Responsibility

Python sequence runtime and parity reference for Scramjet Transform Hub. Implements boot-config parsing, host-channel connection (TCP sockets for IN/OUT/LOG), fd stream wrappers (fd0–fd5), PING/PONG handshake, control/monitoring codecs, sequence-facing `AppContext`, sequence loading/execution, lifecycle management (STOP/KILL with keep-alive), input/output stream processing, and optional verser2 guest/broker connectivity.

## Design / Patterns

- **Module-per-concern**: 19 Python source files in `src/runner_python/`, each handling a single runtime concern (boot config, handshake, control loop, monitoring, heartbeat, lifecycle, input/output streams, sequence loading, app context).
- **Async-first architecture**: `asyncio` event loop runs three concurrent tasks — control frame dispatch, monitoring heartbeat, and output stream forwarding.
- **Frame-based transport**: CRLF-delimited JSON frames over fd4 (control) and fd5 (monitoring); `ControlFrameDecoder` for deserialization, `MonitoringWriter` for serialization with `JSON.stringify` byte parity.
- **TCP host channels**: three concurrent TCP socket connections (IN/OUT/LOG) carry instance handshake (`<instanceId><channelCode>`) and stream framed sequence data.
- **Verser2 integration**: `verser2_runtime.py` bridges boot-config fields to `@signicode/verser2-guest-python` — `PythonHubClient` wraps a verser2 Broker for outbound hub API calls, `PythonSequenceApiExposure` wraps a verser2 Guest for ASGI app attachment.
- **Dual bootstrap paths**: production uses `python3 -m runner_python <bootConfigPath>`; test overrides can supply a different runtime entry path.
- **Parity testing**: `tests/parity/` contains golden-replay sessions and boot-config parity tests against the Node runtime contract.

## Data & Control Flow

1. `load_boot_config(sys.argv)` reads and validates boot config JSON (including optional `verser2Runtime` block).
2. `open_fd_streams()` wraps fd0–fd5 into `FdStreams` (stdin, stdout, stderr, control_in, monitoring_out).
3. `connect_host_channels(boot_config)` opens three TCP sockets (IN/OUT/LOG) to the host instances server.
4. `perform_handshake(monitoring_writer, control_decoder, boot_config)` sends PING with system info, waits for PONG, emits healthy monitoring frame.
5. `create_python_hub_client(boot_config)` optionally creates a verser2 Broker for hub API calls.
6. `load_sequence(sequence_path, python_path)` imports the sequence module via `importlib`.
7. `AppContext` is built with config, logger, hub (v1 legacy), API expose, local storage, and lifecycle handlers.
8. Sequence `sequence.run(context, input_stream, *args)` is invoked.
9. Three concurrent `asyncio` tasks run: `control_loop` (fd4 STOP/KILL/SET/EVENT dispatch), `run_heartbeat` (1s MONITORING frames), output forwarding (sequence output → OUT channel with PANG emission).
10. On KILL → `HardKillSignal` (exit 137); on STOP → `perform_shutdown()` with keep-alive deadline; normal completion → cleanup and exit.

## Integration Points

- Boot config validation mirrors `@scramjet/runner-node` schema (`sequencePath`, `instanceId`, `verser2Runtime`, etc.).
- `@signicode/verser2-guest-python` (bundled in `__pypackages__/`) for verser2 Broker/Guest connectivity.
- `scramjet-framework-py` (in `__pypackages__/`) for `scramjet.Stream` DataStream interop.
- Host instances server via raw TCP sockets with channel handshake protocol.
- Parity tests in `tests/parity/` validate boot config, golden replay, and verser2 runtime compatibility against the Node runtime.
- 23 test files cover boot config, handshake, control codec, monitoring codec, heartbeat, lifecycle, host channels, sequence loading, input/output streams, app context, utils, legacy compatibility, verser2 runtime, and ASGI dispatch.

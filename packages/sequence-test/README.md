# @scramjet/sequence-test

Test-runner-agnostic helpers for exercising Scramjet Transform Sequences without starting a full Scramjet Transform Hub.

## Hub mock limitations

The current Hub mock is intentionally a minimal explicit route table. It supports registering expected routes, returning configured responses, capturing requests, and asserting that a request was made. Unknown routes return `404` by default.

Runtime support is intentionally explicit:

- **Node**: first-class target for outbound Hub request mocking because the Node runtime owns the `REQUESTS` channel and uses BPMux-backed HTTP transport in hosted mode.
- **Python**: input/output and lifecycle testing can be driven from Node-authored tests, but outbound Hub mocking depends on Python runtime support for the same request transport. Missing support should be reported clearly instead of hidden.
- **Bun**: hosted Bun currently delegates through the Node runtime path when host channels are configured. Tests must not claim true Bun-hosted Hub mocking parity unless the runtime path supports it directly.

The mock is not a fake STH. It should not grow broad default STH behavior; tests should register only the endpoints they expect a sequence to call.

## Python and Bun runner-env support

Python and Bun tests are authored from Node tests. The harness maps `runtime: "python"` and `runtime: "bun"` to `SequenceInfo.config.engines` and lets the existing `@scramjet/runner` executor selection decide how to launch runtime wrappers.

Local tooling requirements are explicit:

- Python scenarios require the Python runtime wrapper and local Python tooling to be available when execution tests are enabled.
- Bun scenarios require Bun tooling only for execution paths that actually run Bun.
- Hosted Bun behavior may delegate through the Node runtime path while host channels are configured. Tests that require strict Bun execution should check and report delegation clearly instead of silently claiming parity.

Package tests that only verify runner environment generation do not require Python or Bun binaries and should not start a full STH, Docker adapter, or Kubernetes adapter.

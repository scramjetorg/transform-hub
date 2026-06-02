# @scramjet/sequence-test

Test-runner-agnostic helpers for exercising Scramjet Transform Sequences without starting a full Scramjet Transform Hub.

## Hub mock limitations

The current Hub mock is intentionally a minimal explicit route table. It supports registering expected routes, returning configured responses, capturing requests, and asserting that a request was made. Unknown routes return `404` by default.

Runtime support is intentionally explicit:

- **Node**: first-class target for outbound Hub request mocking because the Node runtime owns the `REQUESTS` channel and uses BPMux-backed HTTP transport in hosted mode.
- **Python**: input/output and lifecycle testing can be driven from Node-authored tests, but outbound Hub mocking depends on Python runtime support for the same request transport. Missing support should be reported clearly instead of hidden.
- **Bun**: hosted Bun currently delegates through the Node runtime path when host channels are configured. Tests must not claim true Bun-hosted Hub mocking parity unless the runtime path supports it directly.

The mock is not a fake STH. It should not grow broad default STH behavior; tests should register only the endpoints they expect a sequence to call.

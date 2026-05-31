# Decisions — runner-split-tdd

## 2026-05-31
- No class hierarchy for harness — factory function only
- No hardcoded ports — always port: 0
- Harness at packages/runner/test/transport/fake-instances-server.ts
- RunnerHandshakeBuilder in packages/runner-node/src/handshake.ts
- CC.IN must be closed on graceful disconnect (not hard)

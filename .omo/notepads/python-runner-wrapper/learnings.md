# learnings.md - Python Runner Wrapper

## Initial State
- Task 1 (shared TS types) was previously dispatched but not completed
- Wave 1 has 7 parallel tasks, all independent (no interdependencies between 1-7 except types dependency)
- Plan has 49 tasks across 8 waves + final verification
- Using /start-work python-runner-wrapper command

## 2026-05-31 parity fixture capture
- Legacy `packages/python-runner/runner.py` opens all 9 channels on one TCP port and identifies the channel by sending `INSTANCE_ID + channel digit` as the first bytes on each socket.
- Handshake order on the legacy runner is `PING` on `MONITORING` -> host `PONG` on `CONTROL` -> handshake `PANG` -> optional runtime `PANG` frames -> `MONITORING` heartbeats.
- The legacy runner keeps only `StreamReader` objects for `STDIN`, `IN`, and `CONTROL`; under Python 3.12 the dropped `StreamWriter` objects can be garbage-collected early, so capture required an interpreter shim that keeps those writers alive without editing runner source.
- Legacy bundled `pyee` import is not viable in this workspace runtime, so parity capture injects a tiny `pyee.asyncio.AsyncIOEventEmitter` compatibility shim ahead of `__pypackages__`.
- Fixture recording has to scrub absolute workspace/stdlib prefixes and strip debug/path-heavy log lines to keep goldens deterministic and free of system-specific paths.

## Architecture Doc
- Drafted `docs/architecture/runner-runtime-wrappers.md` as the contract reference for executor selection, fd layout, boot config, and wrapper onboarding
- Canonical schema reference in the doc points to `packages/types/src/runtime-executor.ts`
- Shared `BootConfig` mirrors `start-runner.ts` boot payload fields (`sequencePath`, `instanceId`, required instance server host/port, `sequenceInfo`, optional args/config/logging/expose fields) and adds optional `pythonPath` for Python sequences
- Requested `docs/architecture/runner-runtime-wrappers.md` reference is used in `RuntimeExecutor` JSDoc, but that docs path is not present in the current checkout
- `packages/types` package-local verification needs the repo-root TypeScript binary; `packages/types/package.json` now calls `node ../../node_modules/typescript/bin/tsc` for stable `yarn build` and `yarn test` execution

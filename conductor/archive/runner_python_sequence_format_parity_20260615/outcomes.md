# Outcomes: runner-python sequence format parity

## Decisions & Rationale

- Established `main(context, input_stream, *args)` as the primary Python sequence entrypoint, with `run(...)` preserved as a transitional fallback.
- Kept Python runtime changes package-local and protocol-compatible with the existing outer runner boot config, fd/control/monitoring protocol, and Hub-visible behavior.
- Deferred outdated Python BDD/refapp replacement by user instruction; package-level runtime parity and docs were completed without treating the stale BDD suite as a blocker.
- Added the unsupported legacy boundary last, isolated in `runner_python.legacy`, so old metadata/result-attribute compatibility does not drive the new primary contract.

## Outcomes & Results

- Python loader, AppContext, lifecycle, input/output format handling, metadata parsing, verser2 inline-CA handling, ASGI exposure coverage, and unsupported legacy compatibility were brought into the scoped parity state described by the track.
- Package docs now document the Python sequence contract via `docs-source/readmes/packages/runner-python.md`, with generated package README and dist docs synchronized.
- The track registry was marked complete and the implementation PR was marked ready for review.

## Verification Summary

- `npm test -- tests/test_legacy.py tests/test_utils.py tests/parity/test_golden_replay.py` in `packages/runner-python`: 52 passed.
- Full `npm test` in `packages/runner-python`: 278 passed.
- `npm run build` in `packages/runner-python`: passed.
- Root `npm run check:runtime-invariants`: 8 passed, 0 failed.
- `npm run docs:generate`: passed.
- `npm run docs:check`: passed.
- `git diff --check`: passed.
- Oracle final review: no blocking findings.
- User manual verification approved on 2026-07-07.

## Constraints

- `npm` was used for repo commands.
- Node/npm validation ran under the repository memory guard where applicable.
- Broad/outdated Python BDD smoke/refapp validation remained deferred per user instruction.
- `local_storage`, `end()`, `destroy()`, `describe()`, `save()`, and `emit_to_space()` retain documented local-only or deferred protocol behavior where full backing is unavailable.

## Risks & Open Items

- Python BDD/refapp smoke coverage should be recreated in a later track using new-contract refapps.
- Verser2 inline-CA temporary-file cleanup depends on normal Broker/Guest close paths; current runtime paths close the hub client and sequence guest.
- Best-effort legacy compatibility is intentionally unsupported and narrow.

## Follow-ups

- Create a follow-up track for the deferred Python BDD/refapp suite rewrite and smoke validation.
- Revisit protocol backing for documented deferred AppContext capabilities if the Python runtime protocol expands.

## PR / Base Branch

- PR: https://github.com/0rail/transform-hub/pull/54
- Implementation branch: `conductor/runner_python_sequence_format_parity_20260615`
- Base branch: `feat/manager-oss`

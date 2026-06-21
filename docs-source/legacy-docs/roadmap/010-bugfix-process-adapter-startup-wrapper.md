# Bugfix: Process Adapter Startup Config Requires Wrapper

| Field | Value |
|-------|-------|
| Title | Fix process adapter startup config requiring a wrapper |
| Category | bugfix |
| Scope | packages/host, packages/sth-config, packages/cli |
| Breaking | no |

## Problem Statement

Using startup config with the process adapter currently requires an external wrapper script. The wrapper must render the JSON config and then invoke the hub with a long, error-prone command such as `sth -a process -KEX -c ... --sequences-root ... --startup-config ...`. This should be unnecessary.

## Current Behavior

- Operators cannot simply set `runtimeAdapter: process` and `startupConfig: /path/to/config.json` in a YAML config file and run `sth --config sth-config.yaml`.
- The startup config path is silently ignored or misinterpreted unless the exact wrapper flags are present.
- The `-KEX` flag and the ordering of `-a process` versus `--startup-config` are not documented as a required combination.

## Expected Behavior

- `sth --config my-config.yaml` should honor both `runtimeAdapter: process` and `startupConfig` when they appear in the file.
- No external wrapper should be required to bridge the gap between config file fields and CLI flags.
- The CLI should validate that `startupConfig` is only used with supported adapters and emit a clear error if it is not.

## Proposed Change

1. In the host startup path, ensure `startupConfig` is read from the merged config object regardless of whether it came from a CLI flag or a config file.
2. Validate the adapter early: if `startupConfig` is set and `runtimeAdapter` is not `process`, log a warning and skip startup-managed sequences instead of crashing.
3. Document the exact config file shape and remove references to the wrapper from official guides.

## Backwards Compatibility

No breaking changes. Existing wrapper scripts will continue to work because the CLI flags they pass remain supported.

## Testing Plan

- Integration test: create a YAML config with `runtimeAdapter: process` and `startupConfig`, start `sth --config file`, and verify managed sequences start.
- Unit test: config service merges `startupConfig` from file and CLI correctly, with CLI winning on conflict.

## References

- `docs/read-more/sth-config.md`
- `packages/host/src/lib/start-host.ts`
- `packages/sth-config/src/config-service.ts`

# Proposal: Add Stable Name and Restart Controls to CLI

| Field | Value |
|-------|-------|
| Title | Add stable name and restart controls to CLI |
| Category | cli |
| Scope | packages/cli |
| Breaking | no |

## Problem Statement

The `si` CLI can start Sequences and list instances, but it lacks explicit flags for stable naming and bounded restart behavior. Users who want idempotent deployments or self-healing instances must hand-craft startup config files instead of using CLI commands.

## Current Behavior

- `si seq start <id>` accepts `--args` but no `--name` or `--restart-limit`.
- There is no CLI path to mark an instance as `required` so the host will restart it after unexpected exit.
- Users must write a JSON startup config and pass `--startup-config` to the host to get stable names or restarts.

## Expected Behavior

- `si seq start` supports `--sequence-name <name>`, `--instance-name <name>`, `--required`, and `--restart-limit <n>`.
- `si inst list` can filter or display stable names alongside generated IDs.
- `si seq deploy` forwards the same flags so the pack-send-start flow preserves naming and restart intent.

## Proposed Change

1. Extend `si seq start` options:
   - `--sequence-name` maps to the startup config `sequenceName` field.
   - `--instance-name` maps to `instanceName`.
   - `--required` boolean flag maps to `required`.
   - `--restart-limit <number>` maps to `restartLimit`.
2. Extend `si seq deploy` to accept and forward the same flags.
3. Update `si inst list` table output to include an `InstanceName` column when present.
4. Add CLI help text and tab-completion entries for the new flags.

## Backwards Compatibility

All new flags are optional. Existing commands and outputs remain unchanged when the flags are omitted.

## Testing Plan

- Unit tests for option parsing in the CLI command modules.
- Integration test: start an instance with `--instance-name` and verify the name appears in `si inst list`.
- Integration test: start with `--required --restart-limit 2`, kill the runner process, and verify the host restarts it up to the limit.

## References

- `docs/read-more/sth-config.md` (startup config section)
- `packages/cli/src/lib/commands/sequence.ts`
- `packages/cli/src/lib/commands/instance.ts`

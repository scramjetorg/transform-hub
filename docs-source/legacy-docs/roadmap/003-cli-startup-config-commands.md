# Proposal: Add Explicit Startup Config Commands to CLI

| Field | Value |
|-------|-------|
| Title | Add explicit startup config commands to CLI |
| Category | cli |
| Scope | packages/cli |
| Breaking | no |

## Problem Statement

Startup config is powerful, but the only way to use it today is to write a JSON file and pass `--startup-config` to the host at launch. There is no CLI verb to validate, preview, or apply a startup config against a running host.

## Current Behavior

- Users write JSON manually and hope the host parses it correctly.
- There is no `si hub startup-config` subcommand.
- No validation feedback is available before restarting the host.

## Expected Behavior

- `si hub startup-config validate <path>` checks the file against the host schema and reports errors.
- `si hub startup-config preview <path>` prints a human-readable plan of what sequences and instances would be created.
- `si hub startup-config apply <path>` sends the config to a running host so it can start managed sequences without a restart.

## Proposed Change

1. Add `si hub startup-config` subcommand with three verbs:
   - `validate` reads the local JSON file and runs it through the same validator the host uses.
   - `preview` lists each sequence entry with resolved names, args, and restart limits.
   - `apply` POSTs the config to a new or existing host endpoint (for example, `/api/v1/startup-config`) and returns created sequence/instance IDs.
2. If the host does not expose a live apply endpoint, the CLI can at least offer validate and preview client-side.

## Backwards Compatibility

No breaking changes. New subcommand only.

## Testing Plan

- Unit tests for JSON schema validation in the CLI.
- Integration test with a valid startup config passing `validate` and `preview`.
- Integration test with an invalid config showing clear error messages.

## References

- `docs/read-more/sth-config.md`
- Host startup config loader in `packages/host/src/lib/start-host.ts`

# packages/sequence-test/

## Responsibility

Test-runner-agnostic harness package for exercising Scramjet Transform Sequences through the existing runner protocol without starting a full Scramjet Transform Hub.

## Design/Patterns

The package should mirror `packages/runner` protocol behavior where possible: tests provide adapter-compatible runner environment, a fake instances-server endpoint replaces only the host side, and the existing `@scramjet/runner` remains responsible for boot-config writing, executor selection, and runtime-wrapper launch.

## Integration Points

- `packages/runner/src/bin/start-runner.ts`: default runner launch path.
- `packages/runner/test/transport/fake-instances-server.ts`: source behavior for fake host channel handling.
- `packages/runner-node`, `packages/runner-python`, and `packages/runner-bun`: runtime wrappers exercised through the runner.

## Current State

Package skeleton only. Public harness APIs, fake host implementation, fixtures, and documentation are planned in the Conductor track.

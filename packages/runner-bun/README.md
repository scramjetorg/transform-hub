# @scramjet/runner-bun

Bun runtime wrapper for `packages/runner`.

The host and adapters still start the outer `@scramjet/runner` entrypoint. When
a sequence declares `engines.bun`, the outer runner selects the Bun executor and
spawns:

```sh
bun <runner-bun-entry> <bootConfigPath>
```

The boot config file is the source of runtime metadata. The Bun child must not
depend on inherited `SEQUENCE_PATH`, `SEQUENCE_INFO`, or `RUNNER_CONNECT_INFO`.

When host connection fields are present in the boot config, `runner-bun`
validates the Bun boot contract and delegates to `@scramjet/runner-node` for the
shared host-channel, AppContext, and exposed API behavior. This keeps Bun's
host endpoint calls and API serving aligned with the Node runtime wrapper.

## Build and Docker prebuild

The package build includes the local `@scramjet/runner-node` dependency closure
so package-level builds create a dist workspace that can install without
fetching unpublished Scramjet workspace packages from the public registry. The
Docker prebuild targets `packages/runner-bun` so the Docker runner artifact
contains both `runner-bun` and the delegated Node runtime dependency set.

## Sequence dependency bundling

Bun sequences are expected to be uploaded with runtime dependencies already
available in the sequence package. This implementation intentionally does not
add a Bun-specific install or build pipeline. Prepare a Bun sequence by bundling
or vendoring everything it needs before it is sent to the hub, for example:

- include a committed `node_modules`/Bun-compatible dependency tree in the
  sequence archive, or
- bundle the sequence into its `main` entrypoint with `bun build` before upload.

The runner image provides Bun and Node.js, but it does not run `bun install` for
the sequence during startup.

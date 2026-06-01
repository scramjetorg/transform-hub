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

# Config And Commander Inventory

## STH

- Entrypoint: `packages/sth/src/bin/hub.ts`.
- Config service: `packages/sth-config/src/config-service.ts`.
- Defaults: `packages/sth-config/src/default-config.ts` plus image defaults from `image-config.json`.
- Config file loading: `--config <path>` through `FileBuilder`, supporting JSON, YAML, and text fallback by extension.
- CLI options: description, custom name, tags, config path, log level/colors, port, hostname, identify existing, CPM URL/id/reconnect options, platform API options, startup config, sequences root, runner debug, runtime adapter aliases, Docker images/memory, host instance server port, CPM CA path, environment/telemetry/federation, monitoring server `healtz` spelling, runner envs, CouchDB settings, local storage adapter/path, strict platform connection.
- Env vars: `SCP_ENV_VALUE` for telemetry environment; runner envs can be passed through `--runner-envs`.
- Masking: `ConfigService.getConfigInfo()` removes `sequencesRoot`, `cpmSslCaPath`, `kubernetes.authConfigPath`, and `kubernetes.sequencesRoot` from public output.

## Adapter Option Augmentation

- Public type leak: `packages/types/src/runtime-adapter.ts` defines `AdapterAugmentOptionsFunction = (options: commander.Command) => commander.Command`.
- Dynamic flow: `packages/adapters/src/initialize-runtime-adapters.ts` registers `--runtime-adapter`, peeks at `process.argv`, then asks selected adapters to mutate the Commander instance.
- Docker options: `--runner-image`, `--runner-py-image`, `--runner-bun-image`, `--runner-max-mem`, `--prerunner-image`, `--prerunner-max-mem`.
- Kubernetes options: `--k8s-namespace`, `--k8s-quota-name`, `--k8s-auth-config-path`, `--k8s-sth-pod-host`, `--k8s-default-pull-policy`, runtime image flags, `--k8s-sequences-root`, cleanup timeout, and resources request/limit flags.
- Process options: no adapter-specific CLI options today.

## MultiManager And Manager Config

- Entrypoint: `packages/multi-manager/src/bin/start.ts`.
- Config wrapper: `packages/multi-manager/src/config/multi-manager-configuration.ts`.
- Manager service: `packages/manager-config/src/config-service.ts`.
- Defaults: `defaultMultiManagerConfig` in `multi-manager-configuration.ts`; older `packages/multi-manager/src/lib/default-config.ts` also exists and reads S3 env vars.
- File loading: JSON config through `JsonFile` when `--config` exists and is readable.
- CLI options: config path, colors, id, server API base/port/host/version, log level, dump heap, SSL key/cert paths, manager bootstrap payload, monitoring server `healtz` spelling.
- Merge risk: several `||` fallbacks lose valid falsy values, especially numeric zero, empty string, and `false` for S3 SSL.
- Masking: `MultiManagerConfig.getMasked()` masks S3 access key, secret key, bucket, endpoint, and region.

## Runner Boot Config

- `packages/runner/src/bin/start-runner.ts` writes a private JSON boot config file.
- `packages/runner-node/src/boot-config.ts` and `packages/runner-bun/src/boot-config.ts` duplicate shape validation for sequence path, args, instance id, host coordinates, app config, sequence info, instance name, log level, expose path, and expose host.
- Protocol shape must remain unchanged.

## Utility Config And File Loading

- `packages/utility/src/merge.ts` deep-merges by mutating the target and skips only `undefined`, preserving `false`, `0`, and `""`, but uses `||=` when creating nested objects.
- `packages/utility/src/file/` supports JSON and YAML by extension.
- `packages/utility/src/config/` provides legacy read-only and mutable config wrappers.

## Commander Imports

- STH: `packages/sth/src/bin/hub.ts`.
- MultiManager: `packages/multi-manager/src/bin/start.ts`, `packages/multi-manager/src/lib/ports-parser.ts`, and tests.
- Public types/adapters: `packages/types/src/runtime-adapter.ts`, `packages/adapters/src/initialize-runtime-adapters.ts`, `packages/adapter-docker/src/index.ts`, `packages/adapter-kubernetes/src/index.ts`, `packages/adapter-process/src/index.ts`.
- CLI package: many command, completion, platform, and developer-tool helpers depend on Commander. Full migration is required in this track by replacing Commander internals with Scramjet-owned command descriptors and completion metadata.

## Stable Compatibility Surface

- Existing STH config keys and schemas in `schemas/sth-config.schema.json`.
- Existing startup config schema in `schemas/startup-config.schema.json`.
- Existing STH and MultiManager CLI flags and short aliases.
- Existing adapter option names and dynamic adapter selection behavior.
- Existing runner boot config JSON shape and adapter env names.

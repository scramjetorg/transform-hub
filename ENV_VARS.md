### General

---
`PRODUCTION: boolean`

---
`DEVELOPMENT: boolean`

`SCRAMJET_DEVELOPMENT: boolean`

---
`ESBUILD: boolean`
After STH is built with esbuild it should run with this flag

### BDD tests

`SCRAMJET_SPAWN_JS: boolean (default: false)`

Used to switch between running `host` with `ts-node` and `node`.
Which comes down to whether you have to build `host` first or is it run directly from the TS source code.
It is used in CLI tests, when set to `true` CLI commands will be run with `node` out of dist folder.
When set to `false` (default) cli commands will be run with the CLI installed from npm (with `si` command).

---
`SCRAMJET_SPAWN_TS: boolean (default: false)`

Used to switch between running `host` with `ts-node` and `node`.
Which comes down to whether you have to build `host` first or is it run directly from the TS source code.

---
`SCRAMJET_HOST_URL: string`
Used to connect to host already running instead of spawning new one.

---
`SCRAMJET_HOST_BASE_URL: string`
Used to connect to host already running instead of spawning new one.
@TODO Most likely a duplicate of `SCRAMJET_HOST_URL`

---
`SCRAMJET_TEST_LOG: boolean`
Used to show host logs and more verbose tests logs.

---
`SCRAMJET_TEST_OUTPUT_MAX_BYTES: number (default: 1048576)`
Maximum number of recent host output bytes retained in memory by BDD host helpers.

---
`BDD_TIMEOUT_MS: number (default: 600000)`
Hard timeout for `yarn test:bdd:safe` and `yarn test:bdd:ts:safe`. When the timeout is reached, the safe wrapper sends `SIGTERM` to the BDD process group.

---
`BDD_GRACE_MS: number (default: 15000)`
Grace period after `BDD_TIMEOUT_MS` before the safe wrapper escalates from `SIGTERM` to `SIGKILL` for the BDD process group.

---
`BDD_MEMORY_LIMIT_MB: number (default: 0)`
Aggregate RSS ceiling for the safe wrapper's BDD process group, in MiB. A value of `0` disables memory limiting. When the process group exceeds this ceiling, the wrapper sends `SIGTERM`, then escalates to `SIGKILL` after `BDD_GRACE_MS`, and exits with code `137`.

---
`BDD_MEMORY_POLL_MS: number (default: 1000)`
Polling interval for `BDD_MEMORY_LIMIT_MB` on Linux.

---
`BDD_MEMORY_SOFT_TRIPS: number (default: 2)`
Number of consecutive over-limit memory samples required before the safe wrapper terminates the BDD process group.

---
`BDD_STEP_TIMEOUT_MS: number (default: 20000)`
Default Cucumber step timeout. Overrides the BDD world's default timeout when set to a positive number.

---
`BDD_INCLUDE_HARNESS_SELFTEST: boolean (default: false)`
Set to `1` or `true` to include scenarios tagged `@harness-selftest`. These scenarios are excluded from normal BDD runs.

---
`NO_HOST: boolean (default: true)`
Should host not be spawned

---
`RUNTIME_ADAPTER: string`
Runs host with specific --runtime-adapter

### Runner

---
`SEQUENCE_PATH: string`
Required. Path to JS sequence file.

---
`APP_CONFIG: string`
Sequence configuration JSON.

---
`APP_ARGUMENTS: string`
Sequence arguments separated by spaces.

---
`FIFOS_DIR: string`
Path to directory with all FIFOs.

---
`INPUT_PATH: string`
Used in starting runner locally only. Path to input FIFO file.

---
`OUTPUT_PATH: string`
Used in starting runner locally only. Path to output FIFO file.

### Scripts

---

#### packsequence.js

`OUT_DIR: string (default: dist)`
Used to find built source code.

#### publish-order-dist-packages.js

`SCRAMJET_PUBLISH_REPO: string`

#### publish.js

`OUT_DIR`

`LOCAL_PACKAGES`

`FLAT_PACKAGES`

`LOCAL_COPY`

`NO_INSTALL`

`MAKE_PUBLIC`

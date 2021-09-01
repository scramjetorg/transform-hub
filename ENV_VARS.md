### General
---
`PRODUCTION: boolean`

---
`DEVELOPMENT: boolean`

`SCRAMJET_DEVELOPMENT: boolean`

### BDD tests

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
`NO_HOST: boolean (default: true)`
Should host not be spawned

---
`SCRAMJET_ASSETS_LOCATION: string`

---
`CSI_COREDUMP_VOLUME: string`
Required in some performance tests. Path to a file.

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

#### packsequence.js
`OUT_DIR: string (default: dist)`
Used to find built sourcecode.

#### publish-order-dist-packages.js
`SCRAMJET_PUBLISH_REPO: string`

#### publish.js
`OUT_DIR`

`LOCAL_PACKAGES`

`FLAT_PACKAGES`

`LOCAL_COPY`

`NO_INSTALL`

`MAKE_PUBLIC`

`DIST_PACK_DIR`

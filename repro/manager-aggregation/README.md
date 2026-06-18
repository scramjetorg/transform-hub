# Manager Aggregation Repro

Reproduce `0rail/transform-hub#15` — MultiManager-proxied Manager
aggregation endpoints return empty `[]` even though connected STH hubs
report sequences when queried directly.

## Setup

One `MultiManager` with an inline `Manager`, and two STH hubs each
configured to connect to the Manager via verser2 outbound transport.
Each hub loads the hello sequence directory. The Docker Compose repro
checks hub and sequence aggregation; the local BDD repro also starts one
configured instance per hub to cover `/instances`.

```
┌──────────────┐   HTTP proxy   ┌──────────────────┐
│  test-runner  │ ──────────►   │  MultiManager     │
│  (curl/jq)    │               │  :3000            │
└──────────────┘                │    └─ Manager     │
       │                        │       mgr1        │
       │                        └────────┬─────────┘
       │                                 │ verser2 :2443
       │                    ┌────────────┼────────────┐
       │                    ▼            ▼            ▼
       │             ┌──────────┐  ┌──────────┐
       └───── HTTP ──┤  hub-1   │  │  hub-2   │
                     │  :8001   │  │  :8002   │
                     └──────────┘  └──────────┘
```

## Quick start

### Prerequisites

- Docker Compose v2+
- The STH monorepo must have its `dist/` already built:

```bash
# From the STH repository root (sth/):
npm run build:packages
# or equivalently:
scripts/build-all.js -v -w modules --ts-config tsconfig.build.json
```

### Build images

```bash
docker compose -f repro/manager-aggregation/docker-compose.yaml build
```

### Run the stack

```bash
docker compose -f repro/manager-aggregation/docker-compose.yaml up --abort-on-container-exit
```

This starts `multi-manager`, `hub-1`, `hub-2`, bootstraps TLS trust via
`cert-bootstrap`, then runs the `test-runner`.

### Expected result

The `test-runner` container exits with code **1** and prints output like:

```
=== Manager Aggregation Repro Test ===
...
--- [2] Manager /list (via MM proxy) ---
  MM proxy list count: 0
  MM proxy list data:  []
--- [3] Manager /all_sequences (via MM proxy) ---
  MM proxy all_sequences count: 0
  MM proxy all_sequences data:  []
...
--- [6] Assertions ---
  ✗ Expected MM proxy /list to show hubs, got count=0
  → This is BUG 0rail/transform-hub#15: aggregation returns empty
  ✗ Expected MM proxy /all_sequences to show sequences, got count=0
  → This is BUG 0rail/transform-hub#15: aggregation returns empty
```

The MM-proxied Manager endpoints return `200 OK` with `[]` while direct
hub APIs (`/api/v1/sequence`) show the hello sequences that were loaded.
This confirms the aggregation state is empty despite connected hubs.

### Cleanup

```bash
docker compose -f repro/manager-aggregation/docker-compose.yaml down -v
```

## Reproducing with BDD

There are also BDD tests under `bdd/features/manager/` tagged
`@manager-aggregation-repro`. These spawn processes locally (like other
manager BDD tests) and assert the desired fixed behaviour: Manager
aggregation through the MultiManager proxy must include the connected hubs,
hello sequences, and startup instances. They are expected to fail while
`0rail/transform-hub#15` is still present.

```bash
# From the STH repository root:
SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"
```

> **Note**: The BDD tests require the dist/ to be built and all
> npm dependencies installed (`npm ci` from the repository root).

## Known failure

- **Issue**: `0rail/transform-hub#15`
- **Symptom**: Manager endpoints `/list`, `/all_sequences`, `/instances`
  when reached through the MultiManager proxy return `200 []` even
  though STH hubs are connected via verser2 and report sequences/instances
  on their direct API.
- **Root cause** (suspected): The Manager's `sthInfoRegister` (populated
  by verser2 STH registration events) is not properly serialised/merged
  when the Manager is started inline within a MultiManager. Direct
  registration works (hubs appear connected), but the aggregated query
  methods fail to include the data.

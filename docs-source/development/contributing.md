---
id: development-contributing
slug: /development/contributing
title: Contributing to Scramjet Transform Hub
---

# Contributing to Scramjet Transform Hub

## Repository overview

Scramjet Transform Hub is a TypeScript monorepo for supervising sequence deployment, execution, and monitoring across process, Docker, and Kubernetes runtime adapters. The repository combines:

- **Host-facing CLI and configuration packages** (`packages/sth`, `packages/sth-config`, `packages/config`)
- **Adapter implementations** for process, Docker, and Kubernetes (`packages/adapter-process`, `packages/adapter-docker`, `packages/adapter-kubernetes`)
- **Runtime wrapper packages** that execute Node, Bun, and Python sequences behind a common outer runner protocol (`packages/runner`, `packages/runner-node`, `packages/runner-bun`, `packages/runner-python`)
- **Shared type contracts and symbols** (`packages/types`, `packages/symbols`)
- **Manager control plane** (`packages/manager`, `packages/multi-manager`)
- **API surface** (`packages/api-server`, `packages/api-client`)
- **Experimental sequence test harness** (`packages/sequence-test`)
- **BDD integration tests** (`bdd/`)

### Workspace groups

| Group | Packages |
|-------|----------|
| `modules` | All `packages/*` |
| `runners` | `packages/runner`, `packages/runner-bun`, `packages/python-runner`, `packages/pre-runner` |
| `bdd` | `bdd/` |

## Getting started

### Prerequisites

- Node.js 16+ (20+ recommended)
- npm 10+
- Python 3.9+ (for Python sequence development)
- Bun 1.x (for Bun sequence development)

### Clone and install

```bash
git clone https://github.com/scramjetorg/transform-hub.git
cd transform-hub
npm install
```

The `postinstall` script runs `install:deps` across all packages automatically.

## Build commands

### Package builds

```bash
# Build all packages (TypeScript compilation)
npm run build:packages

# Build a specific package
npm run build:packages -- -d @scramjet/runner-node

# Full build (packages + refapps + Docker images)
npm run build
```

Under the hood, `build:packages` uses `scripts/build-all.js` with `--ts-config tsconfig.build.json`. Key flags:

| Flag | Purpose |
|------|---------|
| `-w <group>` | Target workspace group (`modules`, `runners`) |
| `-d <package>` | Target specific package by path or name |
| `--ts-config <file>` | TypeScript config (default: `tsconfig.build.json`) |
| `--no-install` | Skip dependency installation |
| `--no-distws` | Skip dist workspace setup |
| `-j <jobs>` | Parallel job count |

### Documentation builds

```bash
# Generate documentation content
npm run docs:generate
npm run docs:generate:content  # prose content only
npm run docs:generate:reference  # TypeScript/CLI/API reference

# Validate generated output
npm run docs:check

# Clean generated docs
npm run docs:clean
```

Generated documentation goes to `dist-docs/` by default (configurable via `SCRAMJET_DOCS_OUTPUT_DIR` env var or `scramjet.docs.outputDir` in root `package.json`).

## Test commands

### Package unit tests

```bash
# Run all package tests concurrently
npm run test:packages

# Run package tests serially (CI-safe, avoids resource contention)
npm run test:packages-no-concurrent
```

Package tests use **AVA** with `ts-node/register` and match `**/*.spec.ts`. Tests are run through `scripts/run-ava.js`, which sets `NODE_OPTIONS="--max-old-space-size=1536 --jitless"` for the AVA child process. This avoids V8 worker CodeRange OOMs under the repository's virtual-memory cap.

### BDD integration tests

BDD tests use Cucumber.js with scenarios in `bdd/`. They require built packages and Docker images:

```bash
# Node instance tests
npm run test:bdd-ci-node

# Python instance tests
npm run test:bdd-ci-python

# API tests
npm run test:bdd-ci-api-node

# Hub tests (process adapter)
npm run test:bdd-ci-hub

# Hub tests (Docker adapter)
npm run test:bdd-ci-hub-docker

# Verser2 transport tests
npm run test:bdd-ci-verser2

# Run all BDD tests
npm run test:bdd
```

BDD environment variables:

| Variable | Purpose |
|----------|---------|
| `RUNTIME_ADAPTER=process|docker` | Select adapter |
| `SCRAMJET_SPAWN_JS=1` | Use TypeScript source |
| `SCRAMJET_TEST_LOG=1` | Enable test logging |
| `SCP_ENV_VALUE=GH_CI` | CI environment marker |

### Runtime invariant checks

```bash
npm run check:runtime-invariants
```

This validates the runtime wrapper protocol invariants using `scripts/check-runtime-wrapper-invariants.sh`.

## Lint and format

This repository uses **Biome** for linting and formatting. ESLint has been replaced.

```bash
# Lint all files
npm run lint

# Lint only changed files (fast)
npm run lint:quick

# Autofix lint issues
npm run lint:fix

# Format all files
npm run format

# Check formatting only
npm run format:check
```

Biome scripts set `RAYON_NUM_THREADS=12` to avoid native allocation pressure under the repository's virtual-memory cap. Do not silently raise this limit.

## Memory and environment constraints

### Virtual memory

All agent-run test and validation commands must start under:

```bash
ulimit -v 1835008
NODE_OPTIONS="--max-old-space-size=1024"
```

When running through `scripts/run-ava.js`, the AVA child process automatically uses `--max-old-space-size=1536 --jitless`. Do not override this unless explicitly required.

### TypeScript configuration

- Base: strict CommonJS targeting ES2019
- Features: `allowJs`, decorators, declarations, `noUnusedLocals`
- Config file: `tsconfig.build.json` for package builds
- Some packages use `ts-node` for development/test mode

## Key packages and entry points

| Package | Entry point | Purpose |
|---------|------------|---------|
| `@scramjet/sth` | `packages/sth/src/bin/hub.ts` | CLI bootstrap, host startup |
| `@scramjet/runner` | `packages/runner/src/bin/start-runner.ts` | Outer runner for adapter-launched sequences |
| `@scramjet/runner-node` | `packages/runner-node/src/bin/runner-node.ts` | Node.js sequence runtime |
| `@scramjet/runner-python` | `runner_python/__main__.py` | Python sequence runtime |
| `@scramjet/runner-bun` | `packages/runner-bun/src/bin/runner-bun.ts` | Bun sequence runtime |
| `@scramjet/sequence-test` | `packages/sequence-test/src/index.ts` | Experimental test harness |
| `@scramjet/types` | `packages/types/src/` | Shared type contracts |
| `@scramjet/symbols` | `packages/symbols/src/` | Protocol constants and enums |
| `@scramjet/sth-config` | `packages/sth-config/src/config-service.ts` | Configuration assembly |

## Package conventions

- Tests use AVA (`**/*.spec.ts`)
- TypeScript with strict CommonJS output
- Generated type files are in `packages/types` (run `npm run build:only` there to regenerate)
- Linting uses Biome (no ESLint)
- Package scripts use `scripts/run-script.js` for workspace fan-out

## Running a specific package

```bash
# Build a package in isolation
scripts/build-all.js -v -d packages/my-package --ts-config tsconfig.build.json

# Run tests for a package
scripts/run-script.js -w modules test -d packages/my-package

# Or directly via the package manifest
npm run test -w packages/my-package
```

## Continuous Integration

CI workflow expectations:

1. `npm ci` for clean dependency install
2. `npm run build:packages` for TypeScript compilation
3. `npm run test:packages-no-concurrent` for serial tests
4. Selected BDD smoke tests via `test:bdd-ci-*` scripts
5. `npm run lint:quick` for lint on changed files

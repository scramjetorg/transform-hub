# Behavior Driven Development

As the "problem scope" of the business problem that our technology solves is quite complex, we decided to use the BDD practice to support the development process. BDD is a methodology of high automation and agility. It describes a cycle of interactions with well-defined outcomes. As a result of these activities, we obtain working, tested software that has a real value.

We use [Cucumber](https://cucumber.io/) as a software tool to support the BDD process and [Gherkin](https://cucumber.io/docs/gherkin/) syntax that allows us to write tests in a human-readable language.

If you use Visual Studio Code as your IDE, please install the [Cucumber (Gherkin) Full Support](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete&ssr=false#review-details) extension. It will be very useful for writing or editing BDD tests. After installing it, please make sure that in your local .vscode/ directory file `settings.json` exists:

```json
{
  "cucumberautocomplete.steps": [
    "./bdd/step-definitions/**/*.ts"
  ],
  "cucumberautocomplete.strictGherkinCompletion": true
}

```

---

# How to run tests :runner:

## How to run BDD tests :cucumber:

The following instructions apply to the state of the repository from `release/0.22`.

BDD tests are located in a `bdd` folder, to execute them simply follow the steps below.

### Preparation :books:

Before start running any test, please make sure that all the packages are installed and built. In order to do that please run the following command:

```bash
npm run clean && npm install && npm run build:all
```

This command will remove all the 'dist' folders (if there were any), after that it will install dependencies and compile the code in all the packages. BDD sequence archives are prepared inside the immutable owner/chunk temporary directory by the supported Docker runner. Each set has an exact source-to-entry SHA-256 manifest; stale archives and repository-tree archive resolution are rejected. The canonical live Hub smoke is `E2E-001 TC-002` (`simple-stdio` pack, manifest validation, upload, start, stdin/stdout, and health). The CLI `-` session chain remains in `E2E-010 TC-005`.

### Executing BDD tests :rocket:

The test scenarios are located in `*.feature` files, and these in separate folders named according to the subject of the testing, and these in `features` directory in `bdd` folder.
Every scenario has its own title and unique index number. We can use those indexes to either execute one test or a bulk of tests, for example:

- to execute one particular test named `Scenario: E2E-001 TC-002 API test - Get instance output` run the following command:

> :bulb: **NOTE:** Commands for executing tests must be run from the root of the repository.

```bash
npm run test:bdd -- --name="E2E-001 TC-002"
```

This is the output after running this single test:

![test1.png](../images/test1.png)

- to execute a bulk of scenarios, for example from the same feature file, you can simply use the substring of their index like "E2E-001", run the following command:

```bash
npm run test:bdd -- --name="E2E-001"
```

This command will run all the scenarios that have the substring "E2E-001" in their index, whether they are in the same feature file or not. Cucumber will search all the files.

Three tests scenarios were found and executed:

![test2.png](../images/test2.png)

When you want to execute a group of tests you can do it using the substring of their name, for example, to execute all E2E tests:

```bash
npm run test:bdd -- --name="E2E"
```

- you can also execute a bulk of tests by using their `--tag` (`@tag_name`). Tags are used to group related features, independent of your file and directory structure. For example:

```bash
npm run test:bdd -- --tags="@ci"
```

The list of scenarios marked with `@ci` tag is quite long so I will paste only start of the test and the summary of the test execution:

![test_ci.png](../images/test_ci.png)

(...)

![test3.png](../images/test3.png)

Scenario can have more that one tag, can have two or even more, for example:

![tags.png](../images/tags.png)

In the situation like this above, when you want to execute tests with `@ci` tag but without `@starts-host` tag, command like this below will do the job:

```bash
npm run test:bdd -- --tags="@ci" --tags="not @starts-host"
```

### Docker-required HUB scenarios

The default STH HUB BDD command excludes scenarios tagged `@requires-docker`:

```bash
npm run test:bdd-ci-hub
```

Use the explicit Docker command only in an environment where the Docker runtime adapter can be initialized by the BDD runner:

```bash
npm run test:bdd-ci-hub-docker
```

The current Docker-required HUB scenarios are `HUB-001 TC-012` and `HUB-001 TC-013`, which assert prerunner container image and memory configuration. Both are now tagged `@needs-fix` and deferred alongside the `@docker-specific` scenarios below. Older `@docker-specific` scenarios `HUB-001 TC-009`, `HUB-001 TC-010`, and `HUB-001 TC-011` remain outside `@ci-hub` and still need a separate review — they are all tagged `@needs-fix` and excluded from default runs. TC-009 (runner-image) and TC-012 (prerunner-image) share a distinct root cause: they reference container image tags from an internal registry (repo.int.scp.ovh/scramjet/…) with no repository-built image workflow to supply them in CI. TC-013 (prerunner memory limit) is deferred for a separate reason: it does not specify or depend on an internal registry image, but its memory-limit assertion is on short-lived prerunner container metadata that is unreliable under normal CI timing — the prerunner container is created, identified, and removed within the same scenario, making the container memory limit assertion fragile due to container lifecycle timing rather than image availability.

### Manager migration scenarios

Manager/MultiManager migration scenarios live under `bdd/features/manager` and are tagged `@manager-migration`. Build packages first, then run them against built modules with:

```bash
npm run test:bdd-manager-migration
```

The Manager migration command covers the current Manager/MultiManager API paths and no longer includes retired forwarding scenarios.

### BDD memory guard

BDD memory guard mode is opt-in and is enabled with `SCRAMJET_BDD_MEMORY_GUARD=1` or the common `SCRAMJET_MEMORY_GUARD=1`. The supported runner paths inject `--expose-gc`; Cucumber hooks then measure parent-process heap growth after each scenario cleanup.

```bash
# Focused guard unit coverage (no real BDD scenario):
npm run test:memory-guard-bdd-focused

# Diagnostic direct-mode scenario run:
SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js --mode=direct -- --name="E2E-001 TC-002"

# Supported Docker-mode scenario run:
SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js -- --name="E2E-001 TC-002"
```

Thresholds:

- `SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES` or `SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES`: parent Cucumber heap growth, default `524288` bytes.
- `SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES`: child process RSS delta, default `104857600` bytes.
- `SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES`: Docker runner working-set delta, default `104857600` bytes.

Emergency skips require both `SCRAMJET_MEMORY_SKIP=1` and a non-empty `SCRAMJET_MEMORY_SKIP_REASON`. Broad silent skips are treated as configuration errors.

### Operational BDD execution guidance

The root `npm run test:bdd` command runs the bounded **base mode** through
`scripts/run-bdd-modes.js`, which invokes the supported Docker runner serially.
The base mode covers `verser2` (core routing), `topics-api` (API/topic
forwarding), `appcontext` (AppContext), `node` (Node runner behavior), and
`hub` (Hub behavior). This excludes the currently slow, memory-remediation,
and other functionally blocked groups identified by Phase 10 classification.
The Hub chunk is an exception: it is user-promoted on the strength of a passing
unguarded Docker-mode run; the guarded HUB-003 fetch-profile issue remains open.
The npm modes set `BDD_INCLUDE_LONG_RUNNING=1` so the selected Node feature's
explicit `@slow` regression scenarios are included; path selection still keeps
unrelated long-running features out of base mode.

The explicit extra mode runs the remaining eligible default-manifest chunks
serially:

```bash
npm run test:bdd       # bounded base mode
npm run test:bdd-extra # remaining chunks, serially
```

`test:bdd-extra` owns `cli`, `topics-cli`, `python`, `manager`, `errors`, and
`stream`. The internal `harness` chunk remains explicitly
selectable with `node scripts/run-bdd-waves.js --chunk=harness` and is not part
of either default-mode partition.

Between Docker invocations the mode runner performs explicit ramp-down and
ramp-up lifecycle steps. Defaults are 1000 ms each and are configurable:

```bash
BDD_RAMP_UP_MS=2000 BDD_RAMP_DOWN_MS=2000 npm run test:bdd-extra
```

Each child invocation retains exact run/chunk ownership, fail-fast behavior,
leak detection, and scoped Docker/temp cleanup. A failed chunk stops the
serial mode and performs exact-owner cleanup for every started chunk. No
parallel scheduling or guard/threshold relaxation is enabled.

Targeted selectors are always routed through the complete eligible manifest in
serial order, rather than only the bounded base partition. For example:

```bash
npm run test:bdd -- --name="E2E-001 TC-002"
npm run test:bdd -- --tags="@ci"
```

The mode runner reports this as `mode=all`; `--mode=all` is also available for
an explicit full serial run. This preserves repository-wide `--name`/`--tags`
selection and prevents a valid selector from silently producing zero scenarios
because its feature belongs to an extra chunk. The internal `harness` chunk is
still excluded from `all` and remains explicitly selectable.

The supported Docker runner runs Cucumber inside a container, isolating the
test from the host and preventing orphaned processes. Post-run leak detection
(`reportLeakedProcesses()`) runs automatically on exit, and Docker/temp cleanup
is scoped to the current run.

### PR/release operational guidance

The base/extra split is intended operational guidance for maintainers planning
PR and release validation. It is not a claim about current CI or release
workflow integration: invoke the desired command explicitly in the applicable
workflow or local validation plan. The base mode is the bounded representative
set; the extra mode provides the remaining serial coverage before broader
release confidence is declared. Neither mode enables parallel scheduling.

**Prerequisites**

- Docker daemon is running
- Your current user is in the `docker` group

**Default invocation**

`npm run test:bdd` starts a `node:22` container with `--memory=1536m`, `--memory-swap=1536m`, and `--cpus=2`. The container is removed automatically on exit.

**Environment variables**

You can tune the wrapper with these variables:

| Variable | Default | Description |
|---|---|---|
| `BDD_NODE_IMAGE` | `node:22` | Docker image to use |
| `BDD_DOCKER_MEMORY` | `1536m` | Container memory cap (`--memory` + `--memory-swap`) |
| `BDD_DOCKER_CPUS` | `2` | CPU limit (`--cpus`) |
| `BDD_TIMEOUT_MS` | `600000` | Wrapper wall-clock timeout in ms (10 min) |
| `BDD_GRACE_MS` | `10000` | Grace period before SIGKILL after SIGTERM (10 s) |

**Environment passthrough**

The wrapper forwards variables that match the following allowlist into the container: `SCRAMJET_*`, `NO_HOST`, `TEST_REPORT`, `DEVELOPMENT`, `PACKAGES_DIR`, `SCP_ENV_VALUE`, `BDD_*`, `CI`.

**Direct (non-Docker) mode**

`scripts/run-bdd.js --mode=direct` runs `cucumber-js` directly from the `bdd/` directory with safe `NODE_OPTIONS` defaults (`--max-old-space-size=1536`, `--no-experimental-fetch`). This mode is intended for diagnostic or local runs; under a strict host `<2G` memory limit, BDD step definitions load `ssh2/poly1305` WebAssembly which may fail to allocate. The supported memory-constrained BDD path is Docker mode. Raw `bdd/package.json` cucumber scripts are internal and unsupported for memory-constrained validation.

**Exit codes**

The wrapper uses these exit codes to signal specific failures:

- `124` = wrapper wall-clock timeout
- `137` = container OOM kill
- `127` = wrapper preflight failure (docker not found or docker group GID not resolvable)
- Other = container's own exit code

**Cleaning up orphaned containers**

If a run is interrupted and leaves a container behind, you can kill all BDD runner containers with one command:

```bash
docker ps --filter name=bdd-runner- -q | xargs -r docker kill
```

**Known risk**

Native Node.js addons in `node_modules` must be linux-x64 glibc compatible. If you see an ABI mismatch error, rebuild the dependencies inside a Linux container:

```bash
npm install --workspace bdd
```

This ensures the native modules match the container's runtime.

### Results :bar_chart:

The results of the performed test will be displayed in the console as a summary of executed tests. There is also a report generated in `html` which illustrates the results in a very user friendly form. Html report is generated every time we run a BDD test, those html's are saved in `bdd/reports` folder.

## Shell variables :shell: :computer:

There is a list of variables that can be used in BDD tests. These variables are used to pass values to the test scenarios. The full list of variables you will find here :point_right: [ENV_VARS.md](../ENV_VARS.md)

You can use them in the command line, for example like this:

```bash
DEVELOPMENT=1 npm run test:bdd -- --name="E2E-001 TC-002"
# it will run the tests in development mode, which means that logs will be seen during test execution.
```

# How to run unit tests :runner:

With the command below you will run all the unit tests in a whole project:

    npm test

This command runs the `test` script defined in the main `package.json` [file](../package.json). In a result, npm goes through all the packages and runs unit tests in every package.

If you see the error along the way, that means some tests were not passed.

Below you can see an example, which shows the result of all passed unit test in all the packages:

```bash
run-script: 8.428s packages/api-client: script test executed in 8407ms.
run-script: 8.661s packages/load-check: script test executed in 8640ms.
run-script: 9.339s packages/client-utils: script test executed in 9318ms.
run-script: 10.158s packages/adapters: script test executed in 10137ms.
run-script: 10.501s packages/cli: script test executed in 10480ms.
run-script: 11.077s packages/logger: script test executed in 11055ms.
run-script: 11.689s packages/host: script test executed in 11668ms.
run-script: 12.068s packages/api-server: script test executed in 12048ms.
run-script: 12.100s packages/pre-runner: script test executed in 30ms.
(...)
Done in 44.90s.
```

If you want to run a particular test file, go to directory where the test file is and run command:

    npm test

For example if you want to run unit test for the Runner package, go to runner's test directory and run the test:

    cd packages/runner/test
    npm test

and you will see the results in the console:

![ava](../images/ava.png)

If you want to run one particular test in the file, go to directory where the test file is and run command:

    npm test -- name-of-the-file.spec.ts -m "Name-of-the-unit-test"

for example:

    npm test -- runner.spec.ts -m "Runner new instance"

![ava1](../images/ava1.png)

If you add `-w` a the end of the command above the test will run automatically after every change you make in the test, eg.:

    npm test -- runner.spec.ts -m "Stop sequence" -w

# Phase 10 BDD Timing Diagnosis

Date: 2026-07-13

This is a diagnosis-only record. No source code, thresholds, or scheduler
settings were changed.

## Methodology and limits

- Used the supported Docker BDD path through `scripts/run-bdd-docker.js`, with
  chunk selection through `scripts/run-bdd-waves.js` where applicable.
- Enabled the existing BDD parent memory guard (`SCRAMJET_BDD_MEMORY_GUARD=1`)
  with its default 524,288-byte parent threshold. The existing scoped VERSER2
  1 MiB exception was retained.
- Set `SCRAMJET_BDD_CHUNK_MEMORY_POLICY=off` because this was timing diagnosis;
  this disabled chunk memory-policy reporting only and did not change any
  threshold.
- Timing telemetry is ownership-attributed and reports scenario, slowest step,
  and complete cleanup intervals. The Docker wrapper's reported chunk duration
  includes Docker startup, fixture loading, Cucumber startup, and teardown;
  scenario timings do not.
- Timing reports were externalized by the runner, but the owner temp directory
  is cleaned after each run. The retained evidence is therefore the console
  output in `/tmp/phase10-*.log`, plus the source and Phase 10 classification
  notes cited below.
- The prior default-suite run was stopped by the outer execution watchdog at
  approximately 239.5 seconds with exit 137 and `OOMKilled: false`; it did not
  produce a complete Cucumber summary. This is a watchdog limitation, not a
  measured scenario timeout or Docker OOM (`plan.md:292-294`).

## Observed wall time

The seven substantive diagnostic invocations below were run serially and
reported 401.168 seconds of wrapper wall time in total. Two preliminary
long-running-feature probes selected zero scenarios and are excluded from that
sum; they added 0.681 s and 0.731 s respectively. This is an observed sample,
not a suite aggregate or performance budget.

## Timing evidence

`Unavailable` means the telemetry did not emit a value; it is not zero.

| Selection | Feature(s) | Wrapper runtime | Scenario count/result | Slowest measured scenario | Slowest measured step | Slowest cleanup | Evidence |
|---|---|---:|---|---|---|---|---|
| `verser2` chunk | `features/verser2/VERSER2-001-isolated-routing.feature` | 7.01 s | 2 passed / 16 steps | 232.4 ms, native 308 redirect | 10.6 ms, broker request | 8.7 ms, `feature-after+world-cleanup` | `/tmp/phase10-verser2.log` |
| `cli` chunk | E2E-001, E2E-002, E2E-003, E2E-010, E2E-012-cli-config | 3m34.91 s | Cucumber summary retained no count in the selected log excerpt | 28,596.2 ms, E2E-010 TC-004 | 12,347.1 ms, `I set config for local Hub` | 46.6 ms, E2E-010 TC-016 cleanup | `/tmp/phase10-cli.log` |
| E2E-010 feature alone | `features/e2e/E2E-010-cli.feature` | 2m00.351 s | Cucumber summary retained no count in the selected log excerpt | 28,806.2 ms, E2E-010 TC-004 | 11,679.7 ms, `I set config for local Hub` | 42.7 ms, E2E-010 TC-016 cleanup | `/tmp/phase10-e2e010.log` |
| MANAGER-002 feature | `features/manager/MANAGER-002-aggregation-repro.feature` | 14.325 s | 1 scenario; scenario passed, child-process cleanup assertion failed | 13,355.0 ms, aggregation inventory scenario | 10,012.4 ms, `feature-after+world-cleanup` | 1,032.6 ms, isolated aggregation stack | `/tmp/phase10-manager002.log` |
| E2E-015 feature | `features/e2e/E2E-015-unified.feature` | 7.967 s | 1 failed, 5 skipped | 552.3 ms, simple sequence | 221.2 ms, `instance started` | 8.0 ms | `/tmp/phase10-e2e015.log` |
| stream-flooding feature | `features/e2e/E2E-012-stream-flooding-test.feature` | 7.365 s | 1 failed, 1 skipped | Unavailable; failure occurred before complete scenario boundary | 3,005.6 ms, `get event "test-event-response" from instance` | Unavailable | `/tmp/phase10-stream.log` |
| `hub` chunk | E2E-007, E2E-008, HUB-001, HUB-002, HUB-003, HUB-004 | 29.24 s | 16 scenarios; 12 passed, 1 failed, 3 skipped; 86 steps, 64 passed, 1 failed, 21 skipped | 10,792.8 ms, HUB-002 TC-002 | 10,007.2 ms, `exit hub process` | 115.7 ms | `/tmp/phase10-hub.log` |

The Phase 10 classification pass separately exercised all 24 eligible static
manifest feature paths under the supported Docker runner and 300-second
feature timeout. Its recorded classification is in `plan.md:335-344`:
only VERSER2 was parallel-ready across three repeats (6.51-7.34 s); the
remaining features were exclusive, timing-remediation-required,
memory-remediation-required, or functionally blocked. No per-feature runtime
table beyond the values above is available in the retained logs, so no missing
values are inferred here.

## Affected waits and issue classification

### Materially observed

1. **Aggregation cleanup — 10,012.4 ms**
   - Evidence: `bdd/step-definitions/manager/aggregation-repro.ts:62-100`
     stops the aggregation processes, and
     `scripts/lib/bdd-scenario-lifecycle.js:93-106` delegates to the 10-second
     graceful-stop bound. The underlying TERM-to-KILL fallback is
     `scripts/lib/bdd-cleanup.js:175-199`.
   - Classification: **cleanup safety bound, not an ordinary readiness wait**.
     It materially contributes when a process does not exit after TERM.
   - Recommendation: do not globally shorten the 10-second safety bound. First
     instrument/repair the process shutdown path or add resource-specific
     readiness/exit observation; retain the kill escalation and diagnostics.

2. **HUB-002 watchdog — 10,007.2 ms**
   - Evidence: `bdd/features/hub/HUB-002-host-iac.feature:64-69` explicitly
     asserts that the Hub exits within 10,000 ms; implementation is
     `bdd/step-definitions/hub/config.ts:464-497`.
   - Classification: **asserted behavior; must remain**. It is a watchdog
     contract, not removable setup slack.

3. **E2E-010 configuration setup — 11,679.7 ms**
   - Evidence: `bdd/step-definitions/e2e/cli.ts:61-101` runs four sequential
     `si config set` subprocesses. The same step was 12,347.1 ms in the chunk
     run and 11,679.7 ms in the feature-only run.
   - Classification: **safe optimization candidate, but not a fixed sleep**.
     A shared per-scenario setup could reduce repeated CLI process startup, but
     changing config ownership would require isolation review.

### Safe readiness-polling candidates

4. **Unconditional direct-request sleep**
   - `bdd/step-definitions/hub/config.ts:281-297` waits exactly 1,000 ms before
     an HTTP request.
   - Classification: **safe candidate**. Poll the target API/socket at
     50-100 ms intervals with a domain-specific deadline and include the last
     connection error/status in timeout diagnostics.

5. **Manager/Host observation sleeps**
   - `bdd/step-definitions/manager/multi-manager.ts:150-164` and `:166-180`
     sleep exactly 2,000 ms before reading log/API state.
   - Classification: **safe candidates**. Replace with polling for the
     expected log record or registered-host/API condition. Existing Cucumber
     step deadlines remain the outer bound.

6. **Aggregation startup fallback**
   - `bdd/step-definitions/manager/aggregation-repro.ts:174-192` uses a 1,000
     ms delay when no readiness marker is supplied.
   - Classification: **safe candidate**. Prefer an explicit ready marker; if
     unavailable, poll the service's version/health endpoint with a bounded
     deadline.

7. **Unbounded container discovery**
   - `bdd/step-definitions/hub/config.ts:528-547` and `:567-581` loop until a
     container appears without a deadline.
   - Classification: **must be bounded**. Add a domain deadline and report the
     instance ID, known container IDs, and last Docker list result. This was
     not assigned a measured duration in retained telemetry.

8. **Unbounded health loop**
   - `bdd/step-definitions/e2e/host-steps.ts:675-696` performs health polling
     without a deadline. Its `while (!healthy)` condition also deserves
     correctness review because `healthy` is a string.
   - Classification: **must be bounded**, but no material duration was
     available from the retained runs. Preserve the asserted healthy/unhealthy
     outcome while adding a deadline and last health response.

### Waits that must remain asserted behavior

- Flood/backpressure delay: `bdd/features/e2e/E2E-012-stream-flooding-test.feature:10-13`
  explicitly waits 3,000 ms after sending 11,000 KiB before checking event
  response. The run measured the following event step at 3,005.6 ms. Do not
  optimize it away.
- Additional stream-flood delay: the same feature `:18-26` explicitly waits
  1,000 ms after the stdout flood.
- Delayed/keep-alive fixtures and stop semantics, including
  `bdd/data/sequences/bdd-can-keep-alive/index.js:10`, are behavioral fixtures,
  not setup sleeps.
- Existing bounded polling loops with last-state assertions, such as
  `bdd/step-definitions/manager/aggregation-repro.ts:621-658`, should retain
  their deadlines; only the interval is a possible 50-100 ms tuning candidate.

## Recommendation

Accept the runtime cost of explicit watchdogs, keep-alive/delayed fixtures,
flood/backpressure tests, and bounded lifecycle waits. The highest-value safe
work is replacing the 1-2 second fixed readiness delays and bounding the two
Docker discovery loops plus health polling. The 10-second aggregation cleanup
is the largest observed cleanup cost, but should not be shortened globally;
resolve or observe the shutdown path first. E2E-010 setup is a secondary
optimization candidate through isolated shared configuration setup, not polling
of asserted behavior.

## Phase 10 execution modes

Based on the classification and retained timing evidence above, the bounded
default base set is:

| Mode | Chunks | Coverage rationale |
|---|---|---|
| `base` (`npm run test:bdd`) | `verser2`, `topics-api`, `appcontext`, `node`, `hub`, `manager` | Core routing, API/topic forwarding, AppContext, Node runner, Hub, and promoted Manager aggregation/Verser2 behavior |
| `extra` (`npm run test:bdd-extra`) | `cli`, `topics-cli`, `python`, `errors`, `stream` | Remaining eligible default-manifest coverage, retained serial because of timing, resource ownership, memory, or functional classifications |
| `all` (explicit or automatic for `--name`/`--tags`) | All `DEFAULT_CHUNKS` serially | Full eligible repository selection; prevents targeted selectors from silently missing extra chunks |

The partition is feature-path based, complete over `DEFAULT_CHUNKS`, and has no
overlap. The internal `harness` chunk is intentionally outside the eligible
default set. Both modes invoke chunks serially through the supported Docker
runner; no parallel scheduler or guard relaxation is enabled. The mode runner
adds explicit configurable 1000 ms default ramp-up/ramp-down lifecycle steps
between invocations and repeats exact-owner cleanup on failure. These are
operational PR/release guidance modes, not assertions about current workflow
integration. A targeted selector automatically routes from base/extra to `all`.

The guarded base-mode validation run on 2026-07-14 passed all 23 scenarios and
154 steps. Chunk wrapper durations were `verser2` 6.93 s, `topics-api` 26.22 s,
`appcontext` 20.89 s, and `node` 54.65 s. The eight lifecycle ramps added 8.00
s, for an observed mode runtime of approximately 116.69 s; chunk durations
sum to 108.69 s. The slowest base step was Node's `runner has ended execution`
at 12,219.2 ms, and its cleanup interval was 10,013.6 ms. Evidence:
`/tmp/phase10-base-mode-guarded.log`. An unguarded confirmation run also
passed in approximately 107.53 s (`/tmp/phase10-base-mode-final.log`).

## Commands and source evidence

The diagnosis commands were run on 2026-07-13 and the mode validation command
on 2026-07-14, from the repository root, using the supported Docker runner.
Representative command form:

```bash
ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" \
SCRAMJET_BDD_MEMORY_GUARD=1 SCRAMJET_BDD_CHUNK_MEMORY_POLICY=off \
PACKAGES_DIR="data/sequences/appcontext-packages/:data/sequences/python-bdd-packages/" \
node scripts/run-bdd-waves.js --chunk=verser2
```

The same form was used for `cli` and `hub`; feature-only runs used
`node scripts/run-bdd-docker.js -- --fail-fast <feature>`, with
`BDD_INCLUDE_LONG_RUNNING=1` where required by feature tags. Retained console
logs: `/tmp/phase10-verser2.log`, `/tmp/phase10-cli.log`,
`/tmp/phase10-e2e010.log`, `/tmp/phase10-manager002.log`,
`/tmp/phase10-e2e015.log`, `/tmp/phase10-stream.log`, and
`/tmp/phase10-hub.log`.

## Consolidation replacement matrix (2026-07-14)

| Removed/changed surface | Canonical replacement | Preserved contract |
|---|---|---|
| E2E-001 repository-tree `simple-stdio-2.tar.gz` and 3 s slack | E2E-001 TC-002 owner-scoped pack/manifest preparation/upload smoke plus observable stream cleanup | live Hub, upload, start, stdin/stdout, health |
| E2E-010 TC-003 pack-only scenario | E2E-001 TC-002 pack assertion | packaging remains covered live |
| `PACKAGES_DIR` repository-tree archive fallback | owner temp manifest directories created before Cucumber | stale-safe exact source-to-output integrity |
| fixed direct-request/setup readiness delay | 50 ms observable polling with 10 s bound | request result and timeout diagnostics |
| unbounded Docker discovery / health loops | 50 ms polling with 10 s bounds and last observation | container/health assertions |
| manager/multi-manager 2 s sleeps and aggregation no-marker 1 s sleep | API/log observation or immediate spawn followed by bounded API readiness | manager/aggregation coverage |
| appcontext lifecycle, node-completes, BDD hello/logs/unhealthy, API-server fixture delays | 50 ms bounded scheduling/readiness paths | fixture assertions; keep-alive, flood, watchdog, and delayed-event contracts retained |

Not removed: E2E-010 TC-005's CLI `-` session chain. Asserted flood,
watchdog, keep-alive, delayed-fixture, stop, and backpressure timing remains
unchanged.

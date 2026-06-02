# Specification: Improve STH Logging for Sequence and Runtime Errors

## Overview

Improve Scramjet Transform Hub (STH) observability for error conditions, especially failures that occur while starting or running sequences. The track will be driven by a new BDD feature set under `HUB-*` that documents and verifies clearer logging for hub-level failures, sequence pre-connect failures, and instance runtime failures.

The first implementation pass will prioritize the local Process adapter with Node sequences. Broader runtime and adapter parity should be planned, but Docker, Kubernetes, Python, and Bun coverage may be added later unless needed to validate shared behavior.

## Goals

- Add BDD coverage under `HUB-*` for logging and diagnostics around:
  - missing imports in sequences;
  - runtime errors surfaced through stderr/log tails when failures are otherwise unlogged;
  - wrong or malformed parameters passed to sequences or instances.
- Improve STH-level logging so error conditions include enough context to debug failures across package boundaries.
- Capture newly surfaced logging/handling defects in a track-local `issues.md` file for review and follow-up fixes.
- Avoid requiring full green status for scenarios that intentionally expose current observability gaps.

## Functional Requirements

### BDD Coverage

1. Add a new `HUB-*` BDD feature set for logging/error observability.
2. Cover three error layers:
   - **Hub level:** startup/configuration/adapter/host-level failures.
   - **Sequence level:** sequence package or code failures before the runtime connects to the hub.
   - **Instance level:** runtime errors after an instance starts or connects.
3. Initial executable focus must be Process adapter + Node runtime.
4. Scenarios that expose current missing observability may be tagged as review/known-issue/non-CI cases instead of blocking normal CI.
5. Stable assertions should prefer substrings and observable behavior over exact stack traces.

### Hub-Level Case Candidates

- Invalid CLI or startup parameters log the parameter name, provided value, and expected format.
- Malformed config/startup config logs the file path and parse or validation reason without dumping secrets.
- Port bind conflicts log host/port and system error such as `EADDRINUSE`.
- Runtime adapter initialization failures log adapter name and root cause.
- Startup entry restart exhaustion logs sequence id, instance id, restart attempt count, and final fail-fast reason.
- Broken sequence discovery under identify-existing logs the sequence/artifact path and failure reason.
- Hub-level unhandled exceptions or rejections are routed through STH logging with stack and phase context where possible.
- Shutdown during active instances logs signal receipt, instance stop attempts, and final exit/cleanup status.

### Sequence-Level Case Candidates

- Missing Node import fails before connection and surfaces `Cannot find module` / `MODULE_NOT_FOUND` through hub-visible logs or stderr tail.
- Syntax errors before connect surface file/line/error details where available instead of silent timeouts.
- Invalid package entrypoint or wrong export shape logs sequence/package context and validation/load phase.
- Unsupported or misdetected runtime logs declared/detected runtime and selected adapter.
- Unreadable/corrupt sequence artifacts log path and filesystem/archive error.
- Runner boot/config argument errors log invalid argument details and propagate runner stderr tail to hub logs.
- Wrong startup parameters detected during load/init log sanitized parameter details.

### Instance-Level Case Candidates

- Runtime exceptions in Node sequences log thrown message, stack or stderr tail, instance id, and exit code/signal.
- Unhandled promise rejections or async stream failures are logged and do not silently hang.
- Stream `error` events include stream direction and instance context.
- Wrong instance start parameters return useful CLI/API errors and log sanitized parameter context.
- Malformed input/control messages log parse reason and affected instance id while keeping the host alive.
- Health check failures distinguish thrown errors from unhealthy states.
- Instance API route handler failures log method/path/status and instance id without leaking unintended stack details to clients.
- Non-zero runner exits after connect log exit code/signal and stderr tail.
- Stop/kill cleanup failures log requested action, timeout/final signal, and host survival.

### Logging Content Requirements

Where applicable, logs should include:

- failure phase, such as `hub-startup`, `sequence-identify`, `sequence-load`, `runner-start`, `runner-connect`, `instance-runtime`, or `shutdown`;
- `sequenceId` and `instanceId`;
- adapter name, especially `process` for the initial pass;
- runtime/language, especially `node` for the initial pass;
- exit code or signal;
- error name and message;
- stack trace or stderr tail when available;
- sanitized parameter/config context;
- no secrets, full env dumps, or sensitive config values in normal logs.

### Issue Logging

1. Create and maintain `issues.md` in the track directory.
2. Record identified logging/handling defects with:
   - case/scenario name;
   - reproduction command or BDD scenario reference;
   - observed behavior;
   - expected logging/handling behavior;
   - whether the case is CI-blocking or review-only;
   - status or follow-up notes.
3. Use `issues.md` for surfaced errors that need review and fixes, especially when full green BDD status is intentionally not required.

## Non-Functional Requirements

- Preserve existing runtime protocol compatibility.
- Keep logging stable enough for tests but avoid overfitting to exact stack traces.
- Avoid leaking secrets, environment dumps, tokens, or sensitive config values.
- Prefer narrow BDD/package validation commands over full Docker or Kubernetes BDD runs unless required.
- Keep changes incremental and reviewable.

## Acceptance Criteria

- A new `HUB-*` BDD feature set exists for improved logging/error observability.
- Initial Process + Node scenarios cover missing imports, runtime errors/stderr tail, and wrong parameters.
- Hub, sequence pre-connect, and instance runtime cases are represented either as executable scenarios, review-tagged scenarios, or documented follow-up cases.
- STH logging is improved for selected initial scenarios with contextual, sanitized, actionable error output.
- `issues.md` exists under the track directory and is updated with any surfaced logging/handling defects.
- Review/known-issue scenarios do not force full green status when they intentionally expose current gaps.
- Relevant validation commands are documented/run for implemented changes.

## Out of Scope

- Full Docker and Kubernetes BDD coverage in the first pass unless a shared logging path requires it.
- Complete parity across Python and Bun runtimes in the first implementation pass.
- Replacing the logging framework wholesale.
- Guaranteeing all new exploratory/review scenarios pass immediately.
- Changing runtime protocol semantics except where explicitly required for observability.

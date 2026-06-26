# Specification: Test Memory Efficiency and Process Cleanup

## Overview

Create a supported, repository-wide testing profile that allows the full Scramjet Transform Hub test suite to run reliably under a small memory limit below 2 GB, without leaving stale Hub, STH, runner, Manager, MultiManager, AVA, Cucumber, Docker, or child runtime processes behind after tests finish.

This track addresses GitHub issues 38 and 39:

- Issue 38: BDD AppContext runs can pass but leave orphaned STH/Host process groups, requiring manual `kill -TERM -- -<pgid>` cleanup and risking later validation failures from leaked ports or processes.
- Issue 39: AVA validation is unstable under the repository memory guard because the current `scripts/run-ava.js` `--jitless` workaround avoids V8 CodeRange OOMs but can trigger `ReferenceError: WebAssembly is not defined`/undici failures in Host, runner, runner-node, and api-server tests.

## Goals

- Provide exactly two supported test runner entrypoints for this repository:
  - an AVA/package-test runner script;
  - a BDD runner script.
- Ensure all package tests use the supported AVA runner path.
- Make direct package-level `npx ava` usage fail fast or produce an informative error pointing to the supported runner.
- Enforce one consistent resource-control strategy across AVA and BDD test systems, including memory caps, thread/worker caps, timeout handling, and process/container cleanup.
- Allow agent-run and CI validation to execute under a <2 GB memory limit without crashing the host.
- Ensure passing test commands do not leave stale STH/Host/runner/Manager/MultiManager process groups, containers, temp directories, ports, or long-lived child processes.
- Preserve useful test speed while making stability under constrained memory the priority.

## Functional Requirements

1. AVA runner
   - Replace ad hoc package AVA invocation with one supported AVA runner script.
   - Keep all package `npm test`/`test:ava` paths routed through the supported AVA runner.
   - Choose a stable AVA Node profile that avoids both V8 CodeRange OOMs and `WebAssembly is not defined`/undici failures under the repository virtual-memory guard.
   - Provide configurable but safe defaults for AVA worker/thread count, Node old-space, V8/JIT/WASM options, command timeout, and cleanup behavior.
   - Fail fast with an informative message when direct `npx ava` package execution bypasses the runner, where feasible.

2. BDD runner
   - Provide one supported BDD runner script for Cucumber-based BDD validation.
   - Standardize BDD memory limits, CPU/thread caps, command timeouts, and graceful termination behavior.
   - Harden BDD host/runner/manager cleanup using process-group tracking and bounded escalation: graceful termination first, then forced kill after a short grace period.
   - Add post-run leak detection for known STH, Host, runner, Manager, MultiManager, Cucumber, and related process patterns.
   - Use Docker/Compose for hubs/managers where it reduces process leakage and improves lifecycle cleanup; do not require Docker as the BDD test executor unless a scenario specifically needs it.
   - Consider the `../drumwave-integration` model as a reference: profile-gated test service, atomic `compose up`/wait/logs/down lifecycle, `restart: "no"`, per-service memory limits, and volume cleanup.

3. Unified behavior
   - Use a shared convention or helper layer so AVA and BDD runners enforce the same concepts even though they are separate scripts.
   - Resource controls must cover memory, thread/worker fan-out, timeout escalation, and post-test cleanup.
   - Commands must remain npm-based for repository workflows.
   - Test validation commands must run under memory guards by default; no implementation or verification step should intentionally run tests without a memory cap.

4. Documentation and guidance
   - Update Conductor/agent guidance and repository test documentation when supported commands, defaults, or resource profiles change.
   - Document the intended commands, relevant environment variables, memory/thread defaults, cleanup guarantees, and known limitations.

## Non-Functional Requirements

- Stability under constrained memory is more important than maximizing parallel test throughput.
- The solution should be maintainable and centralized enough that future test systems do not reintroduce independent memory or cleanup policies.
- Cleanup logic should avoid broad/destructive host process killing; target only repository-owned child processes, process groups, containers, and temp resources.
- Docker/Compose lifecycle management should be deterministic and should not leave named volumes or orphan containers after test completion.
- Changes should preserve existing package behavior and runtime protocol compatibility.

## Acceptance Criteria

- Package AVA tests run through the supported AVA runner under a <2 GB memory guard without choosing between CodeRange OOMs and `WebAssembly is not defined`/undici failures.
- Direct unsupported AVA invocation from package folders is blocked or produces an actionable message pointing to the supported runner.
- BDD smoke/AppContext validation terminates spawned Hub/STH/runner/Manager process groups and reports no leaked processes after completion.
- The BDD runner provides bounded TERM-to-KILL escalation for stuck children and does not rely on manual post-run cleanup commands.
- AVA and BDD runners expose one coherent set of resource-control conventions for memory, worker/thread count, timeout, and cleanup behavior.
- Documentation and Conductor/agent guidance reflect the supported commands and memory-safe validation expectations.
- Verification includes narrow AVA and BDD smoke checks under memory limits, plus script-level checks for cleanup/leak-detection behavior. Full Docker-heavy BDD coverage may remain out of scope unless required by changed behavior.

## Out of Scope

- Replacing AVA or Cucumber with a different test framework.
- Removing Docker support from BDD scenarios that require Docker-hosted hubs or managers.
- Running tests without memory limits for comparison, since that can crash the host.
- Broad runtime protocol changes unrelated to test orchestration, memory limits, or cleanup.
- Solving unrelated package test failures that are not caused by the supported runner profile or cleanup behavior.

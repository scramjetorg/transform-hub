# Outcomes: verser2 rollout

## Summary

The `verser2_rollout_20260613` track established the architecture, contracts, and migration path for replacing old `@scramjet/verser`, BPMux, and raw runner socket connectivity with verser2-based Host/Broker/Guest routing. The detailed `plan.md` was removed during archival; this file preserves the key findings and implementation outcomes.

## Key architecture findings

- Manager/MultiManager owns the external verser2 Host for STH connectivity.
- STH owns a separate local verser2 Host for runners and stack-specific runtimes.
- Runners and runtime wrappers must not connect directly to the Manager/MultiManager Host; the accepted topology is `Runner / Stack-Runner -> STH-local verser2 Host -> STH -> Manager/MultiManager`.
- Route state is per Host instance and per connected peer set. Shared route state, HA behavior, and multi-Host distribution are deployment/future-work concerns rather than built-in verser2 behavior.
- Host route matching is exact hostname equality only; wildcard, prefix, suffix, and `*.domain` matching are not assumed.
- Manager-owned, topic/multiplexed, duplex, CONNECT, upgrade, trailer, and informational-response paths are not generic tunnel paths and require explicit handling or remain unsupported.

## Security and trust findings

- TLS is mandatory for Manager/MultiManager verser2 Host connectivity.
- Manager/MultiManager and STH-local runner connectivity use separate trust domains.
- STH-local runner Host trust is generated/owned by STH; Manager trust is fetched/configured separately.
- CA trust proves server identity only. Registration authorization remains a distinct concern using tokens, local-only policy, certificate fingerprints, or future mTLS enrollment.
- Private keys, passphrases, STH server keys, and Manager server keys must never be passed through runner env/config.
- Inline public CA PEM bundles are accepted for runner trust handoff; file/Secret materialization for Docker/Kubernetes remains deferred until a runtime/library path requires it.

## Implementation outcomes

- Added and validated verser2 configuration surfaces for Manager, MultiManager, STH outbound connectivity, and STH-local runner Host behavior.
- Replaced active BPMux and old-verser paths in Manager/STH/runner runtime connectivity with verser2-oriented abstractions where the rollout scope reached implementation.
- Introduced runner transport abstractions and verser2 runner route contracts for stdin, stdout, stderr, control, monitoring, input, output, and log streams.
- Migrated Node, Python, and Bun runtime paths toward verser2 Broker/Guest behavior for sequence-to-STH calls and API exposure.
- Added routed-forwarding support and tests for Host-to-runner RPC forwarding over verser2 routes while explicitly rejecting unsupported CONNECT/upgrade/trailer/informational-response behavior.
- Added route classification and redirect-readiness work that later enabled native redirect adoption in the follow-up v0.4.x upgrade track.
- Quarantined or replaced legacy validation paths that were no longer meaningful for active verser2 behavior.

## Important corrections made during the track

- The original direct runner-to-Manager topology was rejected after review.
- Runner transport env generation was corrected so runner `hostUrl` points at the STH-local Host, not `sthConfig.verser2.hostUrl` for Manager/MultiManager.
- Host-side runner transport stopped reusing the Manager CPM Broker for runner traffic.
- STH-local runner Host, local Broker, local STH API Guest route, and combined public CA bundle handling were introduced to support the corrected topology.

## Validation highlights

- Focused package tests were added or updated across Manager, MultiManager, Host, Runner, runner-node, runner-python, runner-bun, API server, adapters-common, adapter-process, config, sth-config, and shared types.
- Runtime invariant checks were extended to guard against active BPMux/old-verser regressions and forbidden direct runner-to-Manager topology.
- Package builds and targeted AVA/Python/Bun tests were repeatedly used as phase gates.
- BDD scope was separated so slow, stress, external-dependency, compatibility, Docker-only, and infrastructure-gated suites do not block ordinary verser2 rollout validation.

## Deferred or transferred work

- Final old-verser callsite removal was transferred to `conductor/archive/old_verser_callsites_removal_20260615/`.
- Native 308 redirects and upstream Host federation were completed in the follow-up `verser2_v040_upgrade_20260616` track.
- Docker/Kubernetes non-inline CA bundle materialization and cleanup remain deferred until non-inline trust delivery is required.
- mTLS enrollment, rotation, and stricter authorization policy enforcement remain future security/platform work.
- Public package/auth cleanup moved to the later `verser2_public_20260616` track.

## Archive note

The original plan was intentionally removed from this archive to reduce stale operational detail. Use this outcomes summary plus the retained architecture, review checklist, route classification, upstream report, and specification files for historical context.

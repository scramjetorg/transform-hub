---
id: sequences-control
slug: /sequences/control
title: Sequence health and control
---

# Sequence health and control

## What the control plane means

Health is an observation, not a command. Every instance reports `healthy: boolean`; a sequence may add bounded, namespaced `details` such as `site.latencyMs`. Runtime fields are reserved, malformed handler results become a sequence diagnostic, and multiple handlers merge deterministically. Do not put secrets or unbounded payloads in health.

The canonical Hub and Manager health routes are `GET /api/v2/health`. Manager health also describes aggregation readiness for connected Hubs. Poll readiness when startup ordering matters; an HTTP response alone does not prove that a required sequence is ready.

## Direct and routed control flow

The control result is the same whether the request is sent to the owning Hub or routed through a Manager:

```text
direct:  caller -> Hub -> instance -> terminal state
routed: caller -> Manager -> connected Hub -> instance -> terminal state -> Manager -> caller
```

The Hub handles the instance operation. The Manager checks the Hub connection, forwards the operation, and returns the Hub result; it does not execute the sequence itself. Health is observed directly from the Hub, while Manager health adds connected-Hub aggregation. A disconnected or timed-out routed request is an error/unknown outcome, not evidence that the instance reached a terminal state.

## Stop, kill, and error

- `stop` requests graceful work completion. Stop handlers may flush pending work and use `keepAlive` within the configured exit timeout. A timeout escalates; there is no promise of an infinite drain.
- `kill` is immediate control with synchronous cleanup. It is appropriate when graceful stop is stuck, and does not guarantee that asynchronous work finishes.
- `destroy(error)` reports a sequence error. The instance is errored and must be started afresh; this is not an in-process retry contract.

The statuses follow the canonical InstanceStatus terms: `stopping` during a graceful drain, `killing` during immediate kill or stop-timeout escalation, `completed` for normal completion, `errored` after `destroy(error)`, and `gone` when the instance record is removed. The Hub applies these operations directly; a Manager-routed operation adds a transport hop and may add routing metadata, but preserves the operation and sequence-visible result. Neither path promises HA, failover, exactly-once cleanup, or durable event delivery.

See [sequence monitoring](sequence-monitoring.md) for frames, logs, events, and exit behavior.

The case-led companion is [Customer-site health and control](../examples/customer-site-health-control.md). Run the focused dry/wet evidence test with `cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/phase6-guide-contracts.spec.ts --match="*direct Hub and Manager-routed control flow*"`; this is not a live-site probe.

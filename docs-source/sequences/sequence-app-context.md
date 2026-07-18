---
id: sequences-app-context
slug: /sequences/app-context
title: SequenceAppContext and runtime parity
---

# SequenceAppContext and runtime parity

Import the author-facing contract from `@scramjet/sequence-types`. The parity surface is health/details, lifecycle handlers, structured logs, events, Hub/Space clients, and exposed API behavior. Node is the reference implementation; supported Bun execution uses the hosted wrapper and delegates to Node for the same contract.

## Intentional differences

| Runtime | Supported parity | Intentional limit |
|---|---|---|
| Node | Full sequence-facing AppContext and v2 clients | Canonical reference runtime. |
| Python | Health, lifecycle, logs, events, scoped Hub/Space routing, and exposed API through the Python wrapper | Use Python method naming such as `add_monitoring_handler`; use the wrapper's scoped `context.hub.get/post` and `context.space.get/post` methods, not a generic REST SDK. |
| Bun | Hosted parity through Node delegation | No separate author-visible direct/headless Bun mode. |

## Runtime conformance matrix

| Capability | Node | Hosted Python | Hosted Bun |
|---|---|---|---|
| Health/details | `MONITORING`; bounded `{ healthy, details }` | Same frame contract; `add_monitoring_handler` | Delegates to Node |
| Lifecycle, logs, events | Full sequence surface and host channels | Wrapper parity with Python naming | Delegates to Node |
| Hub/Space clients | Typed v2 `hubClient()` / `spaceClient()` | `context.hub` / `context.space` Broker views; no generic Node `@scramjet/rest-api2` client | Delegates to Node and verser2 |
| Exposed API | `this.api.use()` below `exposePath` | `context.api.attach(asgi_app)` below `exposePath` | Delegates to Node |
| Durable save/checkpoint | Not provided | Not provided | Not provided |

Hosted means the wrapper has the instance-server address and host channels. Python's wrapper clients are not a promise of a generic Python REST SDK. See the [health parity walkthrough](../examples/app-context-health-parity.md) for a case-led comparison; the repository's detailed conformance evidence remains in `docs-source/reference/runtime-app-context-conformance.md`.

`hubClient()` is Hub-scoped. `spaceClient()` is Manager/Space-scoped and routed through the connected Hub proxy. Legacy `hub` and `space` remain compatibility surfaces. Python uses its wrapper `context.hub` and `context.space` views rather than importing the Node `@scramjet/rest-api2` generic client. These are intentional differences in naming, not permission to assume a different security boundary.

Events remain transient, topics do not replay, and health details are bounded operator-visible data on every runtime. Authentication, authorization, storage durability, and adapter networking are outside AppContext.

Read the [AppContext health parity walkthrough](../examples/app-context-health-parity.md) after this matrix. It compares hosted runtimes only; it is not a direct-Bun or generic Python-client test.

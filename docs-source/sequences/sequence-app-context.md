---
id: sequences-app-context
slug: /sequences/app-context
title: SequenceAppContext and runtime parity
---

# SequenceAppContext and runtime parity

Import the author-facing contract from `@scramjet/sequence-types`. The parity surface is health/details, lifecycle handlers, structured logs, events, Hub/Space clients, and exposed API behavior. Node is the reference implementation; supported hosted Bun (Bun 1.4.2+) runs author code in the selected Bun process and reuses the shared Node-compatible sequence runtime in-process. It does not start a Node sequence child. This compatibility surface is not a claim that every Node package or native addon works under Bun. Runtime manifest declaration is an additive, current-hosted-runtime API described in the [runtime manifest guide](../examples/runtime-manifest.md).

## Intentional differences

| Runtime | Supported parity | Intentional limit |
|---|---|---|
| Node | Full sequence-facing AppContext and v2 clients | Canonical reference runtime. |
| Python | Health, lifecycle, logs, events, scoped Hub/Space routing, instance manifest declaration/retrieval, and exposed API through the Python wrapper | Use Python method naming such as `add_monitoring_handler`; `context.hub.get/post` and `context.space.get/post` remain scoped request views, not a generic REST SDK. |
| Bun 1.4.2+ | Native hosted parity through Bun's Node-compatible APIs and the shared runtime bootstrap | Host channels are required; no separate author-visible direct/headless mode or arbitrary Node-package compatibility guarantee. |

## Runtime conformance matrix

| Capability | Node | Hosted Python | Hosted Bun |
|---|---|---|---|
| Health/details | `MONITORING`; bounded `{ healthy, details }` | Same frame contract; `add_monitoring_handler` | Shared runtime behavior, author code runs in Bun |
| Lifecycle, logs, events | Full sequence surface and host channels | Wrapper parity with Python naming | Shared runtime behavior, author code runs in Bun |
| Hub/Space clients | Typed v2 `hubClient()` / `spaceClient()` | `context.hub` / `context.space` Broker views; no generic Node `@scramjet/rest-api2` client | Shared Hub/Space clients over configured verser2 transport in the Bun process |
| Manifest declaration | `await this.api.declare(declaration)` on `ManifestSequenceAppContext` | `await context.api.declare(declaration)` | Shared manifest API executes in the Bun process |
| Manifest retrieval | `this.hubClient().instance(id).manifest()` / `.sequence(id).manifest()` | `context.hub_client().instance(id).manifest()` / `.sequence(id).manifest()` over the hosted wrapper's existing Hub connection; no separate SDK setup | Shared HubClient and configured verser2 transport in the Bun process |
| Exposed API | `this.api.use()` below `exposePath` | `context.api.attach(asgi_app)` below `exposePath`; exposure is separate from declaration | Shared API registration executes in the Bun process |
| Durable save/checkpoint | Not provided | Not provided | Not provided |

Hosted means the wrapper has the instance-server address and host channels. Python's wrapper clients are not a promise of a generic Python REST SDK. For installed execution, use the [AppContext health parity Process Adapter workflow](../examples/app-context-health-parity.md#install-and-verify-a-runtime-deliverable-with-the-process-adapter), then refer to the [canonical installed Process Adapter example baseline](setup-and-run.md#installed-process-adapter-example-baseline). Repository conformance evidence is maintainer-only and optional after the installed workflow.

`hubClient()` is Hub-scoped. `spaceClient()` is Manager/Space-scoped and routed through the connected Hub proxy. Legacy `hub` and `space` remain compatibility surfaces. Python uses its wrapper `context.hub` and `context.space` views rather than importing the Node `@scramjet/rest-api2` generic client. These are intentional differences in naming, not permission to assume a different security boundary.

Manifest declarations describe public metadata for the declaring instance only. They neither create HTTP routes nor imply that an instance is callable. Different instances of one sequence may publish different documents; live inventory remains authoritative. See the [runtime manifest guide](../examples/runtime-manifest.md) for declaration shapes, response handling, schema limits, and lifecycle behavior.

Events remain transient, topics do not replay, and health details are bounded operator-visible data on every runtime. Authentication, authorization, storage durability, and adapter networking are outside AppContext.

Read the [AppContext health parity walkthrough](../examples/app-context-health-parity.md) after this matrix. It compares hosted runtimes only; it is not a direct-Bun or generic Python-client test.

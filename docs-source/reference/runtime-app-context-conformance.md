# Runtime AppContext conformance

This matrix is the source of truth for the runtime-wrapper surface. “Hosted”
means boot config contains the instance-server address, so the runtime is
connected to the real Hub instance channels (`IN`, `OUT`, `LOG`, and control /
`MONITORING`). Hosted Python uses the Python verser2 Broker/Guest. Supported Bun
(Bun 1.4.2+) executes sequence code in the Bun process and reuses the shared
Node-compatible runtime bootstrap in-process; no Node child runs the sequence.
There is no separate author-visible direct/headless Bun mode, and this does not
promise compatibility with arbitrary Node packages or native addons.

| Capability | Node | Hosted Python | Hosted Bun |
| --- | --- | --- | --- |
| Health and namespaced details | `MONITORING`; author `healthy` plus bounded `details`, with runner telemetry at top level | Same `MONITORING` frame contract; Python handlers merge into `healthy` / `details` | Shared runtime frame contract, sequence executes under Bun |
| Lifecycle | `keepAlive`, `end`, `destroy(error)` and stop/kill handlers | Same lifecycle through control frames; errored destroy emits structured `sequenceError` | Shared lifecycle runs in the Bun process |
| Logger shape and LOG channel | Console-style `trace/debug/info/warn/error` logger; records go to host `LOG` | Python `logging.Logger` with the same level methods and structured `extra`; records go to host `LOG` | Shared logger and host `LOG` channel in the Bun process |
| Events | Instance-scoped `on` / `emit`; `emitToSpace` adds `scope: "space"` | Same instance and space scopes over `MONITORING` event frames | Shared event context in the Bun process |
| Hub client | `hubClient()` with typed resource depth (for example `status.get()`) | `context.hub` scoped request client with `get()`/`post()` path methods; not a Node-fluent client equivalent, no generic Python REST SDK | Shared HubClient with configured verser2 Agent transport in the Bun process |
| Space client | `spaceClient()` with typed resource depth | `context.space`, a scoped Broker view; it falls back to the Hub target when no space target is configured; no generic Node client | Shared Space client with configured verser2 transport in the Bun process |
| Manifest declaration | `this.api.declare(declaration)` on the additive `ManifestSequenceAppContext` | `await context.api.declare(declaration)`; does not require ASGI exposure | Shared manifest API executes in Bun |
| Manifest retrieval | `hubClient().instance(id).manifest()` / `.sequence(id).manifest()` | `context.hub_client().instance(id).manifest()` / `.sequence(id).manifest()` uses the existing hosted Hub connection without a separate SDK installation | Shared HubClient and configured verser2 transport in Bun |
| API registration and `exposePath` | `this.api.use(path, handler)` mounted below `exposePath` | `context.api.attach(asgi_app)` mounted through the Python verser2 Guest below `exposePath`; this is separate from manifest declaration | Shared API registration executes in Bun below `exposePath` |
| Local storage | `localStorage` is an instance-local storage API | Not exposed by this wrapper | Shared instance-local storage API |
| `save` persistence | Unsupported as persistence; `save` must not be described as durable state | Unsupported as persistence; `save` must not be described as durable state | Unsupported as persistence; `save` must not be described as durable state |

The real hosted-runtime fixture `APPCONTEXT-002` exercises instance/host
channels, monitoring, LOG, scoped events, Hub/Space requests, and
`exposePath` for Python and Bun, including native Bun process identity. The focused wrapper tests remain useful for
shape and bootstrap checks, but do not replace that integration fixture.

The runtime manifest is per running instance, not a shared sequence contract. The current declaration, response, guard, and audit boundaries are documented in the [runtime manifest guide](../examples/runtime-manifest.md); manifest presence does not replace live inventory or imply RPC/topic wiring or payload enforcement. Bun executes this surface natively in the Bun process; the older exported JavaScript Runner API is not manifest-capable.

See the [SequenceAppContext guide](../sequences/sequence-app-context.md) and the [health parity walkthrough](../examples/app-context-health-parity.md). Python's wrapper clients are not a promise of a generic Python REST SDK.

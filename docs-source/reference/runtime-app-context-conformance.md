# Runtime AppContext conformance

This matrix is the source of truth for the runtime-wrapper surface. “Hosted”
means boot config contains the instance-server address, so the wrapper is
connected to the real Hub instance channels (`IN`, `OUT`, `LOG`, and control /
`MONITORING`). Hosted Python uses the Python verser2 Broker/Guest; supported Bun
uses the hosted wrapper and delegates to the Node wrapper. There is no separate
author-visible direct/headless Bun mode.

| Capability | Node | Hosted Python | Hosted Bun |
| --- | --- | --- | --- |
| Health and namespaced details | `MONITORING`; author `healthy` plus bounded `details`, with runner telemetry at top level | Same `MONITORING` frame contract; Python handlers merge into `healthy` / `details` | Node delegation |
| Lifecycle | `keepAlive`, `end`, `destroy(error)` and stop/kill handlers | Same lifecycle through control frames; errored destroy emits structured `sequenceError` | Node delegation |
| Logger shape and LOG channel | Console-style `trace/debug/info/warn/error` logger; records go to host `LOG` | Python `logging.Logger` with the same level methods and structured `extra`; records go to host `LOG` | Node delegation |
| Events | Instance-scoped `on` / `emit`; `emitToSpace` adds `scope: "space"` | Same instance and space scopes over `MONITORING` event frames | Node delegation |
| Hub client | `hubClient()` with typed resource depth (for example `status.get()`) | `context.hub` scoped request client with `get()`/`post()` path methods; not a Node-fluent client equivalent, no generic Python REST SDK | Node delegation and verser2 transport |
| Space client | `spaceClient()` with typed resource depth | `context.space`, a scoped Broker view; it falls back to the Hub target when no space target is configured; no generic Node client | Node delegation and verser2 transport |
| API registration and `exposePath` | `this.api.use(path, handler)` mounted below `exposePath` | `context.api.attach(asgi_app)` mounted through the Python verser2 Guest below `exposePath` | Node delegation; uses Node registration |
| Local storage | `localStorage` is an instance-local storage API | Not exposed by this wrapper | Node delegation |
| `save` persistence | Unsupported as persistence; `save` must not be described as durable state | Unsupported as persistence; `save` must not be described as durable state | Node delegation (unsupported as persistence) |

The real hosted-runtime fixture `APPCONTEXT-002` exercises instance/host
channels, monitoring, LOG, scoped events, Hub/Space requests, and
`exposePath` for Python and Bun. The focused wrapper tests remain useful for
shape and bootstrap checks, but do not replace that integration fixture.

See the [SequenceAppContext guide](../sequences/sequence-app-context.md) and the [health parity walkthrough](../examples/app-context-health-parity.md). Python's wrapper clients are not a promise of a generic Python REST SDK.

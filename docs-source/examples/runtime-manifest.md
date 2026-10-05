---
id: example-runtime-manifest
slug: /examples/runtime-manifest
title: Declare and retrieve an instance runtime manifest
---

# Declare and retrieve an instance runtime manifest

A runtime manifest is public descriptive metadata for one running instance on current hosted Node, Python, and Bun (through the Bun wrapper's Node delegation). It is not part of the older exported `@scramjet/runner` API. Each instance publishes its own declaration: two instances of the same sequence can describe different inputs, outputs, RPC procedures, and topics. A manifest does not make an instance callable or available; check live instance inventory separately.

## Declare metadata from a sequence

Node sequences can type the declaration API with `ManifestSequenceAppContext`. The ordinary `SequenceAppContext` and existing application aliases remain unchanged; use the manifest-capable context for current hosted Node and Node-delegated Bun sequences.

```typescript
import type { AppConfig } from "@scramjet/runtime-types";
import type { HubClient, SpaceClient } from "@scramjet/rest-api2";
import type { ManifestDeclaration, ManifestSequenceAppContext } from "@scramjet/sequence-types";

type ProducerConfig = AppConfig & { manifestProfile?: "text" | "record" };
type ManifestContext = ManifestSequenceAppContext<ProducerConfig, unknown, HubClient, SpaceClient>;

export async function initialize(this: ManifestContext): Promise<void> {
  const profile = this.config.manifestProfile === "record" ? "record" : "text";
  const outputSchema = profile === "record"
    ? {
        type: "object",
        properties: { value: { type: "string" } },
        required: ["value"]
      }
    : { type: "string" };

  const declaration: ManifestDeclaration = {
    output: {
      description: profile === "record" ? "A value record" : "A text value",
      mediaType: profile === "record" ? "application/json" : "text/plain",
      schema: outputSchema
    },
    rpc: [
      {
        procedure: "normalize",
        description: "Normalize one value",
        contractIdentity: "example.normalize.v1",
        request: { type: "string" },
        response: { type: "string" }
      }
    ],
    topics: [
      {
        name: "status-updates",
        direction: "output",
        description: "Public status notifications",
        mediaType: "application/json",
        schema: { type: "object", properties: { status: { type: "string" } } }
      }
    ]
  };

  const receipt = await this.api.declare(declaration);
  this.logger.info("Runtime manifest published", receipt);
}
```

Start two instances of this producer with different per-instance `manifestProfile` values to publish a string output and an object output independently. The awaited declaration completes publication before an initializer can complete and before the runner sends READY. The receipt contains the STH-assigned `instanceId`, `sequenceId`, and an opaque revision; it is an automatic publication result, not a human approval step. Each accepted declaration, including a later update, receives a fresh revision for only that instance. The same API can be called later and repeatedly. A rejected declaration reports a normal error, and an invalid update leaves that instance's prior publication intact.

Python sequences use the same JSON declaration shape and await the same publication result:

```python
async def initialize(context):
    receipt = await context.api.declare(
        {
            "output": {
                "description": "A text value",
                "mediaType": "text/plain",
                "schema": {"type": "string"},
            }
        }
    )
    context.logger.info("Runtime manifest published: %s", receipt)
```

Manifest declaration is available to hosted Python whether or not HTTP/ASGI exposure is configured. Attaching an ASGI application with `context.api.attach(app)` remains a separate operation. Existing `context.hub` / `context.space` behavior is unchanged; use `context.hub_client()` for the v2 manifest reads below when that client is configured.

## Read manifests through HubClient v2

Current hosted Node/Bun sequences use the injected HubClient v2 view:

```typescript
const instanceResponse = await this.hubClient().instance(instanceId).manifest();
if (instanceResponse.status !== 200) throw new Error("Could not read instance manifest");
const instanceDocument = instanceResponse.body;

const sequenceResponse = await this.hubClient().sequence(sequenceId).manifest();
if (sequenceResponse.status !== 200) throw new Error("Could not read sequence manifests");
const publishedInstances = sequenceResponse.body.items;
```

Hosted Python has corresponding read-only views over its existing verser2 Broker:

```python
instance_response = await context.hub_client().instance(instance_id).manifest()
if instance_response.status != 200:
    raise RuntimeError("Could not read instance manifest")
instance_document = instance_response.body

sequence_response = await context.hub_client().sequence(sequence_id).manifest()
if sequence_response.status != 200:
    raise RuntimeError("Could not read sequence manifests")
published_instances = sequence_response.body["items"]
```

Both APIs return the ordinary status/headers/body envelope. An instance body has `instanceId`, `sequenceId`, `revision`, `manifest`, and public `sequence` metadata (`name`, `version`, and `description` when available). A known instance without a current publication returns status 200 with `revision: null` and `manifest: null`. A sequence collection has `sequenceId` and `items`; it contains only currently published instance documents, retaining each instance's identity and declaration. A known sequence with no published manifests returns an empty `items` array. Unknown identities follow the existing not-found behavior; check status before using the body.

Use inventory to determine whether an instance is running or callable. Sequence collection results are not a shared or selected sequence contract: different instances may publish different documents, and undeclared or terminated instances do not appear.

## Schema and lifecycle boundaries

Authors provide JSON Schema documents directly. A schema may be a JSON object or boolean; keywords, references, extensions, nested JSON values, and array order are preserved. STH does not evaluate schemas, fetch external references, enforce runtime payloads, register RPC handlers, or connect topics. Normal declaration and JSON guards reject malformed field types and non-JSON values such as functions, cycles, and non-finite numbers; the Node snapshot guard also rejects accessors. They do not inspect schema meaning or scan strings for secrets. Treat every declaration field and schema as public metadata; do not place private configuration in it.

If a sequence uses Zod or another validation library, converting to JSON Schema is the author's choice and responsibility inside that sequence. The runners do not install a converter, and publication does not promise that a private conversion exactly represents the author's validator.

The current publication belongs to its running instance and is removed when that instance actually terminates, even if controller diagnostics remain visible briefly. Audit records describe committed publish, update, and removal changes; they are not a live sequence watch, replay API, or guaranteed durable manifest store. No sequence-watch behavior is described here.

## Executable examples

The canonical producer and consumer fixtures are used by the hosted runtime proof:

- [Node producer](../../bdd/data/sequences/bdd-runtime-manifest-node-producer/index.js) and [Node consumer](../../bdd/data/sequences/bdd-runtime-manifest-node-consumer/index.js)
- [Bun-selected producer](../../bdd/data/sequences/bdd-runtime-manifest-bun-producer/index.js) and [Bun-selected consumer](../../bdd/data/sequences/bdd-runtime-manifest-bun-consumer/index.js); this exercises the current Bun wrapper's Node delegation, not native Bun execution
- [Python producer](../../bdd/data/sequences/python-bdd-runtime-manifest-producer/main.py) and [Python consumer](../../bdd/data/sequences/python-bdd-runtime-manifest-consumer/main.py)

These are distinct from the earlier disposable EVENT/getEvent proof. Hosted source and built BDD results are pending; this guide describes the API and does not claim that the end-to-end proof has passed.

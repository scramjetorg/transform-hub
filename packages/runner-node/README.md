# `@scramjet/runner-node`

Node sequence runtime spawned by `@scramjet/runner` for process-isolated sequence execution.

The outer runner keeps the adapter-facing contract. This package owns sequence-local runtime behavior such as `AppContext`, sequence stream handling, exposed APIs, and host communication.

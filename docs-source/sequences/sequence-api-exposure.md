---
id: sequences-api-exposure
slug: /sequences/api-exposure
title: Exposing a sequence HTTP API
---

# Exposing a sequence HTTP API

## Readiness before exposure

Use `this.api.use(path, handler)` for a sequence-local HTTP surface. Validate packaged resources and required configuration before registering routes or entering a long-running stream/promise. The listener is deferred until validation succeeds. On validation failure, emit structured diagnostics, leave no route listener active, and end the instance as errored; callers must start a fresh instance.

Readiness is separate from liveness. Poll the Hub or Manager readiness signal and verify the instance route is available. Do not replace readiness polling with a fixed sleep. Return small JSON values, stream large bodies, or provide a configured artifact/reference; the platform does not impose a new universal payload limit for this guide.

The sequence API owns its route and its own authorization assumptions. External services may call it, but each such service manages its own authentication, authorization, and lifecycle.

## Limits and boundaries

The process, Docker, and Kubernetes adapters expose the route according to their configured network boundaries. The route is transient runtime service state: it is not a durable job queue, does not replay requests after disconnect, and does not imply exactly-once processing. Choose authentication and authorization at the deployment boundary; never treat instance identity as a secret.

For installed execution, use the [local validation service Process Adapter workflow](../examples/lifecycle-local-validation-service.md#install-and-verify-the-deliverable-with-the-process-adapter), then refer to the [canonical installed Process Adapter example baseline](setup-and-run.md#installed-process-adapter-example-baseline). Maintainers may use repository lifecycle checks as optional evidence; they are not an author prerequisite or terminal validation step.

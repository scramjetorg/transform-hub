# @scramjet/api-router

Schema-aware route declaration, manifest, and client contract package for Scramjet Transform Hub.

This package is introduced by the API revamp track as the foundation for:

- decorator and imperative route declarations;
- Zod-first request and response schemas;
- route manifests shared by runtime execution, OpenAPI generation, and client construction;
- HTTP and verser2 transport contracts for a generic API client.

The package is intentionally framework-neutral at the core. Existing `@scramjet/api-server` integration should be implemented as an adapter around the exported route manifest and execution contracts.

# Phase 3 — Documentation and examples

## Goal

Make the native contract discoverable, complete, and accurate for local processes, Docker Compose, and Kubernetes.

## Owned paths

- `docs-source/{cli,transform-hub,manager,sequences,examples,deployment}/**`, `docs/sidebars/**`, root `README.md`, package READMEs, and `templates/sequences/**`
- Generated `docs/content/**` only through the repository documentation generator

## Tasks

- [ ] Publish a canonical native quickstart using a trusted bundle, MultiManager `2443`, STH registration, and `si` deployment/run.
- [ ] Publish one authoritative port matrix marking each listener as client-facing, private network, loopback, optional direct ingress, or compatibility-only.
- [ ] Write full local-process, Docker Compose, and Kubernetes guides. Phase 3 establishes the first complete reference-Compose proof aligned to its published guide. Kubernetes documents its explicit prerequisites and network/RBAC boundary and is labelled “not live-cluster verified” until the deferred test environment decision is resolved.
- [ ] Write complete Node, Python, and Bun sequence tutorials from scaffold to observed output.
- [ ] Mark HTTP/v1, CPM, direct-Hub ingress, `8001`, and stale image metadata accurately as compatibility or internal where applicable; remove contradicted claims.
- [ ] Rebuild generated documentation and ensure links/indexes lead users to the recommended path first.

## Acceptance criteria

- A reader can follow a full native path without consulting legacy pages for configuration values.
- Only `2443` is instructed as client-facing for the recommended topology; compatibility cases state why additional ports are needed.
- Local, Compose, and Kubernetes pages do not promise unsupported provisioning or exposure behaviour.

## Verification

- Repository documentation generate/check commands, link/index checks, command/help assertions, and the first complete reference-Compose proof. Phase 1's independent native BDD proof is not substituted for the Compose proof.

## Non-goals

- Publishing an HA/Kubernetes production blueprint or deleting compatibility documentation.

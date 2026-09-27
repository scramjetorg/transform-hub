# Phase 3 — Documentation and examples

## Goal

Make the native contract discoverable, complete, and accurate for local processes, Docker Compose, and Kubernetes.

## Owned paths

- `docs-source/cli/verser2-cli.md`
- `docs-source/transform-hub/{configuration.md,build-run.md}`
- `docs-source/manager/{connecting-hubs.md,docker-compose.md,csr-enrollment.md}`
- `docs-source/sequences/**`, `docs-source/examples/**`, and `docs-source/deployment/**`
- New detailed canonical guide pages under those sections
- Generated outputs only through repository generators; no generated file is independently authored scope
- `examples/native-onboarding-poc/` is explicitly excluded from publishing, documentation linking, sidebar inclusion, and user-facing example coverage.

## Dependencies

- Phase 2 exclusively owns `templates/sequences/**` and runtime proof. This phase describes and links templates but cannot change them.
- Phase 4 exclusively owns root/package README entrypoints, docs gateway content, sidebar ordering, and “recommended path first” navigation. This phase supplies their detailed guide targets.

## Tasks

- [ ] Publish the detailed canonical native first-sequence tutorial using a trusted bundle, MultiManager `2443`, STH registration, and `si` deployment/run; Phase 4 routes entrypoints to it.
- [ ] Publish the mandatory installation/first-deployment, local CA-only TLS, production TLS plus optional mTLS, trusted bundle/profile, compatibility/migration, and local/Compose/Kubernetes guide outcomes. Installation uses next-release dependencies in a sequence-project `package.json` and `npx`, not global or container installation.
- [ ] Publish one authoritative port matrix marking each listener as client-facing, private network, loopback, optional direct ingress, or compatibility-only.
- [ ] Write full local-process, Docker Compose, and Kubernetes guides. Phase 3 establishes the first complete reference-Compose proof aligned to its published guide. Kubernetes documents its explicit prerequisites and network/RBAC boundary and is labelled “not live-cluster verified” until the deferred test environment decision is resolved.
- [ ] Write complete Node, Python, and Bun sequence tutorials from scaffold to observed output.
- [ ] Mark HTTP/v1, CPM, direct-Hub ingress, `8001`, and stale image metadata accurately as compatibility or internal where applicable; remove contradicted claims.
- [ ] Rebuild generated documentation for technical-guide validation. Phase 4 owns entrypoint link and index priority changes.

## Acceptance criteria

- A reader can follow a full native path without consulting legacy pages for configuration values.
- The guide set includes complete, secret-safe CA-only and optional-mTLS examples that distinguish server trust, client authentication, and fingerprint authorization.
- Only `2443` is instructed as client-facing for the recommended topology; compatibility cases state why additional ports are needed.
- Local, Compose, and Kubernetes pages do not promise unsupported provisioning or exposure behaviour.

## Verification

- Repository documentation generate/check commands, link/index checks, command/help assertions, and the first complete reference-Compose proof. Phase 1's independent native BDD proof is not substituted for the Compose proof.

## Non-goals

- Publishing an HA/Kubernetes production blueprint or deleting compatibility documentation.
- Publishing or linking the maintainer-only `examples/native-onboarding-poc/` diagnostic.

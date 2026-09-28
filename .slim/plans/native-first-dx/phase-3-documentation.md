# Phase 3 — Documentation and examples

## Goal

Make the native contract discoverable, complete, and accurate for local processes, Docker Compose, and Kubernetes.

## Owned paths

- `docs-source/cli/verser2-cli.md`
- `docs-source/transform-hub/{configuration.md,build-run.md}`
- `docs-source/manager/{connecting-hubs.md,docker-compose.md,csr-enrollment.md}`
- `docs-source/sequences/**`, `docs-source/examples/**`, and `docs-source/deployment/**`
- `AGENTS.md` for the finalized npm/npx tooling, validation commands, and native onboarding plan pointers
- New detailed canonical guide pages under those sections
- Generated outputs only through repository generators; no generated file is independently authored scope
- `examples/native-onboarding-poc/**` is promoted and cleaned as the canonical published user example, with generated/runtime residue removed and a stable user-facing README.

## Dependencies

- Phase 2 exclusively owns `templates/sequences/**` and runtime proof. This phase describes and links templates but cannot change them.
- Phase 4 exclusively owns root/package README entrypoints, docs gateway content, sidebar ordering, and “recommended path first” navigation. This phase supplies their detailed guide targets.

## Tasks

- [ ] Publish the detailed canonical native first-sequence tutorial using a trusted bundle, MultiManager `2443`, STH registration, and `si` deployment/run; Phase 5 routes entrypoints to it.
- [ ] Add a two-sequence typed tutorial using `hubClient().instance(id).rpc(contract).call()` and make the native onboarding PoC's cleaned form the canonical user example.
- [ ] Add a documentation version-drift test asserting `^2.2.0` is derived from the root package version rather than hard-coded independently.
- [ ] Require npm/npx-only JavaScript tooling in examples and docs; complete stale command, port, image metadata, link, and generated-documentation corrections.
- [ ] Update `AGENTS.md` with the canonical example, native Compose/Kubernetes proof boundaries, and supported validation commands.
- [ ] Publish the mandatory installation/first-deployment, local CA-only TLS, production TLS plus optional mTLS, trusted bundle/profile, compatibility/migration, and local/Compose/Kubernetes guide outcomes. Installation uses next-release dependencies in a sequence-project `package.json` and `npx`, not global or container installation.
- [ ] Publish one authoritative port matrix marking each listener as client-facing, private network, loopback, optional direct ingress, or compatibility-only.
- [ ] Write full local-process, Docker Compose, and Kubernetes guides. Phase 3 establishes the first complete native Compose MM+STH reference and BDD proof aligned to its published guide. Kubernetes documents explicit prerequisites and network/RBAC boundaries and links to Phase 4 live proof.
- [ ] Write complete Node, Python, and Bun sequence tutorials from scaffold to observed output.
- [ ] Mark HTTP/v1, CPM, direct-Hub ingress, `8001`, and stale image metadata accurately as compatibility or internal where applicable; remove contradicted claims.
- [ ] Rebuild generated documentation for technical-guide validation. Phase 5 owns entrypoint link and index priority changes.
- [ ] Make the canonical single-Compose reference publish only `127.0.0.1:2443` and show offline Manager CLI `v2 sign` plus caller certificate installation: STH's one certificate authorizes its exact broker+guest registration set, then STH starts/registers; `si`'s one certificate authorizes one broker, then `si` connects and completes typed RPC.
- [ ] State the v2 security contract in the guide: local key/CSR generation, offline CSR validation/signing/persistence, no CA/signing key at MM, and MM `2443` checks of the actual raw fingerprint, serial, SAN, and Verser registration against the public issued registry and exact set.
- [ ] Make the Compose proof explicitly remove generated keys, CSRs, certificates, registry records, temporary resources, containers, and processes on success and failure; do not publish secret material or imply redemption, grants, listeners, operator approval files, rotation, CRL, HSM, HA, RBAC, or remote approval.
- [ ] Document the concrete v2 public-issued record namespace and security rules without implying a v1 change: certificate ID indexed by raw fingerprint/serial/SAN/principal/broker/exact guest set/validity/revocation state; append-only/auditable public records; fail-closed actual-certificate and Verser-registration matching; and no private keys/signing authority in registry, MM, bundles, logs, or responses.

## Acceptance criteria

- A reader can follow a full native path without consulting legacy pages for configuration values.
- The guide set includes complete, secret-safe CA-only and optional-mTLS examples that distinguish server trust, client authentication, and fingerprint authorization.
- Only `2443` is instructed as client-facing for the recommended topology; compatibility cases state why additional ports are needed.
- Local, Compose, and Kubernetes pages do not promise unsupported provisioning or exposure behaviour; the canonical example is publishable and linkable.
- The canonical single-Compose evidence publishes only `127.0.0.1:2443`, proves STH and `si` through offline `Manager v2 sign` and caller certificate installation, checks the public issued registry against actual certificate fields and Verser registration, completes typed RPC, and leaves no generated state or processes behind.
- v2 documentation permits only the bounded offline exact-set certificate model and explicitly excludes redemption, grants, enrollment listeners, operator approval files, CA/signing keys at MM, rotation, CRL, HSM, HA, RBAC, and remote approval; legacy/v1 behavior remains labelled compatibility.
- The single Compose flow is one bounded proof, not separate topologies: generate local STH key/CSR, run offline `Manager v2 sign`, install the certificate, start/register STH, generate local `si` key/CSR, sign offline for one broker, install the certificate, connect through `2443`, and complete typed RPC. Success and failure cleanup removes keys, CSRs, certificates, registry records, temporary resources, and stops/removes containers and processes; the published guide contains no secret material.

## Verification

- Repository documentation generate/check commands, link/index/version-drift checks, command/help assertions, canonical-example checks, and the complete native Compose MM+STH BDD proof. Phase 1's independent native BDD proof is not substituted for the Compose proof.

## Non-goals

- Publishing an HA/Kubernetes production blueprint or deleting compatibility documentation; provisioning a Kubernetes cluster.
- Expanding v2 into redemption, grants, listeners, operator approval files, rotation, CRL, HSM, HA, RBAC, or remote approval, or presenting CA-only authorization as sufficient.

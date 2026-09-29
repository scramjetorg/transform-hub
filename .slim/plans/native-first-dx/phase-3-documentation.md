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
- Verser2 `0.9.2` includes the secure duplicate authenticated-session support tracked by [signicode/verser2#79](https://github.com/signicode/verser2/issues/79). On 2026-09-29 the focused native Compose overlap proof passed using one issued `si` identity and broker ID across independent output and info CLI sessions.

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
- [ ] Make the canonical single-Compose reference publish only `127.0.0.1:2443` and show offline Manager CLI `v2 sign` plus caller certificate installation: issue one unique STH certificate/key for one `(realm, space, hub)` binding, authorize its exact federation host, broker, and guest route, verify the actual federation callback, bind Manager registration to the authenticated federation principal, then start/register; issue `si` a separate certificate/key for one broker identity, then connect and complete typed RPC. Do not document broker/guest-only or normal multi-Hub authorization.
- [ ] State the v2 security contract in the guide: local key/CSR generation, offline CSR validation/signing/persistence, no CA/signing key at MM, and MM `2443` checks of the actual raw fingerprint, serial, SAN, and Verser registration against the public issued registry and exact set.
- [ ] Make the Compose proof explicitly remove generated keys, CSRs, certificates, registry records, temporary resources, containers, and processes on success and failure; do not publish secret material or imply redemption, grants, listeners, operator approval files, fleet rotation, CRL automation, HSM, HA, RBAC, or remote approval. Document only binding-scoped rotation and revocation semantics.
- [x] Prove that concurrent independent HTTP/2 connections reuse the same issued `si` client identity/certificate/key and broker ID and are securely accepted. Do not authorize unrelated broker IDs, weaken certificate checks, or impose a numeric broker-session limit. Verser2 `0.9.2` and the focused native Compose overlap proof demonstrated this on 2026-09-29.
- [ ] Document the concrete v2 public-issued record namespace and security rules without implying a v1 change: certificate ID indexed by raw fingerprint/serial/SAN/principal/`(realm, space, hub)`/federation host/broker/exact guest route/validity/rotation lineage/revocation state; append-only/auditable public records; collision rejection; fail-closed actual-certificate, federation-callback, and Manager-registration-to-principal matching; binding-scoped rotation and revocation; and no private keys/signing authority in registry, MM, bundles, logs, or responses.

## Acceptance criteria

- A reader can follow a full native path without consulting legacy pages for configuration values.
- The guide set includes complete, secret-safe CA-only and optional-mTLS examples that distinguish server trust, client authentication, and fingerprint authorization.
- Only `2443` is instructed as client-facing for the recommended topology; compatibility cases state why additional ports are needed.
- Local, Compose, and Kubernetes pages do not promise unsupported provisioning or exposure behaviour; the canonical example is publishable and linkable.
- The canonical single-Compose evidence publishes only `127.0.0.1:2443`, proves STH and `si` through offline `Manager v2 sign` and caller certificate installation, checks the public issued registry against actual certificate fields and Verser registration, completes typed RPC, and leaves no generated state or processes behind.
- v2 documentation permits only the bounded offline binding-scoped exact-set certificate model and explicitly excludes redemption, grants, enrollment listeners, operator approval files, CA/signing keys at MM, fleet/multi-Hub certificates, CRL automation, HSM, HA, RBAC, and remote approval; it must still document binding-scoped rotation and revocation semantics. Legacy/v1 behavior remains labelled compatibility.
- The single Compose flow is one bounded proof, not separate topologies: generate local STH key/CSR, run offline `Manager v2 sign`, install the certificate, start/register STH, generate local `si` key/CSR, sign offline for one broker, install the certificate, connect through `2443`, and complete typed RPC. Success and failure cleanup removes keys, CSRs, certificates, registry records, temporary resources, and stops/removes containers and processes; the published guide contains no secret material.
- The concurrent `si` proof reuses exactly one issued client identity/certificate/key and broker ID over independent overlapping HTTP/2 connections, retains exact certificate authorization, and has a focused overlap test. This passed on Verser2 `0.9.2` on 2026-09-29; it is not implemented through unrelated broker IDs or a broker-session cap.

## Verification

- Repository documentation generate/check commands, link/index/version-drift checks, command/help assertions, canonical-example checks, and the complete native Compose MM+STH BDD proof. Phase 1's independent native BDD proof is not substituted for the Compose proof.

## Non-goals

- Publishing an HA/Kubernetes production blueprint or deleting compatibility documentation; provisioning a Kubernetes cluster.
- Expanding v2 into redemption, grants, listeners, operator approval files, fleet/multi-Hub certificates, CRL automation, HSM, HA, RBAC, or remote approval, or presenting CA-only, broker/guest-only, or claimed-callback authorization as sufficient.

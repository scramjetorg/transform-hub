# Compose bootstrap developer experience — proposal

**Status:** Proposed, non-executable follow-up. This file records the request and repository evidence; it does not approve implementation, an API contract, a delivery mode, or changes to the active native-first plan.

## Goal

Make the native Compose example understandable and usable without requiring developers to hand-run OpenSSL, copy certificate fields, or reverse-engineer its BDD fixture. Document the current bootstrap precisely, then provide a small reusable library, a thin CLI, and a Manager API/v2 integration. Prioritize a clear local developer journey; retain the existing key-custody and trust boundaries.

## What `bootstrap.sh` does today

Source: `examples/native-onboarding-poc/compose/bootstrap.sh` and `compose/compose.yaml`.

1. `set -eu` fails on unset variables or command errors. The script requires a state-directory argument and resolves a relative directory against the Compose example directory, not the caller's current directory.
2. It creates the state directory and `issued-store/`, `sth-identity/`, and `si-identity/` with mode `0700`. The caller owns this disposable state.
3. OpenSSL creates a self-signed RSA-2048 local CA, valid for 365 days, with CA and certificate-signing extensions. `ca.key` is the **private signing key**; `ca.pem` is the public CA certificate.
4. A helper generates `mm.key` and a temporary CSR, writes `DNS:multimanager,DNS:localhost` subject alternative names and `serverAuth,clientAuth` extended usages, and signs `mm.pem` with the local CA for one day. It deletes the temporary CSR and extensions file.
5. It sets generated `*.key` files to mode `0600`, then copies the checked-in `config/mm.json` and `config/sth.json` into the state directory.

The script **does not** issue STH or `si` certificates, populate the issued-record store, install client identities, export/import a bundle, start Compose, publish a host port, or clean up. Today `bdd/lib/native-compose-fixture.ts` performs separate `csr/v2` generate → offline Manager `v2 sign` → install steps, constructs the STH binding and `si` bundle, runs the proof, and tears down its owned resources. The Compose README's shell `trap` owns cleanup for its short example. Compose mounts `ca.pem`, `mm.pem`, `mm.key`, and the public issued store into MultiManager, **not `ca.key`**.

## Proposed developer journey and work

**Prepare → enroll → start/connect → verify → clean up.** A local developer should see the next action and the public output of each stage. The existing low-level CSR/sign/install commands remain usable for operator-separated or remote setups.

1. **Document the workflow.** Extend the authoritative `docs-source` Compose guide and example README with the steps above, generated-file table, lifetime/permissions, CA versus server versus STH/`si` identities, expected network/port and cleanup boundaries. Explain that `bootstrap.sh` alone does not make a runnable enrolled Compose setup; document the additional BDD-only preparation that must become a supported developer path. Regenerate docs from source.
2. **Extract a reusable package and CLI.** Propose `packages/native-bootstrap/` (final name open) with explicit state-directory and config inputs, local-CA/server-identity preparation, public result metadata, and composition of existing CSR/v2 generation, offline signing, installation, and semantic-bundle primitives where appropriate. A thin npm/npx CLI calls this library and reports the next step. It must refuse to silently overwrite existing CA/identity material; cleanup affects only explicitly owned state. Avoid duplicating Manager's issuer policy or Host's key/CSR implementation.
3. **Expose a bounded Manager API/v2 integration.** Use the existing typed space-route pattern in `packages/rest-api2/src/routes.ts` and `packages/manager/src/lib/api/manager-api-v2.ts` for onboarding capabilities, trust/public status, and the agreed bootstrap operation. Define the operation's caller, locality, authority, inputs, outputs, and record owner before implementation. The API must not return private keys or turn local offline signing into an implicit public issuance service. A Manager-side local bootstrap action, if wanted, needs an explicit decision about where its generated CA key is stored and who can invoke it.

## Candidate proof, not approved acceptance criteria

- A fresh developer follows one documented local command path to distinct STH and `si` identities, a trusted native profile, and the example's observed typed RPC result without manual OpenSSL or undocumented BDD setup.
- Library and CLI reuse existing `csr/v2` requests, issued records, and bundle formats; focused tests cover repeat-run refusal, permissions, explicit cleanup, invalid input, and secret-safe output.
- Manager API/v2 has typed request/response tests and a clear caller/record boundary; public responses contain no private keys, signing authority, passphrases, or server-local secret paths. Initial enrollment does not require already having the identity it creates.
- The supported Compose proof succeeds within its existing budget and removes its owned files, containers, networks, and profiles. Documentation generation/checks pass. Documentation validation alone is not live topology proof.

## Decisions to resolve before executable planning

- Does the first CLI prepare only the local CA/server files, or also coordinate the full STH/`si` offline enrollment and bundle/profile setup? Which existing command remains the supported split-custody path?
- Which Manager API/v2 **operation**, beyond discovery/status, is desired: local bootstrap with server-owned files, stateless request validation, or remote issuance? What is its caller authorization and authoritative issued-record source? A write/issuance API would change the current trust model and needs a separate explicit decision.
- Where will the CLI run relative to Compose, and how will it reach native ingress while validating the server name and CA? The current proof does not publish `2443` to the host.
- Who owns local state reuse and cleanup, and should the example use an operator-provided CA instead of a disposable local CA outside development?
- Delivery mode and any phase skips are unconfirmed. If this proposal is later promoted to an approved plan, confirm observable criteria and the smallest phase envelope first; do not treat this note as execution approval.

## Evidence and non-goals

Repository references: `examples/native-onboarding-poc/compose/{bootstrap.sh,README.md,compose.yaml,config/}`, `bdd/lib/native-compose-fixture.ts`, `packages/host/src/lib/csr-enrollment.ts`, `packages/manager/src/lib/{csr-enrollment-v2.ts,csr-enrollment-cli.ts,api/manager-api-v2.ts}`, `packages/rest-api2/src/routes.ts`, and `packages/multi-manager/src/bin/native-bundle.ts`.

Not proposed by default: putting `ca.key` in running MultiManager, returning signing keys over HTTP, CA download as first-use trust, new redemption/grant/listener protocols, replacing existing legacy registration paths, Kubernetes provisioning, or a broad PKI redesign.

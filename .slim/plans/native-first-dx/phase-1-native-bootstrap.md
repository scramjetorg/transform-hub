# Phase 1 — Native bootstrap and configuration

## Goal

Make native onboarding the default STH/MM/`si` configuration path while retaining explicit compatibility settings.

## Owned paths

- `packages/config/src/{verser2-profile.ts,verser2-config.ts,**/*bundle*}`, `packages/cli/src/{lib/commands/{api.ts,config.ts},lib/config/**,bin/**}`, `packages/sth/src/bin/hub.ts`
- `packages/host/src/lib/{host.ts,runner-verser2-host-peers.ts}`, `packages/multi-manager/src/{config/**,lib/{multi-manager.ts,verser2-trust-export.ts}}`
- Matching focused package tests plus `bdd/features/e2e/E2E-018-cli-ingress.feature`, `bdd/features/e2e/E2E-019-*.feature`, and their step definitions

## Tasks

- [ ] Define the versioned connection-bundle schema and trusted local/import handling; provide an admin-produced copy-paste representation with equivalent semantics.
- [ ] Make default startup/help/configuration use native Manager/Space terminology and native upstream settings; map explicit legacy CPM settings as compatibility aliases without changing their behaviour.
- [ ] Add effective-configuration output that distinguishes configured, derived, compatibility, and redacted secret values.
- [ ] Add bounded diagnostics for endpoint reachability, CA handling, route uniqueness/readiness, ingress identity, selected target, and port roles.
- [ ] Make default quickstart/profile activation native; retain explicit HTTP/v1 profile selection for compatibility.
- [ ] Add a real native full-path BDD scenario: `si → MultiManager :2443 → embedded Manager → STH`, with request evidence that excludes HTTP fallback.

## Acceptance criteria

- A trusted bundle or equivalent generated command creates a working native `si` profile without manually entering legacy or transport-discovery fields.
- Fresh native STH upstream registration succeeds without CPM configuration; an explicit legacy CPM configuration remains compatible.
- Diagnostics are actionable and redact secret material; invalid CA, route, identity, and endpoint states remain distinct.
- A fresh `si` without a bundle fails with native setup guidance rather than silently calling its HTTP default. A successful import selects the native profile deterministically; an incomplete native profile is a profile error with no HTTP fallback; an explicitly selected compatibility profile retains HTTP/v1 behaviour.
- The versioned bundle contains public trust/identity data and credential references only—never private keys, PFX content, or passphrases. Import validates the complete artifact before changing an active profile; generated/imported forms yield the same redacted effective profile and target, and overwrite/selection behaviour is deterministic.
- MVP scope excludes discretionary protocol/security redesign.

## Verification

- Named focused workspace tests for changed `config`, `cli`, `sth`, `host`, and `multi-manager` packages; `npm run build:packages`; `npm run test:bdd-ci-verser2`; and the named native full-path BDD scenario.

## Non-goals

- HTTP/CPM removal, CA auto-download, Kubernetes provisioning, HA, and unrelated CLI redesign.

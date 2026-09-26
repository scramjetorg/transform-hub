# Phase 5 — Hardening

## Goal

Make native onboarding safer and failures easier to diagnose in real deployments.

## Owned paths

- `packages/config/src/{verser2-profile.ts,**/*bundle*}`, `packages/cli/src/{lib/commands/{api.ts,config.ts},lib/config/**}`, `docs-source/{cli,manager,transform-hub}/**`, and matching tests

## Tasks

- [ ] Verify secret redaction across bundle import, configuration display, diagnostics, and failed connections.
- [ ] Document CA distribution, certificate rotation responsibility, optional mTLS, port publication, and reverse-proxy/firewall boundaries.
- [ ] Add clear migration notices for compatibility settings and test failure modes that could lead users to unsafe exposure.

## Acceptance criteria

- No native onboarding command logs private key material, passphrases, or secret bundle fields.
- Deployment guidance clearly separates a trusted bundle from transport-discovered data and keeps non-native ports private by default.

## Verification

- Focused secret-redaction and invalid-trust tests; documentation check; relevant TLS/mTLS BDD coverage.

## Non-goals

- New PKI lifecycle service, automated CA enrollment, or transport redesign.

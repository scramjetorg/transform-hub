# Repository Documentation Fix — Outcomes

## Decisions & Rationale

- Generated documentation now lives only under `docs/`; output ownership is marker-validated and legacy cleanup fails closed.
- The root README is directly maintained; package README synchronization is explicit and ownership-protected.
- `Scramjet Platform` documentation presents Hub and Manager roles separately, with verified non-HA and non-persistent topic boundaries.
- CSR enrollment uses Hub-local keys, Manager-approved one-time grants, pinned HTTPS, mTLS/fingerprint authorization, and shared runtime-neutral contracts.
- Developer workflows use `sth-csr-enrollment generate|redeem` and `manager-csr-enrollment approve`, backed by the shared command model.

## Outcomes & Results

- Migrated generated output from `dist-docs/` to `docs/`, added deterministic navigable directory indexes, and preserved reference placeholder disclosures.
- Added public controlled-deployment CSR enrollment documentation and runnable Hub/Manager command workflows.
- Added Manager AVA pre-test typechecking before transpile-only execution and hardened shared command diagnostics.

## Verification Summary

- `npm run docs:generate`, `npm run docs:check`, and owned README synchronization passed.
- Focused docs generator suite: 19 passing tests.
- Memory-guarded package tests: Manager 188; Host 279 with 9 pre-existing CouchDB skips; Config 51.
- Final command-model validation: 8 passing tests; Oracle security and documentation reviews passed after remediation.

## Constraints

- Commands used `ulimit -v 1835008`, `NODE_OPTIONS="--max-old-space-size=1024"`, and `SCRAMJET_AVA_MEMORY_GUARD=1`; the default parent heap-growth threshold was 524288 bytes.

## Risks & Open Items

- The local CSR helper is not production PKI and has no HSM/KMS, CRL/OCSP, automated rollover, replicated state, or secure credential delivery.

## Follow-ups

- Evaluate organizational or managed PKI before production deployment.

## PR / Base Branch

- Mainline workflow on `feat/manager-oss`; no PR was created.

# Deferred Technical Debt

## Local CA helper production-PKI capabilities

- **Finding identity:** local-ca-production-pki-capabilities
- **Status:** deferred / out of current track scope
- **Scope rationale:** The approved helper is limited to development and controlled deployments. It intentionally excludes HSM/KMS-backed or encrypted CA keys, audited approval identities, secure credential delivery, CRL/OCSP, automated renewal and zero-downtime CA rollover, active-session revocation, multi-Manager state replication, certificate inventory/backup/recovery, and organizational production-PKI integration.
- **Follow-up:** Evaluate an organizational CA, managed private PKI, SPIFFE/SPIRE, Vault PKI, or cloud certificate authority before any production deployment.

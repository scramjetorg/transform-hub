# Compose bootstrap: from example to developer workflow

## Outcome

A developer prepares a local Compose workspace, enrolls separate STH and `si` identities, starts MultiManager and STH, connects using a native bundle, observes the provider/caller RPC result, and cleans up—without assembling credentials by hand. `examples/native-onboarding-poc/compose/bootstrap.sh` illustrates the first step; it is **an example of the outcome, not the implementation to extract verbatim**. The future package and CLI should make the whole workflow usable outside the BDD fixture.

## What the example script currently does

`examples/native-onboarding-poc/compose/bootstrap.sh`:

1. Requires a state-directory argument. A relative directory is resolved against the Compose example directory; `set -eu` stops on missing values or command errors.
2. Creates that directory and `issued-store/`, `sth-identity/`, and `si-identity/` with mode `0700`.
3. Generates a self-signed, one-year RSA-2048 local CA: private `ca.key` and public `ca.pem`, with CA/certificate-signing extensions.
4. Generates `mm.key` and a temporary CSR. It signs a one-day MultiManager certificate `mm.pem` with the local CA, using `DNS:multimanager,DNS:localhost` SANs and `serverAuth,clientAuth` usages; it removes the temporary CSR/extension files.
5. Sets generated private keys to mode `0600` and copies `config/mm.json` and `config/sth.json` into the state directory.

That prepares files, **not an enrolled deployment**. The script does not generate or install STH/`si` certificates, populate the issued store, export a bundle, start Compose, or clean up. `compose.yaml` mounts the public CA, MultiManager server certificate/key, and public issued store into MultiManager; the CA signing key remains in the caller-owned state directory. The example README's shell trap and the BDD scenario each handle their own teardown.

## How the complete Compose proof currently enrolls identities

`bdd/lib/native-compose-fixture.ts:393–552` supplies the steps missing from the shell script. It writes exact STH broker/Guest registrations and a `(realm, space, hub, federationHost, broker, guestRoute)` claim, plus a separate `si` broker registration. It prepares an offline signing configuration that references `ca.key`, then uses the existing scripts in this order (paths below are illustrative; the BDD fixture supplies the JSON inputs):

```sh
sth-csr-enrollment v2 generate --identity-dir "$state/sth-identity" \
  --principal sth --registrations "$state/sth-registrations.json" \
  --claim "$state/sth-claim.json" --output "$state/sth.csr.json"
si identity enroll generate --identity-dir "$state/si-identity" \
  --registrations "$state/si-registrations.json" --output "$state/si.csr.json"

manager-csr-enrollment v2 sign --manager-config "$state/mm-sign.json" \
  --request "$state/sth.csr.json" --expected-registrations "$state/sth-registrations.json" \
  --output "$state/sth-issued.json"
manager-csr-enrollment v2 sign --manager-config "$state/mm-sign.json" \
  --request "$state/si.csr.json" --expected-registrations "$state/si-registrations.json" \
  --output "$state/si-issued.json"

# The current fixture extracts certificatePem from each issued JSON into a PEM file.
sth-csr-enrollment v2 install --identity-dir "$state/sth-identity" \
  --request "$state/sth.csr.json" --certificate "$state/sth-issued.pem" \
  --ca-file "$state/ca.pem" --ca-fingerprint "$caFingerprint"
si identity enroll install --identity-dir "$state/si-identity" \
  --request "$state/si.csr.json" --certificate "$state/si-issued.pem" \
  --ca-file "$state/ca.pem" --ca-fingerprint "$caFingerprint"
```

The fixture next exports distinct STH and `si` bundles with `multi-manager native-bundle --broker-id ... --principal sth|si`, writes the semantic STH Manager binding, imports the `si` profile, runs Compose and the typed RPC example, and removes scenario-owned files and containers. It already uses the Host CSR helpers, offline Manager v2 issuer, and bundle exporter; the missing piece is a supported developer-facing way to coordinate them.

## Future work

1. **Documentation:** turn this step-by-step explanation into an authoritative `docs-source` Compose walkthrough, including the files produced, required inputs and environment, how STH/`si` enrollment follows local CA creation, the trust boundary, and cleanup. Do not present `bootstrap.sh` followed immediately by `docker compose up` as a complete onboarding path.
2. **Reusable package and CLI:** add a focused library package (working name `packages/native-bootstrap/`) that coordinates local preparation, existing CSR/sign/install primitives, semantic bundle/profile generation, and explicit cleanup. Give it a thin npm/npx CLI with a caller-selected state directory and useful next-step output. Preserve the separate generate/sign/install commands for split-custody deployments instead of duplicating their logic.
3. **Manager API/v2:** integrate the applicable library operations through the typed Manager-space API in `packages/rest-api2/src/routes.ts` and `packages/manager/src/lib/api/manager-api-v2.ts`. Include a useful bootstrap operation as well as trust/status information. Specify who may invoke it, which machine owns any generated files and signing key, and what public result it returns before implementing the route.

## Gaps the future plan must close

- The current BDD fixture creates registration/claim JSON, a signing configuration, extracted certificate PEMs, bundles, and final STH configuration outside `bootstrap.sh`. A real workflow must create or clearly obtain each input and make the offline signer’s exact expected registrations explicit.
- The Compose README leaves out runtime UID/GID inputs and its `2443` ingress is private to the Compose network. The CLI walkthrough must state where it runs and how it connects without guessing ports or bypassing CA verification.
- Decide how repeated runs handle existing CA/identity files, how cleanup scopes itself, and how the Manager v2 operation is authorized. Keep STH and `si` keys separate; do not put `ca.key` in the running MultiManager or return private keys from the API.
- Verify the library and CLI against the existing `csr/v2` formats, Manager API/v2 contracts, documentation generator, and a bounded Compose provider/caller RPC proof. A documented command must work outside the BDD harness.

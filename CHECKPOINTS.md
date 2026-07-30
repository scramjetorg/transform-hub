# CI dependency checkpoints

`checkpoint-bootstrap.yml` is a manual **developer dry-run** that produces a
plan only for the trusted `main`, `devel`, and `feat/manager-oss` branches. It
does not push an image, update a pointer, upload an artifact, or accept
pull-request/fork input.

## Identity and consumption

The plan writes canonical `provenance/identity.v1.json` and
`provenance/statement.v1.json` plus a checkpoint plan. Identity is SHA-256 over
canonical JSON and contains the source SHA, raw `package-lock.json` hash, exact
Node/npm versions, platform, and sorted release-package manifests. A final
statement may bind the identity only to an OCI image digest.

Immutable discovery tags use `cp-v1-<identity-sha256>`. Mutable branch pointers
are limited to `cp-v1-main`, `cp-v1-devel`, and `cp-v1-feat-manager-oss`. A
consumer resolves a pointer once, verifies the identity and statement, then
uses `ghcr.io/...@sha256:...`; it never consumes a tag as an image identity. A
missing or mismatched checkpoint falls back to a clean `npm ci`.

The final OCI image must label its identity digest, source revision, lock hash,
Node/npm versions, and OCI platform. Consumers reject a digest when any label,
identity, statement, or image binding differs from the expected identity.

Checkpoint images may contain only `/opt/transform-hub/npm-cache` for a fresh
`npm ci --ignore-scripts --cache` reinstall. They must exclude `node_modules`,
`.npmrc`, credentials, build outputs, and untrusted artifacts.

## Promotion and remote prerequisites

Trusted `devel` and post-publication `main` workflows build the npm cache image,
publish an immutable `cp-v1-<identity-sha256>` tag, inspect its labels and GHCR
digest, then re-read the trusted branch SHA immediately before publishing the
mutable pointer. The pointer digest must equal the immutable digest. A missing
scoped publisher configuration, credential, digest, label, or SHA match fails
the job; it is never treated as a dry-run success.

Real GHCR publication requires `SCRAMJET_GHCR_SCOPED_PUBLISHER=true`, the
same-repository `GITHUB_TOKEN` with `packages: write`, protected
branch/ruleset controls, and retention for immutable digests referenced by
active pointers. Forks may only read verified public digests and can never
publish or promote checkpoints.

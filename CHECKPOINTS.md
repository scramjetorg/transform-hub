# CI dependency checkpoints

`checkpoint-bootstrap.yml` is a manual trusted-publication path for `main`,
`devel`, and `feat/manager-oss`. It resolves the selected trusted branch itself,
builds and verifies an immutable checkpoint, then promotes its matching branch
pointer. It does not accept pull-request/fork source, arbitrary refs, images,
or repositories.

## Identity and consumption

Planning writes canonical `provenance/identity.v1.json` and a checkpoint plan.
Publication stores that identity in the cache image and publishes a separate
immutable `cp-v1-<identity-sha256>-statement` sidecar containing the final
`provenance/statement.v1.json` bound to the cache image digest. Identity is SHA-256 over
canonical JSON and contains the source SHA, raw `package-lock.json` hash, exact
Node/npm versions, platform, and sorted release-package manifests. A final
statement binds the identity only to an OCI image digest.

Immutable discovery tags use `cp-v1-<identity-sha256>`. Mutable branch pointers
are limited to `cp-v1-main`, `cp-v1-devel`, and `cp-v1-feat-manager-oss`. A
consumer resolves a pointer once, resolves its image digest, verifies the image
identity, labels, immutable statement sidecar, statement digest, and statement
image binding, then uses `ghcr.io/...@sha256:...`; it never consumes a tag as an
image identity. A missing or incompatible checkpoint falls back to a clean
`npm ci`.

The final OCI image must label its identity digest, source revision, lock hash,
Node/npm versions, and OCI platform. Consumers reject a digest when any label,
identity, statement, or image binding differs from the expected identity.

Checkpoint images may contain only `/opt/transform-hub/npm-cache` for a fresh
`npm ci --ignore-scripts --cache` reinstall. They must exclude `node_modules`,
`.npmrc`, credentials, build outputs, and untrusted artifacts.

## Promotion and remote prerequisites

Trusted `devel`, post-publication `main`, and manual trusted-branch workflows
build the npm cache image, publish an immutable `cp-v1-<identity-sha256>` tag
and statement sidecar, inspect their labels and GHCR digest, then re-read the
trusted branch SHA immediately before publishing the mutable pointer. The
pointer digest must equal the immutable cache digest. A missing scoped publisher
configuration, credential, digest, label, statement, or SHA match fails the
job; it is never treated as a dry-run success.

Real GHCR publication requires `SCRAMJET_GHCR_SCOPED_PUBLISHER=true`, the
same-repository `GITHUB_TOKEN` with `packages: write`, protected
branch/ruleset controls, and retention for immutable digests referenced by
active pointers. Forks may only read verified public digests and can never
publish or promote checkpoints.

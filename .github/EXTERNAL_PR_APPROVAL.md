# Approved external pull request validation

`External PR approved validation` is a manual, environment-gated validation path
for an open pull request from outside `scramjetorg`. This workflow is defined on
the default `devel` branch, not on `main`.

## Dispatch

1. Open the external pull request and record its current head SHA, base SHA, and
   base ref (`devel`).
2. From the Actions page on `devel`, dispatch **External PR approved validation**
   with the pull request number, exact head SHA, exact base SHA, and `devel` as
   the base ref.
3. An `@scramjetorg/owners` reviewer approves the
   `external-pr-code-owner-approval` environment. Owner self-approval is
   permitted by the environment configuration when the owner is working alone.
4. The workflow verifies the open PR metadata, checks out the external
   repository at the exact verified head SHA, and runs package validation plus
   the four normal BDD-equivalent lanes. All source jobs use no credentials and
   disable Actions cache access.

The final current-head recheck fails if the PR head or base moved while the
validation was running. After any head or base change, dispatch a new run with
fresh SHAs and obtain approval again; do not reuse an old approval run.

## Expected skips and boundaries

Ordinary `pull_request` package/BDD/security jobs remain skipped for external
heads until this approved workflow is dispatched and approved. Same-repository
PR jobs continue through the ordinary workflows. Release, publication,
promotion, Docker image publication, and artifact-authority jobs are not part
of this workflow. It does not use `pull_request_target` or a PR-controlled
reusable workflow and grants no write permissions.

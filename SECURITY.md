# Security controls

## Local secret scanning

This repository uses a checked-in Git pre-push hook as developer feedback. It
scans the commits in each outgoing ref, not merely staged files. CI remains the
required enforcement boundary; `git push --no-verify` never bypasses protected
CI checks.

Install the verified scanner and hook after `npm ci`:

```bash
npm run security:bootstrap
npm run hooks:install
```

`hooks:install` sets this checkout's local `core.hooksPath` to `.githooks`; it
does not install Husky or alter global Git configuration. The hook fails closed
when the scanner is missing, modified, or cannot run. It invokes Gitleaks with
`--redact` and discards scanner output, so a detected value is never printed by
the hook.

The bootstrap downloads the exact Gitleaks version in
`scripts/security/gitleaks-manifest.json`, verifies its release checksum, and
records the installed binary digest under ignored `.security-tools/`. It needs
no repository, npm, or registry credentials.

## Bypass and false positives

Do not use `--no-verify` as a routine workaround. If an emergency local bypass
is unavoidable, rotate any exposed credential, document the incident, and let
required CI make the merge decision. There is no environment variable that
silently skips the hook.

`.gitleaks.toml` intentionally has no active exceptions. A false-positive
exception must be path- or fingerprint-specific, include a rationale, owner,
and expiry in the configuration, and receive security review. Broad regex,
entropy, extension, or rule suppression is prohibited.

## Remaining controls

`Security / repository policy` is a repository-owned defense-in-depth check.
It runs redacted Gitleaks scans for pull requests, merge-queue validation,
protected branch pushes, and scheduled history scans without caches, artifacts,
images, publication credentials, or OIDC. It is not independently
non-bypassable: an organization required workflow sourced from a protected
policy repository and enforced repository rulesets remain mandatory, especially
for fork-origin pull requests.

Actionlint and Zizmor remain required externally pinned policy controls until a
reviewed bootstrap is introduced. The required workflow must run them alongside
Gitleaks across the intended PR/history range without uploading finding reports
or secret-bearing artifacts.

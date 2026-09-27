This is a transient maintainer diagnostic, not supported onboarding, deployment, TLS/mTLS, or production configuration.

# Native onboarding Phase 0 diagnostic

This maintained-but-explicitly-transient example exercises the current native topology with a local Node Hello fixture. It is not a root npm script, workspace, CLI command, or supported onboarding path.

## Preconditions

- Run from a checked-out source tree.
- Build packages first: `npm run build:packages`.
- Linux with `openssl`, `strace`, and `ss` available.
- Ports 2443, 2445, 2446, 8000, 8001, and 11000 must be free.

Run it with:

```sh
npx tsx examples/native-onboarding-poc/run.ts run
```

Set `POC_RUN_ID` to choose the `/tmp/scramjet-native-onboarding-poc-<id>` output directory. The generated record is `poc.md`; a successful run is intentionally recorded as `completed-with-findings`: both wrong-CA and wrong-route native diagnostics currently return generic `CONNECTION` exit 58, rather than distinct TRUST 51 and ROUTE 55 diagnostics.

Clean up a retained run (the record is preserved):

```sh
npx tsx examples/native-onboarding-poc/run.ts cleanup /tmp/scramjet-native-onboarding-poc-<id>
```

The harness keeps secret redaction, process cleanup, native topology assertions, and `strace` evidence that native traffic reaches 2443 without SI traffic to 8000 or 11000. Trust material is generated locally under `/tmp`, is ephemeral, and must never be deployed. It is not trusted-bundle UX and is not an mTLS identity-separation reference. Phase 1 maintains this diagnostic if native contracts change.

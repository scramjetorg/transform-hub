# Native onboarding example

This directory is the small, publishable fixture used by the [native onboarding
guide](../../docs-source/examples/native-onboarding-poc.md). It is deliberately
boring: one dependency-free Node sequence, no credentials, no generated state,
and no fixed-port or host-inspection harness.

## Use it

From this directory, package the sequence and deploy it with the configured
native `si` profile:

```sh
npm pack --dry-run
npx si sequence pack ./sequence -o native-onboarding.tar.gz
npx si sequence deploy native-onboarding.tar.gz
```

The sequence reads one input item and emits `Hello <value>?`. Use the CLI's
native v2 `instance` commands to send input and observe output. The directory
contains no private keys, certificates, tokens, temporary paths, tracing
scripts, or production deployment configuration.

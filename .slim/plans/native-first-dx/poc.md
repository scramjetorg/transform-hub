# Phase 0 native onboarding PoC evidence

## Result

- Status: completed-with-findings.
- Evidence source: `/tmp/scramjet-native-onboarding-poc-1790466867409-1549172/poc.md`.
- Reproduction command: `npx tsx examples/native-onboarding-poc/run.ts run` (exit 0; `completed-with-findings`).

## Post-PoC repository guidance

- The Phase 0 diagnostic example lives at `examples/native-onboarding-poc/`; Phase 3 owns its cleanup and promotion as the canonical user example.
- It requires built `dist/`, Linux with `openssl` and `strace`, and fixed free ports. Generated runtime material stays in `/tmp` and must not be deployed.
- It proves the current topology only. The Phase 0 runner manually enters current transport fields and PoC credentials; Phase 3 must clean this into trusted-bundle UX with separate production mTLS identities.
- Phase 0 owns the initial relocation/README and disposal of generated runtime state and the plan-local copy while retaining this explicit repository asset. Phase 1 maintains it when native profile, bundle, routing, diagnostic, or CLI contracts change. Phase 2 does not own it; Phase 3 cleans, publishes, and links the canonical user example.

## Criteria

- **Met — native journey:** native root/Space identity, trusted local artifact and copy-paste form, Node deploy/stdin, and observed `Hello Alice?`.
- **Met — topology:** `2443` was the only client-facing endpoint; `8000` and `11000` remained private/loopback in the captured topology.
- **Met — no fallback:** relevant `si` strace evidence showed traffic to `2443` and no `8000`/`11000` traffic.
- **Met — trust material:** trust was provided locally and was not fetched through `2443`; raw credentials and PEM material are intentionally omitted here.
- **Not met — distinct diagnostics:** invalid-CA and missing-route profiles both returned secret-safe generic `CONNECTION` exit 58, not distinct `TRUST` 51 and `ROUTE` 55.

## User feedback and rescope

- The author route and labels are clear.
- Phase 1 retains its planned diagnostic correction: define and validate distinct, secret-safe trust and route diagnostics.
- The proven native topology remains unchanged: `si` uses `2443` as the client-facing control endpoint, with no HTTP fallback to `8000` or `11000`.
- No live Kubernetes validation was performed in Phase 0; Phase 4 is the approved future proof using a user-provided cluster and bounded evidence.
- The retained diagnostic code example is validated manually and is not a CI requirement.

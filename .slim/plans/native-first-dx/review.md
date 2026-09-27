# Plan review record

## 2026-09-22 — Developer guidance phase advisory

The advisory review recommended placing Guided developer journeys after detailed documentation so it routes through stable technical guides. The user confirmed that placement, all seven audiences, all routing criteria, and Phase 0 author/non-author guidance feedback. The phase is bounded to navigation, entrypoints, sidebar generation, and cross-links; it does not modify runtime behaviour or technical guide ownership.

The materialized-plan review found overlapping Phase 2/3/4 ownership. Resolved by assigning executable templates and runtime proof exclusively to Phase 2; detailed technical guides exclusively to Phase 3; and README entrypoints, task gateway, sidebar ordering, and navigation exclusively to Phase 4. Generated outputs are derived in every phase, not standalone authored paths.

## 2026-09-27 — Phase 0 rescoping finding

The Phase 0 PoC proved the native root/Space journey, trusted local onboarding form, `2443`-only client-facing topology, no HTTP fallback traffic, Node deploy/stdin, and `Hello Alice?`; the user reported that the author route and labels are clear. Invalid-CA and missing-route profiles both returned generic `CONNECTION` exit 58 rather than distinct `TRUST` 51 and `ROUTE` 55. Per explicit user direction, Phase 1 retains its diagnostic correction while the proven native topology remains unchanged. The existing no-live-Kubernetes limitation is unchanged.

## 2026-09-27 — Retained diagnostic example amendment

Per user direction, the PoC diagnostic is retained at `examples/native-onboarding-poc/` with a maintainer-only README. It is maintained-but-transient, manually/non-CI validated, and never a supported onboarding surface, template, user-facing guide, sidebar, root npm script, or published/linkable example. Phase 0 owns the initial relocation and disposal of generated runtime state and the plan-local copy; Phase 1 maintains it for native profile/bundle/routing/diagnostic/CLI contract changes; Phases 2 and 3 exclude it. The example requires built `dist/`, Linux `openssl`/`strace`, and fixed free ports; generated material remains in `/tmp` and must not be deployed. It proves current topology only, manually enters current transport fields/PoC credentials, and is not trusted-bundle UX or production mTLS identity separation.

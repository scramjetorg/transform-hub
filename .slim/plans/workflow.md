# Effective planning workflow

This repository uses the shipped planning workflow because `.slim/workflows/planner.md` is absent.

1. Research the repository and save a non-executable draft.
2. Ask Oracle to advise on a bounded phase envelope.
3. Interview the user for delivery mode, phase skips, Phase 0 criteria, and unresolved decisions.
4. Materialize the durable plan and ask Oracle to review it.
5. Resolve material findings, then save the final plan. Do not create `outcomes.md` until implementation is complete.

Default phases are an interactive Phase 0 PoC, MVP, Cleanup/DX, Hardening, and Fixes/coverage. Skipping Phase 0 requires a user-confirmed reason; skipping any later default phase requires an explicit user request.

# Deferred Items

## Accepted: Cucumber 13 BDD memory-guard fixture

- **Identity:** `bdd-hook-order` / `Hook order test` external-memory guard breach.
- **Scope and reachability:** Development/test harness only; runs in the Docker Cucumber fixture, not Hub or runner production paths.
- **Evidence:** A full `npm run test:runner` run intermittently measured +16.9 MiB `external` memory against the unchanged 524288-byte BDD parent threshold after Cucumber 7→13; the scenario's heap decreased and repeated isolated runs passed. Cucumber completes formatter/message processing only after the scenario `After` guard hook, so no supported cleanup boundary exists before measurement.
- **Disposition:** Resolved as transient pre-GC allocation, not retained scenario output or external memory. Permanent post-GC component diagnostics now distinguish reclaimed memory from retention; no timeout, memory threshold, skip, exception, allowance, retry, or assertion changed.
- **Owner and revisit:** BDD tooling maintainers. If a future guard failure reports positive post-GC `external` or `arrayBuffers` growth, investigate the reported component before considering any broader Cucumber lifecycle change.

## Deferred: development-tooling audit residuals

- **Pinned npm 11.19.0 chain (moderate/high):** Root release tooling owner. npm 11.19.0 is the current compatible refresh; remaining bundled `tar`, `brace-expansion`, `undici`, and related findings require upstream npm resolution rather than a downgrade or a major-line change. Revisit when npm publishes a compatible fixed release.

## Rejected at track closure

- **Stale production residuals:** root/CLI tar 6, Manager MinIO 7, Dockerode 4/UUID 8, and pico-s3/file-type plus socks/ip-address chains were remediated in Phase 6; current production audit is clean.
- **Stale development residuals:** nyc/Babel findings and the Manager typecheck blocker are no longer current.
- **Optional or out-of-scope cleanup:** removing `scripts/_/pack-sequence` or `scripts/_/upload-sequence`, relocating `@types/js-yaml`, and migrating nyc to c8 require a separately approved track. `scripts/packsequence.js` remains required by the BDD fixture package.
- **Operational checkpoint publication:** the unset `SCRAMJET_GHCR_SCOPED_PUBLISHER` variable is an external fail-closed prerequisite, not implementation debt or an archival blocker.

Final Oracle assessment: `APPROVE archival`; no production-required deferred item remains.

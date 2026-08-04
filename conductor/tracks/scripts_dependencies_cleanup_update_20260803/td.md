# Deferred Items

## Cucumber 13 BDD memory-guard fixture

- **Identity:** `bdd-hook-order` / `Hook order test` external-memory guard breach.
- **Scope and reachability:** Development/test harness only; runs in the Docker Cucumber fixture, not Hub or runner production paths.
- **Evidence:** A full `npm run test:runner` run intermittently measured +16.9 MiB `external` memory against the unchanged 524288-byte BDD parent threshold after Cucumber 7→13; the scenario's heap decreased and repeated isolated runs passed. Cucumber completes formatter/message processing only after the scenario `After` guard hook, so no supported cleanup boundary exists before measurement.
- **Disposition:** Resolved as transient pre-GC allocation, not retained scenario output or external memory. Permanent post-GC component diagnostics now distinguish reclaimed memory from retention; no timeout, memory threshold, skip, exception, allowance, retry, or assertion changed.
- **Owner and revisit:** BDD tooling maintainers. If a future guard failure reports positive post-GC `external` or `arrayBuffers` growth, investigate the reported component before considering any broader Cucumber lifecycle change.

## Production audit residuals

- **Root/CLI tar 6.2.1 (critical):** Direct archive tooling dependency; owner root scripts/CLI. `tar` 6→7 is a major migration with pack/extract compatibility risk. Revisit after focused archive pack/extract regression coverage and an explicit release-security risk decision.
- **Manager MinIO 7.1.3 chain (moderate):** `minio` → `fast-xml-parser`; owner manager storage. Lodash was compatibly updated to 4.18.1. Revisit with MinIO 8 S3 compatibility and BDD evidence.
- **Dockerode 4.0.12 / UUID chain (moderate):** Docker adapter and BDD owner. Dockerode's nested UUID and root UUID 8.3.2 require behavior-sensitive major migrations (Dockerode 4→5 and UUID 8→14). Revisit after Docker API and identifier compatibility validation.

## Development-tooling audit residuals

- **Pinned npm 11.19.0 chain (moderate/high):** Root release tooling owner. npm 11.19.0 is the current compatible refresh; remaining bundled `tar`, `brace-expansion`, `undici`, and related findings require upstream npm resolution rather than a downgrade or a major-line change. Revisit when npm publishes a compatible fixed release.
- **nyc/Babel coverage chain (low/high):** Development coverage/build tooling owner. `@istanbuljs/load-nyc-config`'s nested js-yaml and Babel-related findings do not reach production. Revisit with a compatible nyc/Istanbul/Babel refresh and focused coverage-runner validation.

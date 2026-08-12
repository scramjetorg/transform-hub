# Behavioral Test Migration Inventory

## Boundary

AVA remains limited to deterministic tests that exercise one unit directly with outbound and nondeterministic collaborators replaced by fakes or in-memory implementations. Cucumber owns tests that execute production artifacts or cross real process, network, TLS/mTLS, service/storage, or composed-system boundaries.

## CLI

- Migrate `packages/cli/test/real-mtls-ingress-process.spec.ts` and `real-nonmtls-ingress-process.spec.ts` to isolated real-CLI ingress scenarios. Extend the CLI feature area or add a focused CLI ingress feature.
- Migrate the production-process and profile/session behavior from `packages/cli/test/profile-selection-process.spec.ts` to `bdd/features/e2e/E2E-010-cli.feature` and `bdd/step-definitions/e2e/cli.ts`.
- Rebuild `packages/sth/test/csr-enrollment-cli.spec.ts` as a CLI-oriented Cucumber journey using isolated test PKI fixtures.

## Control Plane

- Migrate behavioral portions of `packages/manager/test/verser2-mtls-external-client.spec.ts`, `manager-control-ingress.spec.ts`, and `packages/host/test/control-ingress.spec.ts` to Manager/Hub ingress scenarios with admission, rejection, fingerprint/trust, and broker-routing assertions.
- Rebuild CLI-facing CSR enrollment and trust journeys; retain deterministic certificate-helper behavior in AVA.

## Runner

- Extend `bdd/features/e2e/E2E-017a-node-spawn-core.feature` and `E2E-017b-node-streaming-stop.feature` with full runner-node artifact journeys from the spawn-based portion of `packages/runner-node/test/runtime-entry.spec.ts`.
- Extend `E2E-014-python.feature` and runner streaming scenarios for user-observable Python ordering and environment behavior where a supported artifact runtime exists.
- Retain executor selection, lifecycle-observer, boot-timeout, log-forwarding, and transport-configuration single-unit AVA tests.

## External Services

- Move `packages/host/test/minio-s3-client.integration.spec.ts` and `packages/manager/test/minio-s3-proxy.integration.spec.ts` to a new tagged `@minio-s3` Cucumber feature using an isolated MinIO service.
- Rebuild `packages/adapter-docker/test/dockerode-daemon.spec.ts` as `@docker-daemon` Cucumber coverage only if the BDD environment can safely reach the Docker daemon. Otherwise retain a minimal, documented fallback smoke.
- Retain archive/config-only process and Kubernetes adapter unit tests.

## Existing Cucumber Extension Points

- `bdd/features/e2e/E2E-010-cli.feature` and `bdd/step-definitions/e2e/cli.ts`
- `bdd/features/verser2/VERSER2-001-isolated-routing.feature` and `bdd/step-definitions/verser2/isolated-routing.ts`
- `bdd/features/manager/` with `bdd/step-definitions/manager/`
- `bdd/features/e2e/E2E-014-python.feature`, `E2E-017a-node-spawn-core.feature`, and `E2E-017b-node-streaming-stop.feature`

## Focused Validation

- `npm run test:bdd-ci-api-node`
- `npm run test:bdd-ci-node`
- `SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js -- --tags "@minio-s3"`
- `SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js -- --tags "@docker-daemon"`

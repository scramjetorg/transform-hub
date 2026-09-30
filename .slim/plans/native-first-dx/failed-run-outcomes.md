# Native-first DX failed run: individual issues

The `2.2.0` release signals below refer to release commit `abcc477b8`. Each item states an observable code path or reported failure to check; later-plan-run issues are listed separately.

**Handoff convention:** Delegate one issue at a time to a single @general agent for its own focused patch; its three fields define the behavior to check, expected observation, and starting points, not a prescribed implementation.

## 2.2.0 release signals: reported/observed paths to check

### Federated STH→Manager pool and response completion
1. **What happens / current code behavior / what's wrong:** The reported STH→Manager response stall involves overlapping requests. Release configuration has `minimumWaitingLeases: 1` alongside a Guest `minWaitingStreams` floor of 128; these configure different pools.
2. **What should happen:** Two overlapping routed requests complete with their own responses within the applicable timeout, with available routes and no starvation.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/config/src/sth/default-config.ts`, `packages/host/src/lib/cpm-connector-leases.ts`; proposed focused assertion for two overlapping leases and response completion, including the different waiting-stream and upstream-pool values.

### Outer runner Guest→STH mTLS and sequence Broker
1. **What happens / current code behavior / what's wrong:** The reported sequence→STH mTLS failure spans two different peers: the outer runner Guest registers with the STH-local Host, whereas a sequence-originated client uses a Broker. The failed peer and TLS verdict need to be captured separately.
2. **What should happen:** A valid outer runner Guest identity registers and obtains its intended route; missing or wrong credentials fail admission. A sequence Broker request receives its own appropriate verdict without being mistaken for runner registration.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/runner/src/transport/verser2-runner-transport.ts`, `packages/host/src/lib/runner-verser2-host-config.ts`; proposed focused assertions for Guest certificate admission and a separate Broker request.

### `si`→MultiManager mTLS
1. **What happens / current code behavior / what's wrong:** The reported `si` mTLS registration failure occurs in the CLI Broker's certificate-backed connection; the release accepts configured CA/client credentials and maps TLS failures, but the reported failure needs its handshake and route verdict.
2. **What should happen:** An issued `si` identity connects to its permitted route; absent or wrong credentials receive a useful refusal without registering a route.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/cli/src/lib/commands/api.ts`, `packages/cli/test/api-command.spec.ts`; focused valid/missing/wrong-client-credential and route-verdict assertions.

### STH v1 registration and Manager v2 access
1. **What happens / current code behavior / what's wrong:** Release STH registration calls `POST /api/v1/sth`; the reported v2-unavailable Hub may then lose identity or route continuity between registration, Manager v2 listing, health, and forwarding.
2. **What should happen:** The registered STH appears by the same identity in v2 listing and health, and a v2 routed request reaches that STH.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/host/src/lib/cpm-connector.ts`, `packages/manager/src/lib/api/manager-api-v1.ts`, `packages/manager/src/lib/api/manager-api-v2.ts`; proposed focused v1-register→v2-list/health/forward assertion.

### Domain mapping and substantive v1 ownership
1. **What happens / current code behavior / what's wrong:** Default STH Guest and Manager route domains can diverge from the configured Hub ID, while Manager v1 retains substantive registration/inventory/storage logic and some v2 storage operations proxy back to v1. This obscures which identities and compatibility paths actually govern a request.
2. **What should happen:** A matching configuration admits and routes the intended identities; a mismatched one is refused without cross-domain access. Substantive v1 requests have an observable, documented compatibility result where v2 access exists.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/config/src/sth/default-config.ts`, `packages/manager/src/lib/route-forwarding-policy.ts`, `packages/manager/src/lib/api/{manager-api-v1.ts,manager-api-v2.ts}`; focused matching/mismatched-domain and v1/v2 counterpart assertions.

## Later plan run: admission, routing, and API issues

### Default CSR-disabled private registration missing claim
1. **What happens / current code behavior / what's wrong:** The private v2 dispatcher could process registration without an exact federation STH claim when CSR enrollment was disabled; formal review found the default listener exposed this path. Cloned capability, mismatched Hub/space/route, and public `si` entry need the same boundary check.
2. **What should happen:** Private registration without an accepted, matching federation claim is refused and Manager inventory stays unchanged; the public `si` POST cannot perform private registration, on either default or issued-mTLS listener.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/multi-manager/src/lib/multi-manager.ts`, existing `packages/multi-manager/test/lib/private-sth-registration.spec.ts`; focused missing-claim/default-listener, cloned/mismatched-claim, and public-POST assertions in that spec.

### Issued certificate exact binding and revocation
1. **What happens / current code behavior / what's wrong:** Certificate admission and Manager registration use separate paths; relying on only a CA or a supplied route can admit a peer outside its issued fingerprint, serial, SAN, registration set, `(realm, space, hub)`, federation Host, broker, or Guest-route binding. Expiry/revocation must affect both paths.
2. **What should happen:** Only the exact unexpired, unrevoked identity is admitted for its named role and route at both federation and Manager registration; mismatches fail, STH and `si` have distinct identities, and running/public issued material exposes no CA signing key.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/multi-manager/src/lib/{multi-manager.ts,csr-enrollment-v2.ts}`, `packages/manager/src/lib/manager.ts`; focused exact-binding, expiry/revocation, and issued-record-material assertions in the corresponding package specs.

### Opaque federation context and route authorization
1. **What happens / current code behavior / what's wrong:** Verser2 route advertisement alone carries neither the callback's opaque authorization context nor permission to forward. The plan exposed an admitted STH Host whose request was denied before reaching its Manager; context propagation was the separate dependency tracked as #72.
2. **What should happen:** The attached Manager receives the original opaque context; verified STH Host→its Manager ingress and registered Manager↔STH control traffic passes, while unregistered, cross-space, `runner.*`, and unrelated forwarding fails.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/multi-manager/src/lib/{multi-manager.ts,federated-control-route-policy.ts}`, existing `packages/multi-manager/test/lib/{private-sth-registration.spec.ts,federated-control-route-policy.spec.ts}`; focused context-identity and allow/deny-pair assertions.

### Concurrent `si` sessions with one identity
1. **What happens / current code behavior / what's wrong:** Verser2 0.9.1 rejected a second live session with the same broker peer ID before authentication. The attempted overlap uses independent CLI HTTP/2 sessions with one issued `si` identity and broker ID; multiplying broker IDs would violate the intended binding.
2. **What should happen:** Both authorized sessions remain usable for overlapping output/info requests without route confusion or loss of one session.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/cli/src/lib/commands/api.ts`, `packages/multi-manager/src/lib/multi-manager.ts`; focused two-session/same-certificate-and-broker connection assertion against the Verser2 0.9.2 contract.

### Name-only collision and reconnect
1. **What happens / current code behavior / what's wrong:** Certificate-free `sth.<hub>.<space>` admission relies on a self-asserted name. A pending or active duplicate, or a reconnect reusing that name, can collide with the current route/controller.
2. **What should happen:** Only the expected name is admitted in certificate-free mode; pending or active duplicates get a specific refusal, and a legitimate subsequent reconnect succeeds.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/multi-manager/src/lib/multi-manager.ts`, `packages/manager/src/lib/manager.ts`, existing `packages/manager/test/manager-registration.spec.ts`; focused name, pending/active collision, and reconnect assertions.

### v1 bypass of mTLS and private-v2 admission
1. **What happens / current code behavior / what's wrong:** A separate Manager v1 registration path could bypass the added private-v2 capability and active-name collision checks. Non-mTLS v1 and mTLS admission require distinct, observable rules.
2. **What should happen:** In mTLS mode neither certificate-free nor v1 registration admits an unauthorized STH; in non-mTLS mode valid v1 registration follows the same observable naming, collision, and ready-route behavior as private v2.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/manager/src/lib/{api/manager-api-v1.ts,api/sth-registration.ts,manager.ts}`, existing `packages/manager/test/{sth-registration.spec.ts,manager-registration.spec.ts}`; focused mTLS-v1 refusal and non-mTLS v1 name/collision parity assertions.

### Stale route/controller races
1. **What happens / current code behavior / what's wrong:** An old controller can appear active again when a replacement advertises the same route; an expired route waiter or late initialization/rollback can then overlap and remove the replacement's state.
2. **What should happen:** After a newer connection owns the route, stale completion or disconnect leaves that newer controller and its route available.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/manager/src/lib/{manager.ts,sth-controller.ts}`, existing `packages/manager/test/manager-registration.spec.ts`; focused waiter-expiry, stale-disconnect, and late-initialization ownership assertions.

### Selected-instance v2 RPC path
1. **What happens / current code behavior / what's wrong:** The attempted selected-instance v2 RPC lost its provider procedure path; the caller contract also initially omitted its empty request, and the proof waited for an intentionally open output stream to close.
2. **What should happen:** A caller POST with an empty request body reaches the selected procedure and returns its typed output while the stream remains open.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/manager/src/lib/api/manager-api-v2.ts`, `packages/api-server/src/handlers/routed-forward.ts`; focused selected-instance POST/procedure-path and typed-output assertion without requiring stream closure.

### CA and missing-route diagnostics
1. **What happens / current code behavior / what's wrong:** Phase 0 observed generic `CONNECTION` 58 for both invalid-CA and missing-route probes (`review.md:9–11`).
2. **What should happen:** An invalid CA yields `TRUST` 51 and a missing route yields `ROUTE` 55, with useful diagnostics rather than `CONNECTION` 58.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/cli/src/lib/{diagnostics.ts,commands/api.ts}`, existing `packages/cli/test/diagnostics.spec.ts`; focused invalid-CA and missing-route exit-code/message assertions.

### Dead CPM connector branches
1. **What happens / current code behavior / what's wrong:** `packages/host/src/lib/cpm-connector.ts` retains eleven unreachable `if (false)` blocks after active control-session behavior moved to `PlatformControlSession`. The dead branches and imports obscure which registration and reconnect paths are live.
2. **What should happen:** The connector has one readable live control-session path, while v1 registration, reconnect, `watchCommunicationResponse()`, `getNetworkInfo()`, and `receiveEvent()` keep their existing behavior.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/host/src/lib/{cpm-connector.ts,platform-control-session.ts}`, existing `packages/host/test/cpm-connector.spec.ts`; focused live v1 registration/reconnect and retained-method assertions.

## Later plan run: proof and runtime issues

### Public registration POST refusal
1. **What happens / current code behavior / what's wrong:** A GET probe does not establish how the public registration POST behaves; the later run needed evidence for the public POST and CLI refusal.
2. **What should happen:** A valid-shaped public POST returns HTTP 404, `si` reports exit 70, and Hub inventory does not change.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/multi-manager/src/lib/multi-manager.ts`, `packages/cli/src/lib/commands/api.ts`, existing `packages/multi-manager/test/lib/private-sth-registration.spec.ts`; focused POST-status/CLI-exit/inventory assertion.

### Stage-marker and duplicate-proof false positives
1. **What happens / current code behavior / what's wrong:** An out-of-order stage marker or arbitrary process exit/timeout can be mistaken for progress or a confirmed duplicate rejection.
2. **What should happen:** Markers appear in observed process order, and a duplicate proof identifies the specific same-name refusal rather than any unrelated failure.
3. **Initial code points and minimal targeted test(s) to verify:** `bdd/lib/{native-bootstrap-fixture.ts,native-bootstrap-no-mtls-fixture.ts}`; focused marker-order and exact same-name-rejection assertions in fixture-level tests.

### Suite Host, readiness, and storage isolation
1. **What happens / current code behavior / what's wrong:** A self-contained Compose scenario may start an unrelated global Hub, proceed before the versioned Manager proxy route exists, reject a successful silent `si hub use`, or share Manager storage across scenarios.
2. **What should happen:** The scenario uses only its intended Host and scenario-owned storage, recognizes a successful silent selection, and begins routed assertions only when the versioned Manager proxy route is ready.
3. **Initial code points and minimal targeted test(s) to verify:** `bdd/step-definitions/e2e/host-steps.ts`, `bdd/lib/{native-control-plane-fixture.ts,native-bootstrap-no-mtls-fixture.ts}`; focused Host-count, proxy-route readiness, silent-selection, and storage-ownership assertions.

### Compose failure diagnostics consume teardown reserve
1. **What happens / current code behavior / what's wrong:** Optional failure logging can consume the time reserved to tear down Compose resources within the 30-second proof budget.
2. **What should happen:** A failed operation leaves enough of the original deadline to remove its owned containers and state, even when diagnostics are slow.
3. **Initial code points and minimal targeted test(s) to verify:** `bdd/lib/native-compose-fixture.ts`; proposed focused deadline-order assertion for diagnostic timeout and teardown reservation.

### Suite cleanup and diagnostic secrecy
1. **What happens / current code behavior / what's wrong:** A failed scenario could retain owned processes, containers, profiles, or generated keys, or expose credentials in failure diagnostics.
2. **What should happen:** Teardown removes scenario-owned resources, and diagnostics redact keys/certificates/credentials while allowing the agreed public CA fingerprint.
3. **Initial code points and minimal targeted test(s) to verify:** `bdd/lib/native-compose-fixture.ts`; proposed focused failed-operation resource-ownership and redacted-error assertions.

### Node exit 137
1. **What happens / current code behavior / what's wrong:** The Node runtime proof stopped at exit 137 with `OOMKilled: true` under the supported 1536 MiB Docker limit; the cause was not established.
2. **What should happen:** The affected Node scenario completes without OOM at the supported limit.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/runner-node/src/`, `scripts/run-bdd-docker.js`; proposed focused memory-baseline and child-exit assertion for the affected Node process.

## Later plan run: DX and remaining coverage

### Compose bootstrap package, CLI, and Manager API
1. **What happens / current code behavior / what's wrong:** The partial `bootstrap.sh` example did not yet demonstrate a repository-CLI Compose flow for local CA creation, Manager and STH CSRs, offline signing/install, distinct `si` identity/bundles, and health waits; the reusable package commands and agreed Manager v2 operation were incomplete (`compose-bootstrap-dx.md`).
2. **What should happen:** A user can complete those steps through the documented CLI flow and observe ready Manager and STH endpoints with the intended distinct identities.
3. **Initial code points and minimal targeted test(s) to verify:** `compose-bootstrap-dx.md`, `packages/config/src/`, `packages/cli/src/`, `packages/manager/src/lib/api/manager-api-v2.ts`; proposed focused CLI command-contract assertions for CA/CSR/sign-server/wait and a Manager-v2-operation response assertion.

### Multi-STH Manager-routed health
1. **What happens / current code behavior / what's wrong:** Passing focused native bootstrap/Compose provider/caller proofs did not establish Manager-routed Verser2 health to **every** STH; direct STH health is insufficient.
2. **What should happen:** Every STH returns a successful health result through its Manager route.
3. **Initial code points and minimal targeted test(s) to verify:** `compose-bootstrap-dx.md`, `packages/manager/src/lib/api/manager-api-v2.ts`; proposed focused routed-health assertion for each STH in the scoped Compose setup.

### Sequence/runner→STH→Manager→`si` journeys
1. **What happens / current code behavior / what's wrong:** Issued-mTLS and name-only end-to-end paths, v1 compatibility detours, typed RPC, and scoped failure cleanup lacked final journey evidence despite passing narrower proofs.
2. **What should happen:** Each named journey returns the expected routed result through `si`, and a failed journey cleans up its owned resources.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/runner/src/transport/verser2-runner-transport.ts`, `packages/host/src/lib/runner-verser2-host-peers.ts`, `packages/manager/src/lib/api/manager-api-v2.ts`; proposed focused routed-request assertion for each named path.

### Source docs, versions, and route map
1. **What happens / current code behavior / what's wrong:** A version-drift finding preceded 38 passing focused docs-generator tests, but final source/generated documentation and the two-handoff route-map walkthrough remained unproven.
2. **What should happen:** Published docs reflect the root version in package/image examples, trusted bundles and CLI help, port roles, CA-only versus mTLS, compatibility return links, and both handoffs in a usable route-map walkthrough.
3. **Initial code points and minimal targeted test(s) to verify:** `docs-source/`, `compose-bootstrap-dx.md`, existing `scripts/test/docs-generator.spec.js`; proposed focused source-example/version and route-map-link assertions in that existing spec where applicable, plus a focused walkthrough-content check.

### `@scramjet/rest-api2` stability label
1. **What happens / current code behavior / what's wrong:** The generated `packages/rest-api2/README.md` calls the package experimental and warns its API may change without notice, while also presenting it as the primary client library for new v2 integrations.
2. **What should happen:** Confirm the supported API/v2 contract and compatibility expectations, then state a consistent stable package status in the authoritative documentation when that contract is ready.
3. **Initial code points and minimal targeted test(s) to verify:** `docs-source/readmes/packages/rest-api2.md`, `packages/rest-api2/src/`, existing `packages/rest-api2/test/{routes,schemas,client}.spec.ts`; focused public route/schema/client compatibility assertions. Do not edit `rest-api2` as part of this findings record.

### Guest stream cap versus upstream-pool bound
1. **What happens / current code behavior / what's wrong:** The Guest waiting-stream minimum and STH upstream-pool bound could be conflated with a Guest maximum; the actual defaults and presence of an explicit cap remain to be checked.
2. **What should happen:** The configured limits have their documented, distinct effects on admitted Guest streams and upstream request capacity; no cap is claimed without observing one.
3. **Initial code points and minimal targeted test(s) to verify:** `packages/config/src/sth/default-config.ts`, `packages/host/src/lib/cpm-connector-leases.ts`; proposed focused defaults-and-boundary assertion for each distinct limit.

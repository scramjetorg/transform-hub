@hub-event-watch
Feature: Abortable Hub event watch
  Scenario: External HTTP client opens real snapshots for every inventory kind
    Given an isolated built Hub for event-watch acceptance
    Then the external HTTP Hub client receives real snapshots for all four watch kinds

  Scenario: External HTTP watch cancellation releases only its server subscription
    Given an isolated DEBUG built Hub for external watch cleanup
    When external HTTP watches abort, close and break with their pending reads
    Then each external watch is released and the control watch remains usable

  Scenario: Hosted Node observer consumes actual Hub watch snapshots
    Given an isolated built Hub for event-watch acceptance
    When an uploaded hosted Node observer opens and consumes actual snapshots for all four kinds
    Then the hosted Node snapshot observation completes gracefully

  Scenario: Hosted Node observer correlates real mutations, manifest revisions and a fresh snapshot
    Given an isolated built Hub for event-watch acceptance
    When an uploaded hosted Node observer proves real mutation, revision, topic and fresh snapshot events
    Then the hosted mutation and revision observation completes gracefully

  Scenario: Two live instances retain independent manifest revisions in sequence events and snapshots
    Given an isolated built Hub for event-watch acceptance
    When two instances of one uploaded producer publish and independently update and remove manifests
    Then sequence watch events and snapshots retain both instance-owned manifests independently

  Scenario: Hosted Node observer cleanup releases aborted, closed and broken watches
    Given an isolated DEBUG built Hub for hosted Node watch cleanup
    When an uploaded hosted Node observer proves abort, repeated close and for-await break cleanup
    Then each hosted Node cancellation releases its real subscription and the observer control watch stays usable

  Scenario: REALCONTAINER Bun-declared observer delegates a real watch to Node
    Given an isolated DEBUG built Hub for Bun-declared Node-delegated watch smoke
    When an uploaded Bun-declared observer proves Node-delegated watch abort cleanup
    Then the Bun-declared observer is proven Node-delegated and its real watch is released

  Scenario: Authenticated external NATIVE live cleanup preserves its shared control Agent
    Given an isolated DEBUG built Hub with authenticated native control ingress
    When authenticated native watches exercise live abort, repeated close and for-await break
    Then each authenticated native watch is released while the same Broker Agent control watch remains usable

  Scenario: Hosted native relay passes a healthy idle filtered watch and real heartbeats
    Given an isolated built Hub routes its native runner sessions through a private H2 relay
    When an uploaded Node observer stays healthy on a filtered watch through more than sixteen seconds of real idle
    Then the routed native watch receives real heartbeats, ignores other-kind changes and releases cleanly

  Scenario: Hosted native relay silences only the selected response after its complete snapshot
    Given an isolated built Hub routes its native runner sessions through a private H2 relay
    When the hosted native relay silences only the selected watch after its snapshot
    Then the hosted observer reports real silence loss within its deadline and the relay drains without closing the stream early

  Scenario: Hosted native relay resets only the selected request stream
    Given an isolated built Hub routes its native runner sessions through a private H2 relay
    When the hosted native relay resets only the selected watch stream
    Then the hosted observer reports actual request-stream loss while its shared control Agent remains live

  Scenario: Hosted native relay drops a real selected change and a new watch recovers from a fresh snapshot
    Given an isolated built Hub routes its native runner sessions through a private H2 relay
    When the hosted native relay drops one real selected sequence change
    Then the hosted observer reports a real cursor GAP and a later fresh snapshot recovers without reviving the old watch

  Scenario: Hosted health watch observes configured CPM disconnect and same-Manager reconnection
    Given an isolated built Hub is connected to one configured embedded Manager
    When an uploaded Node observer watches real CPM disconnect and same-Manager recovery
    Then the same health watch observes linked healthy, degraded, and recovered CPM states

  Scenario: A missing required startup declaration is unhealthy although legacy Host readiness is true
    When the real Host skips a missing required startup sequence and a hosted observer reads health
    Then the required health snapshot reports the opaque missing obligation without changing legacy readiness

  Scenario: A required startup watch follows real READY, restart and recovery
    When a hosted observer watches a gated required startup sequence through READY and supervised restart
    Then health follows the current required owner and recovers without changing startup policy

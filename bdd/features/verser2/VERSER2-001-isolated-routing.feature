@verser2-only @ci-verser2
Feature: Isolated verser2 routing guarantees
  These scenarios exercise verser2 directly without starting Transform Hub,
  Manager, STH, runners, sequences, Docker, or Kubernetes. They are a guardrail
  against upstream verser2 behavior changing underneath Transform Hub.

  Scenario: Broker follows a native 308 redirect to an advertised route
    Given an isolated verser2 host
    And isolated verser2 route "space.local.test" responds with body "space-ok"
    And isolated verser2 route "manager.local.test" redirects with 308 to route "space.local.test"
    When an isolated verser2 broker requests "http://manager.local.test/space/health?trace=1"
    Then the isolated verser2 response status is 200
    And the isolated verser2 response body is "space-ok"
    And isolated verser2 route "space.local.test" received path "/space/health?trace=1"

  @phase3 @upstream-gap @ignore
  Scenario: Broker follows a native 308 redirect across an upstream Host
    Given an isolated verser2 host "manager"
    And an isolated verser2 host "sth"
    And isolated verser2 host "manager" route "remote-sth.local.test" responds with body "remote-sth-ok"
    And isolated verser2 host "manager" route "manager.local.test" redirects with 308 to route "remote-sth.local.test"
    And isolated verser2 host "sth" is connected upstream to host "manager"
    When an isolated verser2 broker connected to host "sth" requests "http://manager.local.test/api/v1/sth/remote/health?trace=2"
    Then the isolated verser2 response status is 200
    And the isolated verser2 response body is "remote-sth-ok"
    And isolated verser2 route "remote-sth.local.test" received path "/api/v1/sth/remote/health?trace=2"

  @phase3 @ignore
  Scenario: Sequence-to-space requests tunnel through the hub-level Host and Manager upstream
    Given an isolated STH-level verser2 host with a Manager upstream host
    And an isolated sequence runtime broker connected to the STH-level verser2 host
    And the Manager upstream resolves a single remote STH owner with a native 308 redirect
    When the sequence runtime broker requests a Space endpoint owned by the remote STH
    Then the request is delivered to the remote STH route without Manager local HTTP forwarding
    And the sequence runtime broker receives the remote STH response body

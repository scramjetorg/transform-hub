@ci-verser2
Feature: Runner Verser2 transport artifact routing
  The built runner transport accepts external Verser2 requests and bridges
  runner and runtime channels without opening test-only HTTP listeners.

  Scenario: An external broker exchanges runner, runtime, and RPC traffic through the built transport
    Given an isolated built runner Verser2 transport
    When an external broker exercises its runner and runtime routes
    Then the built runner transport preserves every routed channel contract

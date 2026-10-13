@runtime-manifest
Feature: Instance-owned runtime manifests through HubClient v2
  @source
  Scenario: Node producer instances publish different manifests consumed by Python
    Given an isolated source runtime-manifest Host
    When the hosted Node producers and Python consumer prove instance-owned manifests
    Then the runtime-manifest proof is complete

  @source
  Scenario: Python producer updates its manifest and Node retrieves it
    Given an isolated source runtime-manifest Host
    When the hosted Python producer and Node consumer prove manifest update and rejection
    Then the runtime-manifest proof is complete

  @source
  Scenario: Bun-selected producer and consumer use the Node-delegated wrapper
    Given an isolated source runtime-manifest Host
    When the hosted Bun-selected fixtures prove delegated manifest retrieval
    Then the runtime-manifest proof is complete

  @built
  Scenario: Node producer instances publish different manifests consumed by Python
    Given an isolated built runtime-manifest Host
    When the hosted Node producers and Python consumer prove instance-owned manifests
    Then the runtime-manifest proof is complete

  @built
  Scenario: Python producer updates its manifest and Node retrieves it
    Given an isolated built runtime-manifest Host
    When the hosted Python producer and Node consumer prove manifest update and rejection
    Then the runtime-manifest proof is complete

  @built
  Scenario: Bun-selected producer and consumer use the Node-delegated wrapper
    Given an isolated built runtime-manifest Host
    When the hosted Bun-selected fixtures prove delegated manifest retrieval
    Then the runtime-manifest proof is complete

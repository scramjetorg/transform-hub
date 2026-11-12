@runtime-manifest
Feature: Instance-owned runtime manifests through HubClient v2
  @source
  @starts-host
  Scenario: Node producer instances publish different manifests consumed by Python
    Given an isolated source runtime-manifest Host
    When the hosted Node producers and Python consumer prove instance-owned manifests
    Then the runtime-manifest proof is complete

  @source
  @starts-host
  Scenario: Python producer updates its manifest and Node retrieves it
    Given an isolated source runtime-manifest Host
    When the hosted Python producer and Node consumer prove manifest update and rejection
    Then the runtime-manifest proof is complete

  @source
  @starts-host
  @requires-bun
  Scenario: Bun-selected producer and consumer execute in Bun
    Given an isolated source runtime-manifest Host
    When the hosted Bun-selected fixtures prove native Bun manifest retrieval
    Then the runtime-manifest proof is complete

  @built
  @starts-host
  Scenario: Node producer instances publish different manifests consumed by Python
    Given an isolated built runtime-manifest Host
    When the hosted Node producers and Python consumer prove instance-owned manifests
    Then the runtime-manifest proof is complete

  @built
  @starts-host
  Scenario: Python producer updates its manifest and Node retrieves it
    Given an isolated built runtime-manifest Host
    When the hosted Python producer and Node consumer prove manifest update and rejection
    Then the runtime-manifest proof is complete

  @built
  @starts-host
  @requires-bun
  Scenario: Bun-selected producer and consumer execute in Bun
    Given an isolated built runtime-manifest Host
    When the hosted Bun-selected fixtures prove native Bun manifest retrieval
    Then the runtime-manifest proof is complete

@native-compose @requires-docker @docker-specific
Feature: Native Compose onboarding proof
  Scenario: Compose publishes only MultiManager and observes a typed Node result
    Given the canonical native Compose proof is available
    When the native Compose proof is run with the repository Node fixture
    Then the proof uses offline csr/v2 identities and the public issued registry
    And the runtime MultiManager starts its managed Manager and aligned control route
    And the native Compose proof observes typed RPC output and removes all generated state and labelled resources

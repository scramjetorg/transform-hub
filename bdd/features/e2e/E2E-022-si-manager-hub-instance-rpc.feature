@manager-migration @slow @aggregation-repro-cleanup
Feature: Real si to Manager, Hub, and Node instance RPC
  The v1 Hub registration must be visible to v2 inventory and routing, while
  the real si CLI enters through the private v2 control ingress.

  Scenario: Real si POST reaches the cold Node instance route
    Given cold instance RPC observation is enabled for the aggregation stack
    And an isolated MultiManager aggregation stack
    And an STH hub "hub-rpc" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I configure the real si CLI for the aggregation Manager ingress
    Then the hub v1 registration is visible in v2 inventory and health
    And no RPC has arrived at the target instance
    When the real si CLI posts one unique instance RPC request
    Then the target instance records that unique RPC and the CLI receives its exact response

  Scenario: Seventeen concurrent RPCs pass the full selected-instance route
    Given cold instance RPC observation is enabled for the aggregation stack
    And an isolated MultiManager aggregation stack
    And an STH hub "hub-rpc" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I configure a real BDD Broker for the aggregation Manager ingress
    And the target instance holds RPC responses and the Broker sends 17 unique requests
    Then the target instance receives request 17 before held responses are released
    And all 17 RPC responses exactly match their request identities

@manager-migration @manager-aggregation-repro
Feature: MANAGER-002 Manager aggregation through MultiManager proxy
  # To run:
  #   BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"
  #
  # Regression coverage for 0rail/transform-hub#15. MultiManager-proxied
  # Manager endpoints must include inventory from connected hubs.

  @aggregation-repro-cleanup
  Scenario: MANAGER-002 TC-001 MultiManager-proxied Manager aggregation includes hub inventory
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And an STH hub "hub-2" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I query hub "hub-1" for its sequences
    Then the hub response should contain at least 1 sequence
    When I query the Manager "/list" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items
    When I query hub "hub-2" for its sequences
    Then the hub response should contain at least 1 sequence
    When I query the Manager "/all_sequences" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items
    When I query hub "hub-1" for its instances
    Then the hub response should contain at least 1 instance
    When I query the Manager "/instances" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items

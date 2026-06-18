@manager-migration @manager-aggregation-repro
Feature: MANAGER-002 Manager aggregation repro
  # To run:
  #   SCRAMJET_SPAWN_TS=1 SCRAMJET_TEST_LOG=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"
  #
  # Purpose: reproduces 0rail/transform-hub#15 where MultiManager-proxied
  # Manager endpoints /list, /all_sequences, /instances return 200 [] even
  # though connected STH hubs report sequences and instances when queried
  # directly. These tests are EXPECTED TO FAIL until the bug is fixed.
  #
  # Each scenario sets up a fresh MM+Manager+two-hubs stack then queries
  # the MM proxy. The @aggregation-repro-cleanup tag ensures teardown.

  Background:
    Given a MultiManager with name "agg-mm" and id "mm-agg"
    And a Manager with id "mgr-agg" is started on the MultiManager
    And an STH hub "hub-1" is connected to Manager "mgr-agg" with sequences-root "repro/manager-aggregation/sequences"
    And an STH hub "hub-2" is connected to Manager "mgr-agg" with sequences-root "repro/manager-aggregation/sequences"
    And I wait for hubs to register with the Manager

  @aggregation-repro-cleanup @aggregation-proxy-empty @expected-failure
  Scenario: MANAGER-002 TC-001 Manager /list through MM proxy includes connected hubs
    When I query hub "hub-1" for its sequences
    Then the hub response should contain at least 1 sequence
    When I query the Manager "/list" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items

  @aggregation-repro-cleanup @aggregation-proxy-empty @expected-failure
  Scenario: MANAGER-002 TC-002 Manager /all_sequences through MM proxy includes loaded hello sequences
    When I query hub "hub-2" for its sequences
    Then the hub response should contain at least 1 sequence
    When I query the Manager "/all_sequences" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items

  @aggregation-repro-cleanup @aggregation-proxy-empty @expected-failure
  Scenario: MANAGER-002 TC-003 Manager /instances through MM proxy includes startup instances
    When I query hub "hub-1" for its instances
    Then the hub response should contain at least 1 instance
    When I query the Manager "/instances" through the MultiManager proxy
    Then the Manager proxy response should contain at least 2 items

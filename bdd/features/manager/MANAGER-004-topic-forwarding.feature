@manager-migration @topic-forwarding @topic-forwarding-red
Feature: MANAGER-004 Topic forwarding through Manager space
  # To run:
  #   NO_HOST=true BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 BDD_TIMEOUT_MS=120000 npm --prefix bdd run test:bdd -- --format=@cucumber/pretty-formatter -t "@topic-forwarding-red"
  #
  # Regression coverage for topic actors created from Hub APIs and from routed
  # sequence input/output topics. Kept tagged with @topic-forwarding-red for
  # compatibility with the original issue #37 red reproduction command.

  @aggregation-repro-cleanup
  Scenario: MANAGER-004 TC-001 API getTopic and sendTopic forward across hubs through Manager space
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And an STH hub "hub-2" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When aggregation hub "hub-2" opens topic "manager-api-topic-red" with content-type "application/x-ndjson"
    And aggregation hub "hub-1" sends topic "manager-api-topic-red" data "{\"source\":\"api-sendTopic\"}\n" with content-type "application/x-ndjson"
    Then aggregation topic data should contain "api-sendTopic"

  @aggregation-repro-cleanup
  Scenario: MANAGER-004 TC-002 Routed sequence input and output topics forward across hubs through Manager space
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And an STH hub "hub-2" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When aggregation sequence "hello-2" on hub "hub-2" starts with input topic "manager-routed-input-red"
    And aggregation hub "hub-1" sends topic "manager-routed-input-red" data "routed-input" with content-type "text/plain"
    And aggregation sequence "hello-1" on hub "hub-1" starts with output topic "manager-routed-output-red"
    And aggregation topic "manager-routed-output-red" is opened on hub "hub-2" with content-type "text/plain"
    And aggregation instance receives input "routed-output"
    Then aggregation routed input should contain "Hello routed-input?" and routed output topic should contain "Hello routed-output?"

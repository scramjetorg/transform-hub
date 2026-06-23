@manager-migration @full-api-verser2-forwarding
Feature: MANAGER-003 Full API capability through Verser2 forwarding
  # To run:
  #   BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_JS=1 SCRAMJET_TEST_LOG=1 BDD_TIMEOUT_MS=180000 npm run test:bdd -- --format=@cucumber/pretty-formatter -t "@full-api-verser2-forwarding"
  #
  # Regression coverage for full API forwarding across Hub/STH, Manager,
  # MultiManager, and sequence RPC surfaces.

  Scenario: MANAGER-003 TC-000 Direct STH v1 and v2 RPC reach the local sequence with hop-by-hop headers stripped
    When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-named-required.json --runtime-adapter=process --verser2-runner-host-bind-port=2445 --verser2-runner-host-public-url=https://127.0.0.1:2445 --verser2-runner-host-identity-dir=/work-tmp/full-api-direct-runner-host"
    Then host is running
    And stable instance name "orders-rpc" becomes available
    And I use instance client for stable name "orders-rpc"
    And wait for instance healthy is "true"
    When I send a "POST" request to "/instance/orders-rpc/rpc/test/abc" with body "direct-v1" and headers "{\"Content-Type\":\"text/plain\",\"Connection\":\"keep-alive, X-Debug-Hop\",\"X-Debug-Hop\":\"remove-me\",\"Keep-Alive\":\"timeout=5\"}"
    Then the response status should be 200
    And the response body should be "POST /abc direct-v1"
    When I send a "POST" root API request to "/api/v2/instances/orders-rpc/rpc/test/abc" with body "direct-v2" and headers "{\"Content-Type\":\"text/plain\"}"
    Then the response status should be 200
    And the response body should be "POST /abc direct-v2"

  @aggregation-repro-cleanup
  Scenario: MANAGER-003 TC-001 Manager downward v1 RPC tunnels to a sequence with hop-by-hop headers stripped
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I send a "POST" request through the aggregation Manager proxy to "/sth/hub-1/rpc/test/abc" with body "manager-v1" and headers "{\"Content-Type\":\"text/plain\",\"Connection\":\"keep-alive, X-Debug-Hop\",\"X-Debug-Hop\":\"remove-me\",\"Keep-Alive\":\"timeout=5\"}"
    Then the response status should be 200
    And the response body should be "POST /abc manager-v1"

  @aggregation-repro-cleanup
  Scenario: MANAGER-003 TC-002 MultiManager downward v2 RPC tunnels to a sequence
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I send a "POST" request through the aggregation MultiManager root to "/api/v2/spaces/mgr-PLACEHOLDER/hubs/hub-1/instances/hub-1-api-main/rpc/test/abc" with body "multimanager-v2" and headers "{\"Content-Type\":\"text/plain\"}"
    Then the response status should be 200
    And the response body should be "POST /abc multimanager-v2"

  @aggregation-repro-cleanup
  Scenario: MANAGER-003 TC-003 External upward Manager access through Hub returns route metadata instead of tunneling
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When I send a "GET" request to aggregation hub "hub-1" at "/api/v1/cpm/list" with headers "{\"X-Scramjet-Sequence-Origin\":\"spoofed-client\"}"
    Then the response status should be 308

  @aggregation-repro-cleanup @sequence-to-sequence
  Scenario: MANAGER-003 TC-004 Sequence-to-sequence Manager routing across two Hubs reaches the target sequence
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And an STH hub "hub-2" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When source sequence "hub-1-api-main" calls target sequence "hub-2-api-main" through the aggregation Manager
    Then the response status should be 200
    And the response body should be "POST /abc sequence-to-sequence"

  @aggregation-repro-cleanup @sequence-to-sequence
  Scenario: MANAGER-003 TC-005 Same-Hub sequence-to-sequence routing shortens to the local Hub path
    Given an isolated MultiManager aggregation stack
    And an STH hub "hub-1" is connected to the aggregation Manager
    And I wait for hubs to register with the Manager
    When source sequence "hub-1-api-main" calls target sequence "hub-1-api-main" through the aggregation Manager
    Then the response status should be 200
    And the response body should be "POST /abc sequence-to-sequence"

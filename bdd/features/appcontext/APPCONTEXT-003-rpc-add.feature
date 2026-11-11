@ci-appcontext @starts-host
Feature: Hosted AppContext raw API RPC exposure
  Verify that a sequence can expose a real POST handler through the public instance RPC proxy.

  Background:
    When hub process is started with random ports and parameters "--runtime-adapter=process"
    Given host is running

  @ci-instance-python
  Scenario: APPCONTEXT-003 TC-001 Python exposes a POST RPC handler
    When find and upload sequence "python-bdd-appcontext-rpc-add.tar.gz"
    And instance started
    When I send POST JSON to instance RPC endpoint "/add"
    Then AppContext RPC response is exactly successful JSON
    And host is still running

  @ci-instance-node
  Scenario: APPCONTEXT-003 TC-002 Node exposes a POST RPC handler
    When I upload the AppContext RPC fixture for runtime "node"
    And instance started
    When I send POST JSON to instance RPC endpoint "/add"
    Then AppContext RPC response is exactly successful JSON
    And host is still running

  @ci-instance-node @requires-bun
  Scenario: APPCONTEXT-003 TC-003 Bun delegates its POST RPC handler through the host
    When I upload the AppContext RPC fixture for runtime "bun"
    And instance started
    When I send POST JSON to instance RPC endpoint "/add"
    Then AppContext RPC response is exactly successful JSON
    And host is still running

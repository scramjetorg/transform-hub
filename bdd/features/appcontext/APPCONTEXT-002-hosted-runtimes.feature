@ci-appcontext
Feature: Hosted runtime AppContext channels
  These scenarios use real Hub instance channels rather than wrapper fakes.

  Background:
    Given host is running

  @ci-instance-python
  Scenario: APPCONTEXT-002 TC-001 Hosted Python covers channels and routing
    When find and upload sequence "python-bdd-appcontext-hosted.tar.gz"
    And instance started
    And keep instance streams "log"
    Then "stdout" contains "hosted-python-appcontext"
    And "log" contains "hosted-python-appcontext-log"
    And instance health is "true"
    When I send GET request to instance endpoint "/python/health"
    Then response status is 200
    And response body contains "python"
    When send event "hosted-python-event" to instance with message "ping"
    Then instance emits event "hosted-python-response" with body
      """
      {"body":"ping"}
      """
    And host is still running

  @ci-instance-node @requires-bun
  Scenario: APPCONTEXT-002 TC-002 Hosted Bun delegates through host channels
    When find and upload sequence "bun-bdd-appcontext-hosted.tar.gz"
    And instance started
    And keep instance streams "log"
    Then "stdout" contains "hosted-bun-appcontext"
    And "log" contains "hosted-bun-appcontext-log"
    And instance health is "true"
    When I send GET request to instance endpoint "/bun/health"
    Then response status is 200
    And response body contains "bun"
    When send event "hosted-bun-event" to instance with message "ping"
    Then instance emits event "hosted-bun-response" with body
      """
      {"body":"ping"}
      """
    And host is still running

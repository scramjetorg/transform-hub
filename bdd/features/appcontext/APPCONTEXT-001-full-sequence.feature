@ci-appcontext
Feature: Full Sequence AppContext Behavior
  As a sequence author
  I want to use the full AppContext API (config, lifecycle, events,
  localStorage, exposed API, legacy clients, and v2 clients)
  So that my sequences can interact with the host and space

  Background:
    Given host is running

  @ci-appcontext-config
  Scenario: APPCONTEXT-001 TC-001 Sequence reads config and instanceId from AppContext
    When find and upload sequence "appcontext-config.tar.gz"
    And instance started
    And wait for "2000" ms
    Then "stdout" contains "appcontext-config"
    And host is still running

  @ci-appcontext-lifecycle
  Scenario: APPCONTEXT-001 TC-002 Sequence calls keepAlive and end through AppContext
    When find and upload sequence "appcontext-lifecycle.tar.gz"
    And instance started
    And wait for "1000" ms
    Then "stdout" contains "appcontext-lifecycle"
    And host is still running

  @ci-appcontext-events
  Scenario: APPCONTEXT-001 TC-003 Sequence emits and receives events through AppContext
    When find and upload sequence "appcontext-events.tar.gz"
    And instance started
    Then "stdout" contains "appcontext-events"
    And send event "test.event" to instance with message "ping"
    Then instance emits event "appcontext.response" with body
      """
      {"body":"pong"}
      """
    And host is still running

  @ci-appcontext-storage
  Scenario: APPCONTEXT-001 TC-004 Sequence uses localStorage through AppContext
    When find and upload sequence "appcontext-storage.tar.gz"
    And instance started
    And wait for "2000" ms
    Then "stdout" contains "appcontext-storage"
    And host is still running

  @ci-appcontext-exposed-api
  Scenario: APPCONTEXT-001 TC-005 Sequence exposes an API endpoint through AppContext
    When find and upload sequence "appcontext-exposed-api.tar.gz"
    And instance started
    Then "stdout" contains "appcontext-exposed-api"
    When I send GET request to instance endpoint "/health"
    Then response status is 200
    And response body contains "ok"
    And host is still running

  @ci-appcontext-legacy-clients
  Scenario: APPCONTEXT-001 TC-006 Sequence uses legacy hub and space clients through AppContext
    When find and upload sequence "appcontext-legacy-clients.tar.gz"
    And instance started
    And wait for "3000" ms
    Then "stdout" contains "appcontext-legacy-clients"
    And host is still running

  @ci-appcontext-v2-clients
  Scenario: APPCONTEXT-001 TC-007 Sequence uses v2 hubClient and spaceClient through AppContext
    When find and upload sequence "appcontext-v2-clients.tar.gz"
    And instance started
    And wait for "5000" ms
    Then "stdout" contains "appcontext-v2-clients"
    And host is still running

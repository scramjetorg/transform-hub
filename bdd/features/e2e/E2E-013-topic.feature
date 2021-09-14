Feature: E2E test, where we send and receive data from /topic/:name endpoint by using api-client

@ci
Scenario: E2E-013 TC-001 Send data from STH and get data from STH
    Given host is running
    Then send data "{ \"city\": \"New York\" }" named "names"
    And get data named "names"
    # And confirm data "{\"aga\": 1}" received

@ci
Scenario: E2E-013 TC-002 Send data from one istance to another instance on the same STH
    Given host is running
    When sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
    And instance started
    And wait for "5000" ms
    Then send data named "names"
    And get data named "names"
    And confirm data received and complete

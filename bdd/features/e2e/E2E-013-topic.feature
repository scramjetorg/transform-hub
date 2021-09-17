Feature: E2E test, where we send and receive data from /topic/:name endpoint by using api-client

@ci
Scenario: E2E-013 TC-001 Send and get data from API STH
    Given host is running
    Then send data "{ \"city\": \"New York\" }" named "cities"
    And wait for "5000" ms
    And get data named "cities"


@ci
Scenario: E2E-013 TC-002 Send data via API, get this data in the instance
    Given host is running
    And sequence "../packages/reference-apps/endless-names-output.tar.gz" loaded
    And instance started
    And get data named "names"

@ci
Scenario: E2E-013 TC-003 Send data via instance, get this data via API
    Given host is running
    Then send data "{ \"avengers\": \"Hulk\" }" named "avengers"
    And sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
    And instance started
    And get output
    And wait for "10000" ms


Scenario: E2E-013 TC-004 Send data from instance to another instance on the same host
    Given host is running
    And sequences "../packages/reference-apps/hello-input-out.tar.gz" "../packages/reference-apps/endless-names-output.tar.gz" are loaded
    And instances started
    And get output from instance2



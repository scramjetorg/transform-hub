Feature: E2E test, where we send and receive data from /topic/:name endpoint by using api-client

@ci
Scenario: E2E-013 TC-001 Send and get data from API STH
    Given host is running
    Then send data "{ \"city\": \"New York\" }\n" named "cities"
    And get data named "cities"
    Then confirm data defined as "nyc-city" received

Scenario: E2E-013 TC-002 Send data via instance, get this data via API
    Given host is running
    And sequence "../packages/reference-apps/endless-names-output.tar.gz" loaded
    And instance started with arguments "10"
    And get data named "names"
    Then confirm data defined as "hello-input-out-10" received

Scenario: E2E-013 TC-003 Send data via API, get this data from the instance
    Given host is running
    And sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
    And instance started
    Then send data "{ \"name\": \"Hulk\" }" named "names"
    And wait for "1000" ms
    And get output
    Then confirm data defined as "hulkName" received

Scenario: E2E-013 TC-004 Send data from instance to another instance on the same host
    Given host is running
    And sequences "../packages/reference-apps/hello-input-out.tar.gz" "../packages/reference-apps/avengers-names-output.tar.gz" are loaded
    And instances started
    And get output from instance1
    #And wait for "10000" ms
    # Then confirm data "" recived



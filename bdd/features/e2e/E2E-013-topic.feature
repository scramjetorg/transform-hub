Feature: E2E topic tests

The tests check topic functionalities, where we send and receive data from /topic/:name endpoint by using api-client

    @ci-api
    Scenario Outline: E2E-013 TC-000 Topic content-type <content type> compatibility
        Given host is running
        Then send data "{ \"city\": \"New York\" }" named <topic name> and content-type <content type>
        Then get data named <topic name> and content-type <content type>
        Then confirm data defined as "nyc-city-nl" will be received
        And host is still running

    Examples:
        | topic name |        content type        |
        |  "city1"   | "text/x-ndjson"            |
        |  "city2"   | "text/plain"               |
        |  "city3"   | "application/octet-stream" |
        |  "city4"   | "application/x-ndjson"     |
    @ci-api
    Scenario: E2E-013 TC-001 API to API
        Given host is running
        Then send json data "{ \"city\": \"New York\" }" named "city"
        And get data named "city" without waiting for the end
        Then confirm data defined as "nyc-city-nl" will be received
        And host is still running

    @ci-api @slow
    Scenario: E2E-013 TC-002 Instance to API
        Given host is running
        And sequence "data/sequences/bdd-packages/endless-names-output.tar.gz" loaded
        And start Instance with output topic name "ranger"
        And wait for "3000" ms
        And get data named "ranger" without waiting for the end
        Then confirm data defined as "endless-names-10" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-005 Send data from file to STH SD API and get it from STH SD API
        Given host is running
        Then send data from file "data/avengers.json" named "marvel"
        And get data named "marvel" without waiting for the end
        And host is still running

    @ci-api @slow
    Scenario: E2E-013 TC-008 Send data json data from Sequence, get it via API
        Given host is running
        And sequence "data/sequences/bdd-packages/avengers-names-output.tar.gz" loaded
        And instance started
        And get data named "avengers" without waiting for the end
        Then confirm data defined as "hulk-nl" will be received
        And host is still running

    @ci_api
    Scenario: E2E-013 TC-009 Create and delete topic
        Given host is running
        And topic "RegularTopic" is created
        Then confirm topics contain "RegularTopic"
        Then remove topic "RegularTopic"
        Then confirm topic "RegularTopic" is removed

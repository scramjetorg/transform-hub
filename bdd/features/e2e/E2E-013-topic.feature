Feature: E2E topic tests

The tests check topic functionalities, where we send and receive data from /topic/:name endpoint by using api-client

    @ci-api
    Scenario: E2E-013 TC-001 API to API
        Given host is running
        Then send json data "{ \"city\": \"New York\" }" named "city"
        And get data named "city" without waiting for the end
        Then confirm data defined as "nyc-city-nl" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-002 Instance to API
        Given host is running
        And sequence "../packages/endless-names-output.tar.gz" loaded
        And start Instance with output topic name "ranger"
        And wait for "3000" ms
        And get data named "ranger" without waiting for the end
        Then confirm data defined as "endless-names-10" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-003 API to Instance
        Given host is running
        Then send json data "{ \"name\": \"Hulk\" }" named "avngr"
        And sequence "../packages/hello-input-out.tar.gz" loaded
        And start Instance with input topic name "avngr"
        And get output without waiting for the end
        Then confirm data defined as "hulkName" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-004 Instance to Instance
        Given host is running
        And sequence "../packages/endless-names-output.tar.gz" loaded
        * start Instance with output topic name "powerRengers2"
        And sequence "../packages/hello-input-out.tar.gz" loaded
        * start Instance with input topic name "powerRengers2"
        And get output without waiting for the end
        Then confirm data defined as "hello-input-out-10" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-005 Send data from file to STH SD API and get it from STH SD API
        Given host is running
        Then send data from file "../dist/avengers-names-output/avengers.json" named "marvel"
        And get data named "marvel" without waiting for the end
        And host is still running

    # TODO: disabled, test has a race condition, we should wait until data is received
    # Scenario: E2E-013 TC-007 Send data from multiple Instances to another Instance on the same host
    #     Given host is running
    #     And sequence "../packages/endless-names-output.tar.gz" loaded
    #     * start Instance with args "5" and output topic name "5names"
    #     And wait for "4000" ms
    #     And instance is finished
    #     Then send data from file "../dist/avengers-names-output/avengers.json" named "5names"
    #     * start Instance with args "5" and output topic name "5names"
    #     And wait for "4000" ms
    #     And instance is finished
    #     And sequence "../packages/hello-input-out.tar.gz" loaded
    #     * start Instance with input topic name "5names"
    #     And wait for "4000" ms
    #     And get output without waiting for the end
    #     Then confirm data defined as "multiple-names-sources" will be received
    #     And host is still running

    @ci-api
    Scenario: E2E-013 TC-007 Send and read data two times
        Given host is running
        And sequence "../packages/endless-names-output.tar.gz" loaded
        * start Instance with args "5" and output topic name "powerRengers"
        And sequence "../packages/hello-input-out.tar.gz" loaded
        * start Instance with args "5" and input topic name "powerRengers"
        And get output without waiting for the end
        Then confirm data defined as "hello-input-out-5" will be received
        When send kill message to instance
        And wait for "1000" ms
        And instance is finished
        And sequence "../packages/endless-names-output.tar.gz" loaded
        * start Instance with output topic name "powerRengersVol2"
        # We want to verify that nothing else is reading the topic
        And wait for "2000" ms
        And sequence "../packages/hello-input-out.tar.gz" loaded
        * start Instance with input topic name "powerRengersVol2"
        And get output without waiting for the end
        Then confirm data defined as "hello-input-out-10" will be received
        And host is still running

    @ci-api
    Scenario: E2E-013 TC-008 Send data json data from Sequence, get it via API
        Given host is running
        And sequence "../packages/avengers-names-output.tar.gz" loaded
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


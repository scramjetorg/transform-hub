Feature: E2E test, where we send and receive data from /topic/:name endpoint by using api-client

    @ci @starts-host
    Scenario: E2E-013 TC-001 Send and get data from API STH
        When start host
        Then send data "{ \"city\": \"New York\" }" named "cities"
        And get data named "cities" without waiting for the end
        Then confirm data defined as "nyc-city" will be received
        * stop host

    @ci @starts-host
    Scenario: E2E-013 TC-003 Send data via API, get this data from the instance
        When start host
        And sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
        And instance started
        Then send data "{ \"name\": \"Hulk\" }" named "names"
        And wait for "1000" ms
        And get output without waiting for the end
        Then confirm data defined as "hulkName" will be received
        * stop host

    @ci @starts-host
    Scenario: E2E-013 TC-002 Send data via instance, get this data via API
        When start host
        And sequence "../packages/reference-apps/endless-names-output.tar.gz" loaded
        And instance started with arguments "10"
        And get data named "names" without waiting for the end
        Then confirm data defined as "endless-names-10" will be received
        * stop host

    @ci @starts-host
    Scenario: E2E-013 TC-004 Send data from instance to another instance on the same host
        When start host
        And sequence "../packages/reference-apps/endless-names-output.tar.gz" loaded
        And instance started with arguments "10"
        And sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
        And instance started
        And get output without waiting for the end
        Then confirm data defined as "hello-input-out-10" will be received
        * stop host

    @ci @starts-host
    Scenario: E2E-013 TC-005 Send data from file to STH SD API and get it from STH SD API
        When start host
        Then send data from file "../dist/reference-apps/avengers-names-output/avengers.json" named "marvel"
        And get data named "marvel" without waiting for the end
        * stop host

    @ci @starts-host
    Scenario: E2E-013 TC-006 Send data from multiple instances to another instance on the same host
        When start host
        And sequence "../packages/reference-apps/endless-names-output.tar.gz" loaded
        And instance started with arguments "5"
        And wait for "4000" ms
        And instance is finished
        Then send data from file "../dist/reference-apps/avengers-names-output/avengers.json" named "names"
        And instance started with arguments "5"
        And wait for "4000" ms
        And instance is finished
        And sequence "../packages/reference-apps/hello-input-out.tar.gz" loaded
        And instance started
        And get output without waiting for the end
        Then confirm data defined as "multiple-names-sources" will be received
        * stop host

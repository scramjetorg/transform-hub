Feature: CLI tests

This feature checks topic functionalities over CLI

    @ci-topic @cli
    Scenario: E2E-011 TC-001 API to API
        Given I set config for local Hub
        When I execute CLI with "topic send cities features/e2e/cities.json"
        Then I execute CLI with "topic get cities" without waiting for the end
        Then I confirm data named "nyc-city-nl" will be received

    @ci-topic @cli
    Scenario: E2E-011 TC-002 Instance to API
        When I execute CLI with "seq send ../packages/endless-names-output.tar.gz"
        When I execute CLI with "seq start - --output-topic names13"
        Then I execute CLI with "topic get names13" without waiting for the end
        Then I confirm data named "endless-names-10" will be received

    @ci-topic @cli
    Scenario: E2E-011 TC-003 API to Instance
        When I execute CLI with "topic send names14 features/e2e/data.json"
        When I execute CLI with "seq send ../packages/hello-input-out.tar.gz"
        When I execute CLI with "seq start - --input-topic names14 "
        And wait for "10000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-avengers" will be received

    # TODO: need to test this via separate two sequences
    @ci-topic @cli
    Scenario: E2E-011 TC-004 Instance to Instance
        When I execute CLI with "seq send ../packages/endless-names-output.tar.gz"
        When I execute CLI with "seq start - --output-topic names15"
        And wait for "6000" ms
        When I execute CLI with "seq send ../packages/hello-input-out.tar.gz"
        When I execute CLI with "seq start - --input-topic names15"
        And wait for "4000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-input-out-10" will be received

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
        # When I execute CLI with "seq start - --output-topic names13"
        When I execute CLI with "seq start -"
        Then I execute CLI with "topic get names" without waiting for the end
        Then I confirm data named "endless-names-10" will be received

    @ci-topic @cli
    Scenario: E2E-011 TC-003 API to Instance
        When I execute CLI with "topic send avengers features/e2e/data.json"
        When I execute CLI with "seq send ../packages/hello-input-out.tar.gz"
        When I execute CLI with "seq start - --input-topic avengers "
        And wait for "10000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-avengers" will be received

    # TODO: need to test this via separate two sequences
    @ci-topic @cli
    Scenario: E2E-011 TC-004 Instance to Instance
        When I execute CLI with "seq send ../packages/endless-names-output.tar.gz"
        When I execute CLI with "seq start -"
        And wait for "6000" ms
        When I execute CLI with "seq send ../packages/hello-input-out.tar.gz"
        When I execute CLI with "seq start -"
        And wait for "4000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-input-out-10" will be received

    @ci-topic @cli
    Scenario: E2E-013 TC-009 Completeness of data transmission
        Given host is running
        Then send json data "Bonnie" named "pets"
        Then send json data "Rosa" named "pets"
        Then send json data "Fahume" named "pets"
        Then I execute CLI with "topic get pets" without waiting for the end
        Then I confirm data named "pets" will be received
        And wait for "1000" ms
        Then send json data "Yogi" named "pets"
        Then send json data "Molly" named "pets"
        Then send json data "Sisi" named "pets"
        Then I execute CLI with "topic get pets" without waiting for the end
        Then I confirm data named "pets2" will be received
        And host is still running

Feature: CLI tests

This feature checks topic functionalities over CLI

    @ci-topic @cli
    Scenario: E2E-011 TC-001 API to API
        Given I set config for local Hub
        When I execute CLI with "topic send cities data/cities.json" without waiting for the end
        Then I execute CLI with "topic get cities" without waiting for the end
        Then I confirm data named "nyc-city-nl" will be received

    @ci-topic @cli
    Scenario: E2E-011 TC-002 Instance to API
        When I execute CLI with "seq send data/sequences/bdd-packages/endless-names-output.tar.gz"
        When I execute CLI with "seq start -"
        Then I execute CLI with "topic get names" without waiting for the end
        Then I confirm data named "endless-names-10" will be received
        And kill process "topic get"

    @ci-topic @cli
    Scenario: E2E-011 TC-005 Complete data delivery when topic initiated by "topic send"
        Given host is running
        Then send json data "Bonnie" named "pets"
        Then send json data "Rosa" named "pets"
        Then send json data "Fahume" named "pets"
        Then I execute CLI with "topic get pets" and collect data
        Then I confirm collected topic data named "pets" will be received
        Then send json data "Yogi" named "pets"
        Then send json data "Molly" named "pets"
        Then send json data "Sisi" named "pets"
        Then I confirm collected topic data named "pets2" will be received
        And host is still running
        And kill process "topic get"

    @ci-topic @cli @slow
    Scenario: E2E-011 TC-006 Complete data delivery when topic initiated by "topic get"
        Given host is running
        Then I execute CLI with "topic get pets" and collect data
        Then send json data "Bonnie" named "pets"
        Then send json data "Rosa" named "pets"
        Then send json data "Fahume" named "pets"
        Then I confirm collected topic data named "pets" will be received
        Then send json data "Yogi" named "pets"
        Then send json data "Molly" named "pets"
        Then send json data "Sisi" named "pets"
        Then I confirm collected topic data named "pets2" will be received
        And host is still running

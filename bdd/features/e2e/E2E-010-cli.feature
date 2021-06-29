Feature: CLI tests

    @ci
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        When I execute CLI with "help" arguments
        Then I get a help information
        And the exit status is 0
        And host is still running

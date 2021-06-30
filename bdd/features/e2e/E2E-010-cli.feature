Feature: CLI tests

    @ci
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        And CLI is installed
        When I execute CLI with "help" arguments
        Then I get a help information
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-002 Pack sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-003 Send package
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz" arguments
        Then I get Sequence id and URL
        And the exit status is 0
        And host is still running



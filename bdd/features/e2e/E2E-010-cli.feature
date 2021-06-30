Feature: CLI tests

    @ignore
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        And CLI is installed
        When I execute CLI with "help" arguments
        Then I get a help information
        And the exit status is 0
        And host is still running

    @ignore
    Scenario: E2E-010 TC-002 Shows Host load information
        Given host is running
        And CLI is installed
        When I execute CLI with "host load" arguments
        Then I get Host load information
        And the exit status is 0
        And host is still running

    @ignore
    Scenario: E2E-010 TC-003 Pack sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And the exit status is 0
        And host is still running

    @ignore
    Scenario: E2E-010 TC-004 Send package
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz" arguments
        Then I get Sequence id and URL
        And the exit status is 0
        And host is still running

    @ignore
    Scenario: E2E-010 TC-005 List sequences
        Given host is running
        And CLI is installed
        When I execute CLI with "seq ls" arguments
        Then I get array of information about sequences
        And the exit status is 0
        And host is still running

    @ignore
    Scenario: E2E-010 TC-006 Start sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz" arguments
        Then I get Sequence id and URL
#        And I execute CLI with "seq start" arguments
        And the exit status is 0
        And host is still running


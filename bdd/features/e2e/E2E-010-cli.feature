Feature: CLI tests

    @si
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        And CLI is installed
        When I execute CLI with "help" arguments
        Then I get a help information
        And the exit status is 0
        And host is still running

    @si
    Scenario: E2E-010 TC-002 Shows Host load information
        Given host is running
        And CLI is installed
        When I execute CLI with "host load" arguments
        Then I get Host load information
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-003 Pack sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-004 Send package
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-005 List sequences
        Given host is running
        And CLI is installed
        When I execute CLI with "seq ls --format json" arguments
        Then I get array of information about sequences
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-006 Start sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-007 Kill instance
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        Then I kill instance
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-008 Delete sequence
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        Then I delete sequence
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-009 Get health from instance
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        And wait for "6000" ms
        Then I get instance health
        And the exit status is 0
        And host is still running

    # Test E2E-010 TC-010 works but it is ignored, because changes need to be made in CLI to end the displayed stream.
    @ignore
    Scenario: E2E-010 TC-010 Get log from instance
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        Then I get instance log
        And the exit status is 0
        And host is still running


    @ci
    Scenario: E2E-010 TC-011 Send input data to Instance
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        Then I send input data "../dist/reference-apps/checksum-sequence/data.json"
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-012 Stop instance
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance id
        Then I stop instance "3000" "false"
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-013 List instances
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-2.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get list of instances
        And the exit status is 0
        And host is still running

    @ci
    Scenario: E2E-010 TC-014 Get instance info
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/samples/hello-alice-out.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        Then I get instance info
        And the exit status is 0
        And host is still running

# Test E2E-010 TC-015 temporary ignored due to issues with running event-sequence - to be examined shortly.
    @ignore
    Scenario: E2E-010 TC-015 Send event
        Given host is running
        And CLI is installed
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence.tar.gz --format json" arguments
        And the exit status is 0
        Then I get Sequence id
        And I start Sequence
        When I send an event named "test-event" with event message "test message" to Instance
        And the exit status is 0
        And host is still running

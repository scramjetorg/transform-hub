Feature: CLI tests

    @ci @cli
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        When I execute CLI with "help" arguments
        Then I get a help information
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-002 Shows Host load information
        Given host is running
        When I execute CLI with "host load" arguments
        Then I get Host load information
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-003 Pack sequence
        Given host is running
        When I execute CLI with "pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-004 Send package
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-005 List sequences
        Given host is running
        When I execute CLI with "seq ls --format json" arguments
        Then I get array of information about sequences
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-006 Start sequence
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-007 Kill instance
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        Then I kill instance
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-008 Delete sequence
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I delete sequence
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-009 Get health from instance
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        Then I get instance health
        And host is still running

    # Test E2E-010 TC-010 works but it is ignored, because changes need to be made in CLI to end the displayed stream.
    @ignore
    Scenario: E2E-010 TC-010 Get log from instance
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        Then I get instance log
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-011 Send input data to Instance
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        Then I send input data "../dist/reference-apps/checksum-sequence/data.json"
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-012 Stop instance
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get instance id
        Then I stop instance "3000" "false"
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-013 List instances
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-2.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get list of instances
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-014 Get instance info
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get instance info
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-015 Send event
        Given host is running
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-v2.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get instance info
        Then I send an event named "test-event" with event message "test message" to Instance
        Then I get event "test-event-response" with event message "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}" from instance
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-016 Package and send with stdout
        Given host is running
        When I execute CLI with bash command "$SI pack ../dist/reference-apps/transform-function -c | $SI seq send --format json"
        Then I get Sequence id
        Then I start Sequence
        Then I get list of instances
        Then I stop instance "10" "false"
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-017
        Given host is running
        When I execute CLI with bash command "$SI seq send ../packages/reference-apps/inert-function.tar.gz --format json"
        Then I get Sequence id
        Then I start Sequence
        Then I get instance health
        Then wait for "20000" ms
        Then health outputs 404
        And host is still running

    @ci @cli @starts-host
    Scenario: E2E-010 TC-018 API to API
        Given start host
        When I execute CLI with "topic send cities features/e2e/cities.json --end" arguments
        Then I execute CLI with "topic get cities" arguments
        Then confirm data named "nyc-city-nl" received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-019 instance to API
        Given start host
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get instance health
        Then I execute CLI with "topic get names" arguments
        Then confirm data named "endless-names-10" received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-020 API to instance
        Given start host
        When I execute CLI with "topic send names features/e2e/data.json --end" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz --format json" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get instance health
        Then I get instance id
        And I get instance output
        Then confirm data named "hello-avengers" received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-021 instance to instance
        Given start host
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz --format json" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz --format json" arguments
        And I get list of sequences
        Then I get id from both sequences
        Then I start the first sequence
        And wait for "6000" ms
        Then I start the second sequence
        And wait for "4000" ms
        And I get the second instance output
        Then confirm data named "hello-input-out-10" received
        * stop host

    @ci @cli
    Scenario: E2E-010 TC-022 Check minus set/remove
        Given I execute CLI with "seq select abc" arguments
        And I execute CLI with "inst select def" arguments
        Then I get the last sequence id from config
        And I get the last instance id from config
        And The sequence id equals "abc"
        And The instance id equals "def"

    @ci @cli
    Scenario: E2E-010 TC-023 Check minus replacements with a sequence
        Given host is running
        When I execute CLI with "pack ../dist/reference-apps/checksum-sequence" arguments
        And I execute CLI with "seq send -" arguments
        And I execute CLI with "seq start -" arguments
        Then I get the last sequence id from config
        Then I get the last instance id from config
        And I get instance info
        And I execute CLI with "inst kill -" arguments
        And wait for "8000" ms
        And I execute CLI with "seq rm -" arguments
        And host is still running

Feature: CLI tests

This feature checks CLI functionalities

    @ci @cli
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "--help" arguments
        Then I get a help information
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-002 Shows Host load information
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "hub load" arguments
        Then I get Hub load information
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-003 Pack sequence
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-004 Send package
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "config print" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-005 List Sequences
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq ls" arguments
        Then I get array of information about sequences
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-006 Start Sequence with format json set in config
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        When I execute CLI with "inst info -" arguments
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-007 Kill Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I kill Instance
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-008 Delete Sequence
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I delete Sequence
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-009 Get health from Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I get Instance health
        And host is still running

    # Test E2E-010 TC-010 works but it is ignored, because changes need to be made in CLI to end the displayed stream.
    @ignore
    Scenario: E2E-010 TC-010 Get log from Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I get Instance log
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-011 Send input data to Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I send input data "../dist/reference-apps/checksum-sequence/data.json"
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-012 Stop Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I stop Instance "3000" "false"
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-013 List Instances
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-2.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get list of Instances
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-014 Get Instance info
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance info
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-015 Send event
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-v2.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance info
        Then I send an event named "test-event" with event message "test message" to Instance
        Then I get event "test-event-response" with event message "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}" from instance
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-016 Stop Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get list of Instances
        And I execute CLI with "inst stop - 10 false" arguments
        And host is still running

    @ci @cli
    Scenario: E2E-010 TC-017 Get 404 on health endpoint for finished instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance health
        Then I wait for Instance health status to change from 200 to 404
        And host is still running

    @ci @cli @starts-host
    Scenario: E2E-010 TC-018 API to API
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send cities features/e2e/cities.json" arguments
        Then I execute CLI with "topic get cities" arguments without waiting for the end
        Then confirm data named "nyc-city-nl" will be received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-019 Instance to API
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance health
        Then I execute CLI with "topic get names" arguments without waiting for the end
        Then confirm data named "endless-names-10" will be received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-020 API to Instance
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send names features/e2e/data.json" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance health
        Then I get Instance id
        And wait for "10000" ms
        And I get Instance output without waiting for the end
        Then confirm data named "hello-avengers" will be received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-021 Instance to Instance
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        And I get list of Sequences
        Then I get id from both sequences
        Then I start the first sequence
        And wait for "6000" ms
        Then I start the second sequence
        And wait for "4000" ms
        And I get the second instance output without waiting for the end
        Then confirm data named "hello-input-out-10" will be received
        * stop host

    # This tests writes and uses shared config file so it may fail if run in parallel
    # @ci @cli @no-parallel
    # This test needs to be refactored, last sequence and last instance is not superted in config any more
    Scenario: E2E-010 TC-022 Check minus set/remove
        Given I execute CLI with "seq use abc" arguments
        # Given I execute CLI with "seq use abc" arguments
        And I execute CLI with "inst use def" arguments
        Then I get the last sequence id from config
        And I get the last instance id from config
        And The sequence id equals "abc"
        And The instance id equals "def"

    # This tests writes and uses shared config file so it may fail if run in parallel
    @ci @cli @no-parallel
    Scenario: E2E-010 TC-023 Check minus replacements with a Sequence
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq pack ../dist/reference-apps/checksum-sequence" arguments
        And I execute CLI with "seq send -" arguments
        And I execute CLI with "seq start -" arguments
        And I execute CLI with "inst info -" arguments
        And I execute CLI with "inst kill -" arguments
        And wait for instance healthy is "false"
        # Give instance some time to close correctly
        And wait for "1000" ms
        And I execute CLI with "seq rm -" arguments
        And host is still running

    @ci @cli @starts-host
    Scenario: E2E-010 TC-024 Rename topic output
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--output-topic names2"
        Then I get Instance health
        Then I execute CLI with "topic get names2" arguments without waiting for the end
        Then confirm data named "endless-names-10" will be received
        * stop host

    @ci @cli @starts-host
    Scenario: E2E-010 TC-025 Rename topic input
        Given start host
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send names3 features/e2e/data.json" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--input-topic names3"
        Then I get Instance health
        Then I get Instance id
        And I get Instance output without waiting for the end
        Then confirm data named "hello-avengers" will be received
        * stop host

    # @ci @cli @no-parallel
    Scenario: E2E-010 TC-026 Check log coloring
        When I execute CLI with bash command "cat ./data/sample-log.log.source | $SI util log-format"
        Then stdout contents are the same as in file "./data/sample-log.log.ansi"

    # @ci @cli @no-parallel
    Scenario: E2E-010 TC-027 Check log no-coloring
        When I execute CLI with bash command "cat ./data/sample-log.log.source | $SI util log-format --no-color"
        Then stdout contents are the same as in file "./data/sample-log.log.plain"

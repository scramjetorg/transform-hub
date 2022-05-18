Feature: CLI tests

This feature checks CLI functionalities

    @cli
    Scenario: E2E-010 TC-001 CLI displays help, version, hub load
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "--help" arguments
        Then I get a help information
        When I execute CLI with "--version" arguments
        Then I get a version
        When I execute CLI with "hub load" arguments
        Then I get Hub load information
        And host is still running

    @cli
    Scenario: E2E-010 TC-002 Pack Sequence
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz" arguments
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory
        And host is still running

    @cli
    Scenario: E2E-010 TC-003 Send, list and delete Sequence
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "config print" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        When I execute CLI with "seq ls" arguments
        Then I get array of information about Sequences
        Then I delete Sequence
        And host is still running

    @cli
    Scenario: E2E-010 TC-004 Get Instance info, health, kill Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        When I execute CLI with "inst info -" arguments
        Then I get Instance health
        Then I kill Instance
        And host is still running

    @cli
    Scenario: E2E-010 TC-005 Get 404 on health endpoint for finished Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance health
        Then I wait for Instance health status to change from 200 to 404
        And host is still running

    @cli
    Scenario: E2E-010 TC-006 Get log from Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        When I execute CLI with "inst log -" arguments without waiting for the end
        Then confirm instance logs received
        And host is still running

    @cli
    Scenario: E2E-010 TC-007 Send input data to Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I send input data from file "../dist/reference-apps/checksum-sequence/data.json"
        And host is still running

    @cli
    Scenario: E2E-010 TC-008 Send input data to Instance and close input stream
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I send input data from file "../dist/reference-apps/checksum-sequence/data.json" with options "--end"
        Then I get Instance output
        Then confirm data named "checksum" received
        And host is still running

    @cli
    Scenario: E2E-010 TC-009 List Instances and stop Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        And I get Instance id
        Then I get list of Instances
        Then I stop Instance "3000" "false"
        And host is still running

    @cli
    Scenario: E2E-010 TC-010 Send event
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/event-sequence-v2.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence
        Then I get Instance id
        Then I send an event named "test-event" with event message "test message" to Instance
        Then I get event "test-event-response" with event message "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}" from Instance
        And host is still running

    @cli
    Scenario: E2E-010 TC-011 Start Sequence with multiple JSON arguments
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/args-to-output.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--args [\"Hello\",123,{\"abc\":456},[\"789\"]]"
        Then I get Instance health
        Then I get Instance id
        And I get Instance output without waiting for the end
        Then confirm data named "args-on-output" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-012 Deploy Sequence with multiple JSON arguments
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq deploy ../dist/reference-apps/args-to-output --args [\"Hello\",123,{\"abc\":456},[\"789\"]]" arguments
        Then I get Instance id after deployment
        And I get Instance output without waiting for the end
        Then confirm data named "args-on-output" will be received
        And host is still running

    # This tests writes and uses shared config file so it may fail if run in parallel
    @cli @no-parallel
    Scenario: E2E-010 TC-013 Check minus replacements with a Sequence
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

    @cli
    Scenario: E2E-010 TC-014 API to API
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send cities features/e2e/cities.json" arguments
        Then I execute CLI with "topic get cities" arguments without waiting for the end
        Then confirm data named "nyc-city-nl" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-015 Instance to API
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        Then I get Sequence id
        When I start Sequence with options "--output-topic names5"
        Then I get Instance health
        Then I execute CLI with "topic get names5" arguments without waiting for the end
        Then confirm data named "endless-names-10" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-016 API to Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send names6 features/e2e/data.json" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--input-topic names6"
        Then I get Instance health
        Then I get Instance id
        And wait for "10000" ms
        And I get Instance output without waiting for the end
        Then confirm data named "hello-avengers" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-017 Instance to Instance
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq prune -f" arguments
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        And I get list of Sequences
        And there are some sequences
        Then I get id from both Sequences
        Then I start the first Sequence
        And wait for "6000" ms
        Then I start the second Sequence
        And wait for "4000" ms
        And I get the second Instance output without waiting for the end
        Then confirm data named "hello-input-out-10" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-018 Rename topic output
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--output-topic names2"
        Then I get Instance health
        Then I execute CLI with "topic get names2" arguments without waiting for the end
        Then confirm data named "endless-names-10" will be received
        And host is still running

    @cli
    Scenario: E2E-010 TC-019 Rename topic input
        Given host is running
        Then I set json format
        Then I use apiUrl in config
        When I execute CLI with "topic send names4 features/e2e/data.json" arguments
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--input-topic names4"
        Then I get Instance health
        Then I get Instance id
        And I get Instance output without waiting for the end
        Then confirm data named "hello-avengers" will be received
        And host is still running

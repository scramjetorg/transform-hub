Feature: CLI tests

This feature checks CLI functionalities

    @ci-api @cli
    Scenario: E2E-010 TC-001 Test 'si --help' and 'si --version' display
        Given I set config for local Hub
        When I execute CLI with "--help"
        When I execute CLI with "--version"

    @ci-api @cli
    Scenario: E2E-010 TC-002 Test 'si hub' options
        When I execute CLI with "hub --help"
        When I execute CLI with "hub load"
        When I execute CLI with "hub version"

    @ci-api @cli
    Scenario: E2E-010 TC-003 Test Sequence 'pack' option
        When I execute CLI with "seq pack ../packages/reference-apps/transform-function  -o ../packages/reference-apps/transform-function.tar.gz"
        Then I get location "../packages/reference-apps/transform-function.tar.gz" of compressed directory

    @ci-api @cli
    Scenario: E2E-010 TC-004 Test Sequence options
        When I execute CLI with "seq --help"
        When I execute CLI with "seq send ../packages/reference-apps/args-to-output.tar.gz"
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz"
        When I execute CLI with "seq send ../packages/reference-apps/hello-alice-out.tar.gz"
        When I execute CLI with "seq get -"
        When I execute CLI with "seq list"
        When I execute CLI with "seq delete -"
        When I execute CLI with "seq list"
        When I execute CLI with "seq prune"
        When I execute CLI with "seq list"

    @ci-api @cli
    Scenario: E2E-010 TC-005 Test Sequence 'prune --force' option
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz"
        When I execute CLI with "seq send ../packages/reference-apps/csv-transform.tar.gz"
        When I execute CLI with "seq list"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst list"
        When I execute CLI with "seq prune --force"
        Then I confirm "Instance" list is empty
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-006 Test Instance options
        When I execute CLI with "inst --help"
        When I execute CLI with "seq send ../packages/reference-apps/csv-transform.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst info -"
        When I execute CLI with "inst health -"
        When I execute CLI with "inst list"
        When I execute CLI with "inst kill -"
        And I wait for Instance to end
        Then I confirm "Instance" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-007 Test Instance 'log' option
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst log -" without waiting for the end
        Then I confirm instance logs received
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli @not-github
    Scenario: E2E-010 TC-008 Get 404 on health endpoint for finished Instance
        When I execute CLI with "seq send ../packages/reference-apps/inert-function.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst health -"
        And I wait for Instance to end
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    Scenario: E2E-010 TC-009 Test Instance 'input' option
        When I execute CLI with "seq deploy ../packages/reference-apps/checksum-sequence.tar.gz"
        When I execute CLI with "inst input - data/test-data/checksum.json"
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-010 Test Instance 'input --end' option and confirm output received
        When I execute CLI with "seq deploy ../packages/reference-apps/checksum-sequence.tar.gz"
        When I execute CLI with "inst input - data/test-data/checksum.json --end"
        When I execute CLI with "inst output -"
        Then I confirm data named "checksum" received
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-011 Test Instances 'stop' option
        When I execute CLI with "seq send ../packages/reference-apps/checksum-sequence.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst ls"
        When I execute CLI with "inst stop - 3000"
        And I wait for Instance to end
        Then I confirm "Instance" list is empty
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-012 Test Instance 'event' option
        When I execute CLI with "seq deploy ../packages/reference-apps/event-sequence-v2.tar.gz"
        When I execute CLI with "inst event emit - test-event test message"
        When I execute CLI with "inst event on - test-event-response"
        Then I get event "test-event-response" with event message "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}" from Instance
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-013 Test Sequence 'start' with multiple JSON arguments
        When I execute CLI with "seq send ../packages/reference-apps/args-to-output.tar.gz"
        When I execute CLI with "seq start - --args [\"Hello\",123,{\"abc\":456},[\"789\"]]"
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "args-on-output" will be received
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-014 Deploy Sequence with multiple JSON arguments
        When I execute CLI with "seq deploy data/sequences/deploy-app/dist --args [\"Hello\",123,{\"abc\":456},[\"789\"]]"
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "args-on-output" will be received
        When I execute CLI with "seq prune --force"
        Then I confirm "Sequence" list is empty

    # This tests writes and uses shared config file so it may fail if run in parallel
    @ci-api @cli @no-parallel
    Scenario: E2E-010 TC-015 Check minus replacements with a Sequence
        When I execute CLI with "seq pack data/sequences/simple-stdio -o data/simple-stdio.tar.gz"
        And I execute CLI with "seq send -"
        And I execute CLI with "seq start -"
        And I execute CLI with "inst info -"
        And I execute CLI with "inst kill -"
        And I wait for Instance to end
        And I execute CLI with "seq rm -"
        Then I confirm "Instance" list is empty
        Then I confirm "Sequence" list is empty

    @ci-api @cli
    Scenario: E2E-010 TC-016 API to API
        When I execute CLI with "topic send cities features/e2e/cities.json"
        Then I execute CLI with "topic get cities" without waiting for the end
        Then I confirm data named "nyc-city-nl" will be received

    @ci-api @cli
    Scenario: E2E-010 TC-017 Instance to API
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz"
        When I execute CLI with "seq start - --output-topic names13"
        Then I execute CLI with "topic get names13" without waiting for the end
        Then I confirm data named "endless-names-10" will be received
        Then I execute CLI with "inst kill -"

    @ci-api @cli
    Scenario: E2E-010 TC-018 API to Instance
        When I execute CLI with "topic send names14 features/e2e/data.json"
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz"
        When I execute CLI with "seq start - --input-topic names14 "
        And wait for "10000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-avengers" will be received
        Then I execute CLI with "inst kill -"

    # TODO: need to test this via separate two sequences
    @ci-api @cli @not-github
    Scenario: E2E-010 TC-019 Instance to Instance
        When I execute CLI with "seq send ../packages/reference-apps/endless-names-output.tar.gz"
        When I execute CLI with "seq start - --output-topic names15"
        And wait for "6000" ms
        When I execute CLI with "seq send ../packages/reference-apps/hello-input-out.tar.gz"
        When I execute CLI with "seq start - --input-topic names15"
        And wait for "4000" ms
        And I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "hello-input-out-10" will be received
        Then I execute CLI with "inst kill -"

    @ci-api @cli
    Scenario: E2E-010 TC-020 Get Hub logs
        When I execute CLI with "hub logs" without waiting for the end
        Then I confirm Hub logs received

Feature: CLI tests

    This feature checks CLI functionalities without topics

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
    Scenario: E2E-010 TC-004 Test Sequence options
        When I execute CLI with "seq --help"
        When I execute CLI with "seq send data/sequences/bdd-packages/args-to-output.tar.gz"
        When I execute CLI with "seq send data/sequences/bdd-packages/args-to-output.tar.gz"
        When I execute CLI with "seq send data/sequences/bdd-packages/hello-output.tar.gz"
        When I execute CLI with "seq info -"
        When I execute CLI with "seq list"
        When I execute CLI with "seq delete -"
        When I execute CLI with "seq list"
        When I execute CLI with "seq prune"
        When I execute CLI with "seq list"

    # This tests writes and uses shared config file so it may fail if run in parallel
    @ci-api @cli @no-parallel @slow
    Scenario: E2E-010 TC-005 Check minus replacements with a Sequence
        When I execute CLI with "seq pack data/sequences/simple-stdio -o __BDD_TMP_SIMPLE_STDIO__"
        And I execute CLI with "seq send -"
        And I execute CLI with "seq start -"
        And I execute CLI with "inst info -"
        And I execute CLI with "inst kill - --removeImmediately"
        Then I wait for "Instance" list to be empty
        And I execute CLI with "seq rm -"
        Then I wait for "Sequence" list to be empty

    @ci-api @cli @slow
    Scenario: E2E-010 TC-006 Test Sequence 'prune --force' option
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/checksum.tar.gz"
        When I execute CLI with "seq send data/sequences/bdd-packages/csv-transform.tar.gz"
        When I execute CLI with "seq list"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst list"
        When I execute CLI with "seq prune --force"
        Then I wait for "Instance" list to be empty
        Then I wait for "Sequence" list to be empty

    @ci-api @cli @slow
    Scenario: E2E-010 TC-007 Test Instance options
        When I execute CLI with "inst --help"
        When I execute CLI with "seq send data/sequences/bdd-packages/csv-transform.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst info -"
        When I execute CLI with "inst health -"
        When I execute CLI with "inst list"
        When I execute CLI with "inst kill - --removeImmediately"
        Then I wait for "Instance" list to be empty

    @ci-api @cli @slow
    Scenario: E2E-010 TC-008 Test Instances 'stop' option
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/can-keep-alive.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst ls"
        When I execute CLI with "inst stop - 3000"
        # The CLI step asserts exit code zero. The instance API does not expose
        # terminal completion or detachment for this CLI flow, and stopped
        # instances may remain listed until host cleanup.

    @ci-api @cli @slow
    Scenario: E2E-010 TC-010 Test Instance 'log' option
        When I execute CLI with "seq send data/sequences/bdd-packages/js-inert-function.tar.gz"
        When I execute CLI with "seq start -"
        When I execute CLI with "inst log -" without waiting for the end
        Then I confirm instance logs received

    @ci-api @cli @slow
    Scenario: E2E-010 TC-011 Test Instance 'input' option
        When I execute CLI with "seq deploy data/sequences/bdd-packages/checksum.tar.gz"
        When I execute CLI with "inst input - data/test-data/checksum.json"

    @ci-api @cli @slow
    Scenario: E2E-010 TC-012 Test Instance 'input --end' option and confirm output received
        Given I set config for local Hub
        When I execute CLI with "seq deploy data/sequences/bdd-packages/checksum.tar.gz"
        When I execute CLI with "inst output -" without waiting for the end
        When I execute CLI with "inst input - data/test-data/checksum.json --end"
        Then I confirm data named "checksum" will be received

    @ci-api @cli @slow
    Scenario: E2E-010 TC-013 Test Instance 'event' option with payload
        When I execute CLI with "seq deploy data/sequences/bdd-packages/event-sequence-v2.tar.gz"
        When I execute CLI with "inst event emit - test-event test message"
        When I execute CLI with "inst event on - test-event-response"
        Then I get event "test-event-response" with event message "\"message from sequence\"" from Instance

    @ci-api @cli
    Scenario: E2E-010 TC-013a Test Instance 'event' option without payload
        When I execute CLI with "seq deploy data/sequences/bdd-packages/event-sequence-v2.tar.gz"
        When I execute CLI with "inst event emit - test-event"
        When I execute CLI with "inst event on - test-event-response"
        Then I get event "test-event-response" with event message "\"message from sequence\"" from Instance

    @ci-api @cli
    Scenario: E2E-010 TC-014 Test Sequence 'start' with multiple JSON arguments
        When I execute CLI with "seq send data/sequences/bdd-packages/args-to-output.tar.gz"
        When I execute CLI with "seq start - --args [\"Hello\",123,{\"abc\":456},[\"789\"]]"
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "args-on-output" will be received

    @ci-api @cli
    Scenario: E2E-010 TC-015 Deploy uncompressed Sequence with multiple JSON arguments
        When I execute CLI with "seq deploy data/sequences/deploy-app/built --args [\"Hello\",123,{\"abc\":456},[\"789\"]]"
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data named "args-on-output" will be received

    @ci-api @cli
    Scenario: E2E-010 TC-016 Get Hub logs
        When I execute CLI with "hub logs" without waiting for the end
        Then I confirm Hub logs received


    ##
    #    If you change name of instanceId, keep remember it should consist of 36 chars!!!
    ##
    @ci-api @cli
    Scenario: E2E-010 TC-018 Test Set instance id
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/hello-output.tar.gz"
        When I execute CLI with "seq start - --inst-id <instanceId>"
        When I execute CLI with "inst ls"
        Then I confirm instance id is: <instanceId>
        Examples:
            | instanceId                           |
            | Supervisor-Instance-0000-11111111111 |

    @ci-api @cli @test-si-init @external-dependency
    Scenario: E2E-010 TC-019 Test Init template sequence
        When I execute CLI command si init <templateType>
        Then I confirm template <templateType> is created
        Examples:
            | templateType |
            | ts           |
            | js           |
            | py           |

    @ci-api @cli @slow
    Scenario: E2E-010 TC-020 Test Start sequence with startup-config
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/endless-names-output.tar.gz"
        And I execute CLI with "seq start - --config-file data/seq-startup-app-config.json --args [1000]"
        And I execute CLI with "inst info -"
        Then Instance info should contain provided parameters in "seq-startup-config.json"

Feature: Sample e2e tests

    @ci-instance-node
    Scenario: E2E-001 TC-002 Test stdio available after the sequence is completed
        Given host is running
        When I pack the simple-stdio archive
        Then the packed simple-stdio archive is valid
        And sequence "__BDD_TMP_SIMPLE_STDIO__" loaded
        And instance started with arguments "1"
        And instance is ready for stdin
        Then send "Hello Alice!" to stdin
        And get instance info
        Then "stdout" is ">>> Hello Alice!"
        And host is still running
        And release canonical smoke buffers

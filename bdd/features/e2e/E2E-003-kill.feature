Feature: Kill e2e tests

    @ci-instance-node
    Scenario: E2E-003 TC-003 API test - Kill instance when it's not responding
        Given host is running
        When sequence "../refapps/process-not-responding.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        And send kill message to instance
        And wait for "10000" ms
        And runner has ended execution
        Then host is still running

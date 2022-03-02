Feature: Monitoring e2e tests

    @runner-cleanup
    Scenario: E2E-005 TC-001 API test - Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host is running
        When sequence "../packages/reference-apps/unhealthy-sequence.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        And wait for instance healthy is "false"
        Then host is still running

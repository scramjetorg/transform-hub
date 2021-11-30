Feature: Monitoring e2e tests

    Scenario: E2E-005 TC-001 API test - Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host is running
        When sequence "../packages/reference-apps/unhealthy-sequence.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And wait for instance healthy is "true"
        And get runner PID
        And wait for instance healthy is "false"
        And runner has ended execution
        Then host is still running

    Scenario: E2E-005 TC-002 Get monitoring from sequence, should return default monitoring value: healthy true
        Given host is running
        When sequence "../packages/reference-apps/healthy-sequence.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And wait for instance healthy is "true"
        And get runner PID
        And runner has ended execution
        Then host is still running

Feature: Monitoring e2e tests

    Scenario: E2E-005 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host is running
        When sequence "../packages/reference-apps/unhealthy-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "4000" ms
        When get instance health
        And get containerId
        And instance health is "false"
        And container is closed
        Then host is still running

    Scenario: E2E-005 TC-002 Get monitoring from sequence, should return default monitoring value: healthy true
        Given host is running
        When sequence "../packages/reference-apps/healthy-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And container is closed
        Then host is still running

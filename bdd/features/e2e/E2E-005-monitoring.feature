Feature: Monitoring e2e tests

    Scenario: E2E-005 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/unhealthy-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "4000" ms
        When get instance health
        And get containerId
        And instance health is "false"
        And wait for "3000" ms
        And container is closed
        Then host stops

    Scenario: E2E-005 TC-002 Get monitoring from sequence, should return default monitoring value: healthy true
        Given host started
        When host process is working
        When sequence "../packages/reference-apps/healthy-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And wait for "3000" ms
        And container is closed
        Then host stops

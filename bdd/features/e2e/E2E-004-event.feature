Feature: Event e2e tests

    Scenario: E2E-004 TC-001 Send test-event through API and get event emitted by sequence
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/event-sequence.tar.gz" loaded
        And wait for "6000" ms
        And instance started with arguments "20"
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And send event "test-event" to instance with message "test message"
        And wait for "5000" ms
        Then get event from instance
        When wait for "3000" ms
        Then instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        When wait for "10000" ms
        And container is closed
        Then host stops

Feature: Event e2e tests

    @ci
    Scenario: E2E-004 TC-001 Send test-event through API and get event emitted by sequence
        Given host is running
        When sequence "../packages/reference-apps/event-sequence.tar.gz" loaded
        And instance started with arguments "10"
        And wait for "6000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And send event "test-event" to instance with message "test message"
        Then wait for event "test-event-response" from instance
        When wait for "1000" ms
        Then instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-004 TC-002 Send test-event in one function and emit this event in another function within one sequence
        Given host is running
        When sequence "../packages/reference-apps/event-sequence-2.tar.gz" loaded
        And instance started
        And wait for "6000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        Then get event "new-test-event" from instance
        Then instance response body is "{\"eventName\":\"new-test-event\",\"message\":\"event sent between functions in one sequence\"}"
        And container is closed
        Then host is still running

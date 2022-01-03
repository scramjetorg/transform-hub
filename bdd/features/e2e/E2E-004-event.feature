Feature: Event e2e tests

    @ci
    Scenario: E2E-004 TC-001 API test - Send test-event through API and get event emitted by sequence
        Given host is running
        When sequence "../packages/reference-apps/event-sequence-v2.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        And send event "test-event" to instance with message "test message"
        Then wait for event "test-event-response" from instance
        Then instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        And runner has ended execution
        Then host is still running

    @ci
    Scenario: E2E-004 TC-002 Send test-event in one function and emit this event in another function within one sequence
        Given host is running
        When sequence "../packages/reference-apps/event-sequence-2.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        Then get event "new-test-event" from instance
        Then instance response body is "{\"eventName\":\"new-test-event\",\"message\":\"event sent between functions in one sequence\"}"
        And runner has ended execution
        Then host is still running

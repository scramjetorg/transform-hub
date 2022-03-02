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

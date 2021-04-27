Feature: Event e2e tests

    Scenario: E2E-004 TC-001 Send test-event through API and get event emitted by sequence
        Given host one execute sequence in background "../packages/reference-apps/event-sequence.tar.gz"
        And host one process is working
        #potentially condition race issue TODO verify
        And wait "3000" ms
        When send event "test-event" to sequence with message "test message"
        Then get event from sequence
        And host one process is stopped
        And response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"

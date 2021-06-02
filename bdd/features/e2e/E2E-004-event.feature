Feature: Event e2e tests

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-004 TC-001 Send test-event through API and get event emitted by sequence
        Given host one execute sequence in background "../packages/reference-apps/event-sequence.tar.gz"
        And host one process is working
        #potentially condition race issue TODO verify
        And wait "3000" ms
        When send event "test-event" to sequence with message "test message"
        Then get event from sequence
        And host one process is stopped
        And response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"

    Scenario: E2E-004 TC-002 Send test-event through API and get event emitted by sequence
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "6000" ms
        Then instance started with arguments "/package/data.json"
        And wait for "4000" ms
        When send event "check" to instance with message "test message"
        And wait for "5000" ms
        Then get event from instance
        And wait for "3000" ms
        # And instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"

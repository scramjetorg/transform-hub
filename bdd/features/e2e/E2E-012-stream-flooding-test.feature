Feature: Stream flooding tests. Ensure that even if a large amount of data is sent or received, the Instance is able to respond to events.

    @ci
    Scenario: E2E-012 TC-001 Flood stdin of Instance, do not consume it and check if Instance responds to event sent.
        Given host is running
        When sequence "../packages/reference-apps/event-sequence.tar.gz" loaded
        And instance started with arguments "500"
        And wait for "6000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        When I try to flood the stdin stream with 11000 kilobytes
        And wait for "5000" ms
        And send event "test-event" to instance with message "test message"
        And wait for "5000" ms
        Then get event from instance
        When wait for "1000" ms
        Then instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        And send kill message to instance
        When wait for "5000" ms
        And container is closed
        Then host is still running

    # Just a placeholder - WIP
    @ignore
    Scenario: E2E-012 TC-002 Instance floods wrtites stdout and Host checks whether Instance still responds to event sent.
        Given host is running
        When sequence "../packages/reference-apps/flood-stdout-sequence.tar.gz" loaded
        And instance started
        And wait for "6000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And wait for "5000" ms
        And send event "test-event" to instance with message "test message"
        And wait for "5000" ms
        Then get event from instance
        When wait for "1000" ms
        Then instance response body is "{\"eventName\":\"test-event-response\",\"message\":\"message from sequence\"}"
        And send kill message to instance
        When wait for "5000" ms
        And container is closed
        Then host is still running


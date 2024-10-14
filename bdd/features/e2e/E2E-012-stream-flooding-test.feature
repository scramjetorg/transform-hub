Feature: Stream flooding tests. Ensure that even if a large amount of data is sent or received, the Instance is able to respond to events.

    @ci-api @runner-cleanup
    Scenario: E2E-012 TC-001 Flood stdin of Instance, do not consume it and check if Instance responds to event sent.
        Given host is running
        When sequence "../refapps/event-sequence-v2.tar.gz" loaded
        And instance started with arguments "500"
        And wait for instance healthy is "true"
        And get runner PID
        When flood the stdin stream with 11000 kilobytes
        And wait for "3000" ms
        And send event "test-event" to instance with message "test message"
        Then get event "test-event-response" from instance
        Then instance response body is "\"message from sequence\""
        Then host is still running

    @ci-api @runner-cleanup
    Scenario: E2E-012 TC-002 Instance floods wrtites stdout, then Host checks whether even sent by Instance can be still received.
        Given host is running
        When sequence "../refapps/flood-stdout-sequence.tar.gz" loaded
        And instance started with arguments "4000 10000"
        And wait for instance healthy is "true"
        And get runner PID
        Then get event "test-event-response" from instance
        When wait for "1000" ms
        Then instance response body is "\"message from sequence\""
        Then host is still running


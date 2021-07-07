Feature: Ports e2e tests

    Scenario: PT-005 TC-001 TCP Connection
        Given host is running
        When sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "tcp"
        And get instance info
        And start reading "log" stream
        And connect to instance on port 17006
        And send data to instance tcp server
        And wait for "3000" ms
        And check stream for message sent
        And send "null" to tcp server
        Then host is still running

    Scenario: PT-005 TC-002 UDP Connection
        Given host is running
        When sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "udp"
        And get instance info
        And start reading "log" stream
        And connect to instance on port 17006
        And send data to instance server
        And wait for "3000" ms
        And check stream for message sent
        And send "null" to server
        Then host is still running

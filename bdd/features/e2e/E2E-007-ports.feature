Feature: Ports e2e tests

    @ci
    Scenario: E2E-007 TC-001 TCP Connection
        Given host is running
        And sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "tcp"
        And get instance info
        And start reading "log" stream
        And connect to instance on port 17006
        And send data to instance tcp server
        And wait for "3000" ms
        And check stream for message sent
        And send "null" to tcp server
        Then host is running

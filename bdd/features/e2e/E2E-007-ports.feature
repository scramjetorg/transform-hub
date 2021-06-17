Feature: Ports e2e tests

    Scenario: E2E-007 TC-001 TCP Connection
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "tcp"
        And get instance info
        And start reading "log" stream
        And connect to instance
        And send data to instance tcp server
        And wait for "3000" ms
        And check stream for message sent
        And send null to tcp server
        Then host stops

Feature: Ports e2e tests

    Scenario: PT-005 TC-001 TCP Connection
        Given host is running
        When sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "tcp"
        And get instance info
        And get instance health
        And get containerId
        And start reading "log" stream
        And connect to instance on port 17006 using "tcp" server
        And send "testMessage" to "tcp" server
        And wait for "3000" ms
        And check stream for message sent
        And send "null" to "tcp" server
        And container is closed
        Then host is still running

    Scenario: PT-005 TC-002 UDP Connection
        Given host is running
        When sequence "../packages/reference-apps/ports-sequence.tar.gz" loaded
        And instance started with arguments "udp"
        And get instance info
        And get instance health
        And get containerId
        And start reading "log" stream
        And connect to instance on port 17008 using "udp" server
        And send "testMessage" to "udp" server
        And wait for "3000" ms
        And check stream for message sent
        And send "null" to "udp" server
        And container is closed
        Then host is still running

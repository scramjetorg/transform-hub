Feature: Output streams persisting data E2E test

    @ci-instance-node
    Scenario: E2E-009 TC-001 API test - Get stdout, stderr, output streams from Sequence which generates random numbers, check if all were recived.
        Given host is running
        And sequence "../packages/reference-apps/output-streams.tar.gz" loaded
        And instance started with arguments "1000"
        And keep instance streams "stdout,stderr,output"
        And wait for instance healthy is "true"
        And get runner PID
        When wait for "1000" ms
        When send kill message to instance
        And runner has ended execution
        Then host is running
        And kept instance stream "stdout" should store 1000 items divided by ","
        And kept instance stream "stderr" should store 1000 items divided by ","
        And kept instance stream "output" should store 1000 items divided by ","


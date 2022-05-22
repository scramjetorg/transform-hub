Feature: Sample e2e tests

    @ci-instance-node
    Scenario: E2E-001 TC-001 API test - Get instance output
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started
        And get "output" with instanceId and wait for it to finish
        And wait for instance healthy is "true"
        And get runner PID
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        And send kill message to instance
        And wait for instance healthy is "false"
        And runner has ended execution
        And delete sequence and volumes
        And confirm that sequence and volumes are removed
        Then runner has ended execution
        And host is still running

    @ci-instance-node
    Scenario: E2E-001 TC-002 Test stdio available after the sequence is completed
        Given host is running
        When I execute CLI with "seq pack data/sequences/simple-stdio -o data/simple-stdio-2.tar.gz" arguments
        And sequence "data/simple-stdio-2.tar.gz" loaded
        And instance started with arguments "1"
        And wait for "500" ms
        Then send "Hello Alice!" to stdin
        And wait for "3000" ms
        And get instance info
        Then "stdout" is ">>> Hello Alice!"
        And host is still running

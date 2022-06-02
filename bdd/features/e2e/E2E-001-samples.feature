Feature: Sample e2e tests

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

Feature: Stdio e2e tests

    Scenario: E2E-006 TC-001 API test for endpoints stdin, stdout, stderr
        Given host is running
        When sequence "../packages/reference-apps/stdio-sequence.tar.gz" loaded
        And instance started
        And keep instance streams "stdout,stderr"
        And wait for instance healthy is "true"
        And get runner PID
        When send stdin to instance with contents of file "../packages/reference-apps/stdio-sequence/numbers.txt"
        # Make sure that entire file contents were sent and received
        And wait for "1000" ms
        When send kill message to instance
        And runner has ended execution
        Then host is still running
        And kept instance stream "stdout" should be "1\n3\n5\n7\n9\n11\n13\n15\n17\n19\n"
        And kept instance stream "stderr" should be "2\n4\n6\n8\n10\n12\n14\n16\n18\n20\n"

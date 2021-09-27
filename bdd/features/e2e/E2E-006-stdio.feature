Feature: Stdio e2e tests

    @ci
    Scenario: E2E-006 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host is running
        When sequence "../packages/reference-apps/stdio-sequence.tar.gz" loaded
        And instance started
        And keep instance streams "stdout,stderr"
        And wait for instance healthy is "true"
        And get containerId
        When send stdin to instance with contents of file "../packages/reference-apps/stdio-sequence/numbers.txt"
        When send kill message to instance
        And container is closed
        Then host is still running
        And kept instance stream "stdout" should be "1\n3\n5\n7\n9\n11\n13\n15\n17\n19\n"
        And kept instance stream "stderr" should be "2\n4\n6\n8\n10\n12\n14\n16\n18\n20\n"

Feature: Stdio e2e tests

    Scenario: E2E-006 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/stdio-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started
        And wait for "4000" ms
        And keep instance streams "stdout,stderr"
        When send stdin to instance with arguments "../packages/reference-apps/stdio-sequence/numbers.txt"
        And get instance health
        And get containerId
        And instance health is "true"
        And wait for "1000" ms
        When send kill message to instance
        And wait for "3000" ms
        And container is closed
        Then host stops
        And kept instance stream "stdout" should be "1,3,5,7,9,11,13,15,17,19"
        And kept instance stream "stderr" should be "0,2,4,6,8,10,12,14,16,18"

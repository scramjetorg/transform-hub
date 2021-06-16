Feature: Stdio e2e tests

    Scenario: E2E-006 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/stdio-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started
        And wait for "4000" ms
        When send stdin to instance with arguments "../packages/reference-apps/stdio-sequence/numbers.txt"
        When get instance health
        And get containerId
        And instance health is "true"
        When send kill message to instance
        And get instance "stdout"
        And get instance "stderr"
        And wait for "3000" ms
        And container is closed
        Then host stops



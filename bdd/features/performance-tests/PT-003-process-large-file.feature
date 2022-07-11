Feature: Process large file test

    @ignore
    Scenario: PT-003 TC-001 Sequence processes file smaller than accesible RAM
        Given host is running
        When sequence "../packages/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/small-file.json.gz"
        And get "output" with instanceId and wait for it to finish
        When response data is equal "95"
        Then host is still running

    @ci-performance
    Scenario: PT-003 TC-002 Sequence processes file larger than accesible RAM
        Given host is running
        When sequence "../packages/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/example512M.json.gz"
        And wait for instance healthy is "true"
        And get runner PID
        And get "output" with instanceId and wait for it to finish
        And runner has ended execution
        When response data is equal "39996113"
        Then host is still running

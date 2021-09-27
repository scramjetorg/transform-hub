Feature: Process large file test

    @ignore
    Scenario: PT-003 TC-001 Sequence processes file smaller than accesible RAM
        Given host is running
        When sequence "../packages/reference-apps/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/small-file.json.gz"
        And get "output" in background with instanceId
        When response data is equal "95"
        Then host is still running

    @ci
    Scenario: PT-003 TC-002 Sequence processes file larger than accesible RAM
        Given host is running
        When sequence "../packages/reference-apps/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/example300M.json.gz"
        And wait for instance healthy is "true"
        And get containerId
        And container is closed
        And get "output" in background with instanceId
        When response data is equal "23435224"
        Then host is still running

    Scenario: PT-003 TC-003 Sequence processes JSON file larger than accesible RAM
        Given host is running
        When sequence "../packages/reference-apps/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/example512M.json.gz"
        And wait for instance healthy is "true"
        And get containerId
        And container is closed
        And get "output" in background with instanceId
        When response data is equal "39996113"
        Then host is still running

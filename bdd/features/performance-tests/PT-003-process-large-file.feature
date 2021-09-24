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
        And get "output" in background with instanceId
        When get instance health
        And get containerId
        And wait for "2000" ms
        And instance health is "true"
        When response data is equal "23435224"
        And wait for "5000" ms
        And container is closed
        Then host is still running

    Scenario: PT-003 TC-003 Sequence processes JSON file larger than accesible RAM
        Given host is running
        When sequence "../packages/reference-apps/big-file-sequence.tar.gz" loaded
        And instance started with url from assets argument "scp-store/example512M.json.gz"
        And get "output" in background with instanceId
        When get instance health
        And get containerId
        And instance health is "true"
        When response data is equal "39996113"
        And container is closed
        Then host is still running

Feature: Process large file test

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: PT-002 TC-001 Sequence processes file smaller than accesible RAM
        Given host one execute sequence in background "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz"
        When get output stream long timeout
        And host one process is stopped
        Then response is equal "95"

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: PT-002 TC-002 Sequence processes file larger than accesible RAM
        Given host one execute sequence in background "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/example300M.json.gz"
        When get output stream long timeout
        And host one process is stopped
        Then response is equal "23435224"

    Scenario: PT-002 TC-003 Sequence processes file smaller than accessible RAM
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/reference-apps/big-file-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "https://repo.int.scp.ovh/repository/scp-store/example300M.json.gz"
        When get output stream with long timeout
        Then response data is equal "23435224"



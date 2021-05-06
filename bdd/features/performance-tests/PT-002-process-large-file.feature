Feature: Process large file test

    Scenario: PT-002 TC-001 Sequence processes file larger than accesible RAM
        Given host one execute sequence in background "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz"
        When get output stream long timeout
        And host one process is stopped
        Then response is equal "95"

    Scenario: PT-002 TC-002 Sequence processes file larger than accesible RAM
        Given host one execute sequence in background "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/example300M.json.gz"
        When get output stream long timeout
        And host one process is stopped
        Then response is equal "23435224"

Feature: Process large file test

    Scenario: PT-002 TC-001 Sequence processes file larger than accesible RAM
        Given host one execute sequence "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz"
        Then stdout contains "95" 
        #And wait "500" ms
        #TODO find another solution, probably process is finnishing
        #TODO Then is equal "95"  -- task for Agnieszka T.

    @ignore
    Scenario: PT-002 TC-002 Sequence processes file larger than accesible RAM
        Given host one execute sequence "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/example300M.json.gz" long timeout
        Then stdout contains "23435224"

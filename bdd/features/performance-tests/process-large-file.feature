Feature: Process large file test

    Scenario: Sequence processes file larger than accesible RAM
        Given host one execute sequence "../packages/reference-apps/big-file-sequence.tar.gz" with arguments "https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz" and redirects output to "bigFileOutput.test.result.txt"
        When file "bigFileOutput.test.result.txt" is generated
        Then file "bigFileOutput.test.result.txt" contains ""


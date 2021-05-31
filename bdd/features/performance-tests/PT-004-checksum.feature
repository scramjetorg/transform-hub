Feature: Verify the checksums of payloads are correct

    Scenario: PT-004 TC-001 Checksum of JSON payload
        Given file in the location "../dist/reference-apps/checksum-sequence/data.json" exists on hard drive
        And host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/reference-apps/checksum-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started
        And wait for "2000" ms
        Then compare checksums of content sent from file "../dist/reference-apps/checksum-sequence/data.json"


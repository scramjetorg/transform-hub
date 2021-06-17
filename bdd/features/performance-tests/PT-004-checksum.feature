Feature: Verify the checksums of payloads are correct

    Scenario: PT-004 TC-001 Checksum of JSON payload
        Given file in the location "../dist/reference-apps/checksum-sequence/data.json" exists on hard drive
        And host started
        When host process is working
        When sequence "../packages/reference-apps/checksum-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started
        And wait for "5000" ms
        When get instance health
        And get containerId
        And instance health is "true"
        And compare checksums of content sent from file "../dist/reference-apps/checksum-sequence/data.json"
        And wait for "5000" ms
        When container is closed
        Then host stops


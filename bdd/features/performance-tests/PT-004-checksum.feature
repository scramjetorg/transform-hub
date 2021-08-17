Feature: Verify the checksums of payloads are correct

    @ci
    Scenario: PT-004 TC-001 Checksum of JSON payload
        Given file in the location "../dist/reference-apps/checksum-sequence/data.json" exists on hard drive
        And host is running
        When sequence "../packages/reference-apps/checksum-sequence.tar.gz" loaded
        And instance started
        When get instance health
        And get containerId
        And instance health is "true"
        And compare checksums of content sent from file "../dist/reference-apps/checksum-sequence/data.json"
        And wait for "10000" ms
        When container is closed
        Then host is still running


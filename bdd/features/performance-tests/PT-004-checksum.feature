Feature: Verify the checksums of payloads are correct

    @ci
    Scenario: PT-004 TC-001 Checksum of JSON payload
        Given file in the location "../dist/reference-apps/checksum-sequence/data.json" exists on hard drive
        And host is running
        When sequence "../packages/reference-apps/checksum-sequence.tar.gz" loaded
        And instance started
        When wait for instance healthy is "true"
        And get runner PID
        And compare checksums of content sent from file "../dist/reference-apps/checksum-sequence/data.json"
        When runner has ended execution
        Then host is still running


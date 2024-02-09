Feature: Verify the checksums of payloads are correct

    @ci-performance
    Scenario: PT-004 TC-001 Checksum of JSON payload
        Given file in the location "../dist/checksum-sequence/data.json" exists on hard drive
        And host is running
        When sequence "../packages/checksum-sequence.tar.gz" loaded
        And instance started
        When wait for instance healthy is "true"
        And get runner PID
        And compare checksums of content sent from file "../dist/checksum-sequence/data.json"
        When runner has ended execution
        Then host is still running

    @ci-performance
    Scenario: PT-004 TC-002 Checksum of binary payload
        Given file in the location "data/sequences/bin-out-seq/random.bin" exists on hard drive
        And host is running
        When I execute CLI with "seq pack data/sequences/bin-out-seq/dist -o data/sequences/bin-out-seq.tar.gz"
        When sequence "data/sequences/bin-out-seq.tar.gz" loaded
        And instance started
        When wait for instance healthy is "true"
        And get runner PID
        And confirm file checksum match output checksum
        When runner has ended execution
        Then host is still running


Feature: Transform Sequence over API

    Scenario: RA-005 TC-001 Transform Sequence over API
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/reference-apps/transform-sequence-1.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "1"
        And wait for "1000" ms
        Then send data
        And wait for "4000" ms
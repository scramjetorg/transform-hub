Feature: Transform Sequence over API

    Scenario: RA-005 TC-001 Transform Sequence over API
        Given host is running
        When sequence "../packages/reference-apps/transform-sequence-1.tar.gz" loaded
        And wait for "4000" ms
        And instance started
#        And send data
#        And wait for "4000" ms
#        Then get output
        And wait for "20000" ms

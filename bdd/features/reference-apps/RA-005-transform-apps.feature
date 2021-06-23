Feature: Transform Sequence over API

    Scenario: RA-005 TC-001 Transform Sequence over API
        Given host is running
        When sequence "../packages/reference-apps/transform-sequence-1.tar.gz" loaded
        And instance started
        # And stream sequence logs to stderr
        And send data
        And output is '{"x": 1}'
        And wait for "4000" ms
        Then host is running

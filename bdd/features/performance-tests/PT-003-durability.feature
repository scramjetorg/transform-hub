Feature: Start multiple instances

    Scenario: PT-003 TC-001 More than 25 instances work for long time
        Given host started
        And wait for "3000" ms
        When starts multiple sequences "../packages/reference-apps/durability-preservation.tar.gz"
        Then wait for 24 hours

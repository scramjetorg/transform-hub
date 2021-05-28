Feature: Start multiple instances

    Scenario: PT-003 TC-001 More than 25 instances work for long time
        Given host started
        And wait for "2000" ms
        When starts multiple sequences "../packages/reference-apps/durability-preservation.tar.gz" for 1 hours
        When wait for .5 hours
        Then check if instances respond


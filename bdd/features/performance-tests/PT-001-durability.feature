Feature: Start multiple instances

    Scenario: PT-001 TC-001 More than 5 instances work for long time
        Given host is running
        And we pipe the sequence logs to stdout
        When starts at least 2 sequences from file "../packages/reference-apps/durability-preservation.tar.gz" for .25 hours
        When wait for .025 hours
        Then check if instances respond
        When wait for "2000" ms
        Then host is still running

    Scenario: PT-001 TC-002 More than 25 instances work for long time
        Given host is running
        When starts at least 25 sequences from file "../packages/reference-apps/durability-preservation.tar.gz" for 2 hours
        When wait for 1 hours
        Then check if instances respond
        When wait for "2000" ms
        Then host is still running

    Scenario: PT-001 TC-003 More than 25 instances work for long time
        Given host is running
        When starts at least 25 sequences from file "../packages/reference-apps/durability-preservation.tar.gz" for 25 hours
        When wait for 24 hours
        Then check if instances respond
        When wait for "2000" ms
        Then host is still running



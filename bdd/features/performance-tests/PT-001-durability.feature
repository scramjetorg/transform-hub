Feature: Start multiple instances

    Scenario: PT-001 TC-001 More than 5 instances work for long time
        Given host is running
        When starts at least 2 sequences from file "../packages/reference-apps/durability-preservation.tar.gz"
        Then check every 10 seconds if instances respond for .02 hours
        Then stop all instances
        Then host is still running

    Scenario: PT-001 TC-002 More than 25 instances work for long time
        Given host is running
        When starts at least 25 sequences from file "../packages/reference-apps/durability-preservation.tar.gz"
        Then check every 60 seconds if instances respond for 1 hours
        Then stop all instances
        Then host is still running

    Scenario: PT-001 TC-003 More than 25 instances work for long time
        Given host is running
        When starts at least 25 sequences from file "../packages/reference-apps/durability-preservation.tar.gz"
        Then check every 60 seconds if instances respond for 24 hours
        Then stop all instances
        Then host is still running



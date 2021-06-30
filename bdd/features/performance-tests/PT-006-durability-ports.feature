Feature: Start multiple instances

    Scenario: PT-006 TC-001 More than 5 instances work for long time
        Given host is running
        When starts at least 10 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check every 10 seconds if instances respond with correct data for .05 hours on port 20000
        Then stop all instances
        Then host is still running

    Scenario: PT-006 TC-002 More than 25 instances work for long time
        Given host is running
        When starts at least 10 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check every 10 seconds if instances respond with correct data for .1 hours on port 20000
        Then stop all instances
        Then host is still running

    Scenario: PT-006 TC-003 More than 25 instances work for long time
        Given host is running
        When starts at least 250 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check every 60 seconds if instances respond with correct data for 24 hours on port 20000
        Then stop all instances
        Then host is still running

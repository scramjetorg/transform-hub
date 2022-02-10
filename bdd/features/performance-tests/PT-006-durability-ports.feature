Feature: Start multiple instances

    Scenario: PT-006 TC-001 More than 5 instances work for long time
        Given host is running
        When starts at least 10 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check on port 20000 every 10 s if instances respond correctly for .05 h
        Then stop all instances
        Then host is still running

    Scenario: PT-006 TC-002 More than 25 instances work for long time
        Given host is running
        When starts at least 10 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check on port 20000 every 10 s if instances respond correctly for .1 h
        Then stop all instances
        Then host is still running

    Scenario: PT-006 TC-003 More than 25 instances work for long time
        Given host is running
        When starts at least 250 sequences from file "../packages/reference-apps/durability-preservation-tcp.tar.gz"
        Then check on port 20000 every 60 s if instances respond correctly for 24 h
        Then stop all instances
        Then host is still running

Feature: CLI tests

    @ci
    Scenario: E2E-010 TC-001 CLI displays help
        Given host is running
        When CLI displays help
        Then host is still running
        
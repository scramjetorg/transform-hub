Feature: Python Host-Client BDD tests
    @ci
    Scenario: List sequences on host
        Given host is running
        When sequence ../../packages/reference-apps/python-alice.tar.gz loaded
        When sequence started
        Then returns response with result == success
        Then host is still running
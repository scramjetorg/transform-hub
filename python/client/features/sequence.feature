Feature: Python Host-Client BDD tests
    Scenario: List sequences on host
        Given host is running
        When sequence ../../python/reference-apps/python-alice.tar.gz loaded
        When sequence started
        Then returns response with result == success
        Then host is still running
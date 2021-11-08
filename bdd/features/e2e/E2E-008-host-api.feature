Feature: Ports e2e tests

    @ci
    Scenario: E2E-008 TC-001 API test for basic Host endpoints
        Given host is running
        When I get version
        Then it returns the root package version
        When I get load-check
        Then it returns a correct load check with required properties
        And host is running

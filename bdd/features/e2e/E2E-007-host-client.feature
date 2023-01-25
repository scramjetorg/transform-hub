Feature: Test for host client used by sequences

    @ci-api @cli
    Scenario: E2E-007 TC-001 Test sequence with basic host client methods like getVersion(), getStatus(), etc.
        Given I set config for local Hub
        When I execute CLI with "seq deploy data/sequences/hostclient-basic"
        And wait for "3000" ms
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data received
        When I execute CLI with "inst stdout -" without waiting for the end
        Then I confirm data received

Feature: Test for host client used by sequences

# to run a single test with full logs: DEVELOPMENT=1 SCRAMJET_TEST_LOG=1 yarn test:bdd --name="E2E-007 TC-001" --name="E2E-007 TC-002"

    @ci-api @cli @slow
    Scenario: E2E-007 TC-001 Test sequence with basic host client methods like getVersion(), getStatus(), etc.
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/js-hostclient-basic.tar.gz"
        When I execute CLI with "seq start -"
        And wait for "3000" ms
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data received
        When I execute CLI with "inst stdout -" without waiting for the end
        Then I confirm data received
        And I execute CLI with "inst kill - --removeImmediately" and accept already completed instance cleanup
        Then I wait for "Instance" list to be empty

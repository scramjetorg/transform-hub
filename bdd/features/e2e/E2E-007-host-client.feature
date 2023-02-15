Feature: Test for host client used by sequences

# to run a single test with full logs: DEVELOPMENT=1 SCRAMJET_TEST_LOG=1 yarn test:bdd --name="E2E-007 TC-001" --name="E2E-007 TC-002"

    @ci-api @cli
    Scenario: E2E-007 TC-001 Test sequence with basic host client methods like getVersion(), getStatus(), etc.
        Given I set config for local Hub
        When I execute CLI with "seq send ../packages/hostclient-basic.tar.gz"
        When I execute CLI with "seq start -"
        And wait for "3000" ms
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data received
        When I execute CLI with "inst stdout -" without waiting for the end
        Then I confirm data received
        And I execute CLI with "inst kill - --removeImmediately"
        Then I wait for "Instance" list to be empty

    @ci-api @cli
    Scenario: E2E-007 TC-002 Test Sequence that starts another Sequence
        Given I set config for local Hub
        When I execute CLI with "seq send ../packages/hostclient-basic.tar.gz"
        And I execute CLI with "seq info -"
        And I get sequence id
        Then I start "hostclient-start-seq" with the first sequence id
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data received
        And I execute CLI with "inst kill - --removeImmediately"
        When I execute CLI with "seq prune --force"
        Then I wait for "Instance" list to be empty
        Then I wait for "Sequence" list to be empty

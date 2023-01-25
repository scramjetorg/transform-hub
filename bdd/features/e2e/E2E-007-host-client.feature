Feature: Test for host client used by sequences

# to run a single test with full logs: DEVELOPMENT=1 SCRAMJET_TEST_LOG=1 yarn test:bdd --name="E2E-007 TC-001"

    @ci-api @cli
    Scenario: E2E-007 TC-001 Test sequence with basic host client methods like getVersion(), getStatus(), etc.
        Given I set config for local Hub
        When I execute CLI with "seq deploy data/sequences/hostclient-basic"
        And wait for "3000" ms
        When I execute CLI with "inst output -" without waiting for the end
        Then I confirm data received
        When I execute CLI with "inst stdout -" without waiting for the end
        Then I confirm data received
        And I execute CLI with "seq prune --force"

    @ci-api @cli
    Scenario: E2E-007 TC-002 Test Sequence that starts another Sequence
        Given I set config for local Hub
        And I execute CLI with "inst list"
        And I confirm "Instance" list is empty
        When I execute CLI with "seq pack data/sequences/hostclient-basic"
        When I execute CLI with "seq send data/sequences/hostclient-basic.tar.gz"
        When I execute CLI with "seq deploy data/sequences/hostclient-start-seq"
        And wait for "3000" ms
        And I execute CLI with "inst list"
        And I confirm "Instance" list is not empty
        And I execute CLI with "seq prune --force"

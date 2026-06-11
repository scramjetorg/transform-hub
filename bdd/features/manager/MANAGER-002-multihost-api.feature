@manager-migration
Feature: MANAGER-002 MultiHost API
# To run use command:
# SCRAMJET_SPAWN_TS=1 SCRAMJET_TEST_LOG=1 npm --prefix sth/bdd run test:bdd -- --name="MultiHost API"
#
# Each test should use MM and MH on different ports since tests are run in parallel.
# This test suit uses port starting from 22000 for MultiManagers and 23000 for MultiHosts.

    @local @api @cleanupmh @cleanupmm
    Scenario: MultiHost API correctly handles MultiManager disconnecting
        Given MultiManager with options "--id mm1 --server-api-port 22000" is started
        When started MultiHost with options "--id mh1 --server-api-port 23000 --multi-manager-url http://0.0.0.0:22000"
        When stopped MultiManager with id "mm1"
        Then MultiHost with id "mh1" is still running

@manager-migration
Feature: MANAGER-001 MultiManager API
# To run use command:
# SCRAMJET_SPAWN_TS=1 SCRAMJET_TEST_LOG=1 npm --prefix sth/bdd run test:bdd -- --name="MultiManager API"
#
# Each test should use MM on different ports since tests are run in parallel.
# This test suit uses port starting from 20000 for MultiManagers.
# For now tests with Hosts are not parallel bc they are spawned on freeports which seems to be prone to race conditions

    @local @api @cleanupmm @parallel
    Scenario: API-001 TC-001 MultiManager API /version endpoint
        Given MultiManager with options "--id mm1 --server-api-port 20000" is started
        When MultiManager with id "mm1", "version" GET endpoint queried
        Then it responds with "version"

    @local @api @cleanupmm @parallel
    Scenario: API-001 TC-002 MultiManager API /info endpoint
        Given MultiManager with options "--id mm2 --server-api-port 20001" is started
        When MultiManager with id "mm2", "info" GET endpoint queried
        Then it responds with "{ \"apiBase\": \"/api/v1\", \"apiPort\": 20001 }"

    @local @api @cleanupmm @parallel
    Scenario: API-001 TC-003 MultiManager API /start endpoint
        Given MultiManager with options "--id mm3 --server-api-port 20002" is started
        When MultiManager with id "mm3", "start" POST endpoint queried with data "{ \"manager\": { \"id\": \"Mgr1\" } }"
        Then it responds with "{ \"id\": \"Mgr1\" }"

    @local @api @cleanupmm @parallel
    Scenario: API-001 TC-007 List Managers created with MultiManager
        Given MultiManager with options "--id mm7 --server-api-port 20007" is started
        When MultiManager with id "mm7", "start" POST endpoint queried with data "{ \"manager\": { \"id\": \"Mgr7\" } }"
        Then it responds with "{ \"id\": \"Mgr7\" }"
        When MultiManager with id "mm7", "list" GET endpoint queried
        Then it lists manager with response "[{ \"id\": \"Mgr7\" }]"

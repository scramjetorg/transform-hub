@manager-migration
Feature: MANAGER-001 MultiManager API
# To run use command:
# SCRAMJET_SPAWN_TS=1 SCRAMJET_TEST_LOG=1 npm --prefix sth/bdd run test:bdd -- --name="MultiManager API"
#
# Each test should use MM and MH on different ports since tests are run in parallel.
# This test suit uses port starting from 20000 for MultiManagers and 21000 for MultiHosts.
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

    @local @api @cleanupmm @cleanupmh @parallel @requires-multi-host
    Scenario: API-001 TC-004 MultiManager API /msth/.../version endpoint
        Given MultiManager with options "--id mm4 --server-api-port 20004" is started
        When started MultiHost with options "--id mh4 --server-api-port 21004 --multi-manager-url http://0.0.0.0:20004"
        When MultiManager with id "mm4", "msth/mh4/api/v1/version" GET endpoint queried
        Then it responds with "version"

    @local @api @cleanupmm @cleanupmh @requires-multi-host
    Scenario: API-001 TC-005 MultiManager API /msth/.../start and stop endpoints
        Given MultiManager with options "--id mm5 --server-api-port 20005" is started
        When started MultiHost with options "--id mh5 --server-api-port 21005 --multi-manager-url http://0.0.0.0:20005"
        When MultiManager with id "mm5", "msth/mh5/api/v1/start" POST endpoint queried with data "{ \"runtimeAdapter\": \"process\" }"
        Then MultiManager with id "mm5" lists 1 running hosts on MultiHost id "mh5"
        When MultiManager with id "mm5" stops first running host on MultiHost id "mh5"
        Then MultiManager with id "mm5" lists 0 running hosts on MultiHost id "mh5"

    @ignore @local @api @cleanupmm @cleanupmh @parallel
    Scenario: API-001 TC-006 MultiManager API correctly handles MultiHost disconnecting
        Given MultiManager with options "--id mm6 --server-api-port 20006" is started
        When started MultiHost with options "--id mh6 --server-api-port 21006 --multi-manager-url http://0.0.0.0:20006"
        When stopped MultiHost with id "mh6"
        Then MultiManager with id "mm6" is still running

    @local @api @cleanupmm @parallel
    Scenario: API-001 TC-007 List Managers created with MultiManager
        Given MultiManager with options "--id mm7 --server-api-port 20007" is started
        When MultiManager with id "mm7", "start" POST endpoint queried with data "{ \"manager\": { \"id\": \"Mgr7\" } }"
        Then it responds with "{ \"id\": \"Mgr7\" }"
        When MultiManager with id "mm7", "list" GET endpoint queried
        Then it lists manager with response "[{ \"id\": \"Mgr7\" }]"

    @local @api @cleanupmm @cleanupmh @requires-multi-host
    Scenario: API-001 TC-008 Send sequence to host
        Given MultiManager with options "--id mm8 --server-api-port 20008" is started
        When Manager started on MultiManager "mm8" with config "{\"id\": \"Mgr8\"}"
        When started MultiHost with options "--id mh8 --server-api-port 21008 --multi-manager-url http://0.0.0.0:20008"
        When start host on MultiHost "mh8" connected to Manager "Mgr8" using MultiManager "mm8" with data "{\"host\": {\"id\": \"Host8-1\"}, \"cpmUrl\": \"127.0.0.1:20008\", \"cpmId\": \"Mgr8\"}"
        Then MultiManager with id "mm8" lists 1 running hosts on MultiHost id "mh8"
        When Send sequence "hello-alice-out" to host "Host8-1" with alias "hello-alice-out-8-1"
        Then it responds with "id"
        Then MultiManager with id "mm8" is still running

    # flaky!
    # @local @api @cleanupmm @cleanupmh
    # Scenario: API-001 TC-009 List sequences from Manager
    #     Given MultiManager with options "--id mm9 --server-api-port 20009" is started
    #     When Manager started on MultiManager "mm9" with config "{\"id\": \"Mgr9\"}"
    #     When started MultiHost with options "--id mh9 --server-api-port 21009 --multi-manager-url http://0.0.0.0:20009"
    #     When start host on MultiHost "mh9" connected to Manager "Mgr9" using MultiManager "mm9" with data "{\"host\": {\"id\": \"Host9-1\"}, \"cpmUrl\": \"127.0.0.1:20009\", \"cpmId\": \"Mgr9\"}"
    #     Then MultiManager with id "mm9" lists 1 running hosts on MultiHost id "mh9"
    #     When Send sequence "hello-alice-out" to host "Host9-1" with alias "hello-alice-out-9-1"
    #     When Send sequence "healthy-sequence" to host "Host9-1" with alias "healthy-sequence-9-1"
    #     When MultiManager with id "mm9", "cpm/Mgr9/api/v1/sequences" GET endpoint queried
    #     Then it lists manager with 2 sequences
    #     Then MultiManager with id "mm9" is still running

    @local @api @cleanupmm @cleanupmh @requires-multi-host
    Scenario: API-001 TC-010 Log from Manager
        Given MultiManager with options "--id mm10 --server-api-port 20010" is started
        When Manager started on MultiManager "mm10" with config "{\"id\": \"Mgr10\"}"
        Then Manager "Mgr10" exposes own logs
        When started MultiHost with options "--id mh10 --server-api-port 21010 --multi-manager-url http://0.0.0.0:20010"
        When start host on MultiHost "mh10" connected to Manager "Mgr10" using MultiManager "mm10" with data "{\"host\": {\"id\": \"Host10-1\"}, \"cpmUrl\": \"127.0.0.1:20010\", \"cpmId\": \"Mgr10\"}"
        Then Manager "Mgr10" exposes Host "Host10-1" logs
        Then MultiManager with id "mm10" is still running

    @ignore @local @api @cleanupmm @cleanupmh
    Scenario: API-001 TC-011 Send data between instances using topics and read output stream
        Given MultiManager with options "--id mm11 --server-api-port 20011" is started
        When Manager started on MultiManager "mm11" with config "{\"id\": \"Mgr11\"}"
        When started MultiHost with options "--id mh11 --server-api-port 21011 --multi-manager-url http://0.0.0.0:20011"
        When start host on MultiHost "mh11" connected to Manager "Mgr11" using MultiManager "mm11" with data "{\"host\": {\"id\": \"Host11-1\"}, \"cpmUrl\": \"127.0.0.1:20011\", \"cpmId\": \"Mgr11\"}"
        When start host on MultiHost "mh11" connected to Manager "Mgr11" using MultiManager "mm11" with data "{\"host\": {\"id\": \"Host11-2\"}, \"cpmUrl\": \"127.0.0.1:20011\", \"cpmId\": \"Mgr11\"}"
        Then MultiManager with id "mm11" lists 2 running hosts on MultiHost id "mh11"
        When Send sequence "hello-input-out" to host "Host11-2" with alias "hello-input-out-11-1"
        Then start sequence "hello-input-out-11-1" instance with alias "instance-hello-input-out-11-1"
        When Send sequence "endless-names-output" to host "Host11-1" with alias "endless-names-output-11-1"
        Then start sequence "endless-names-output-11-1" instance with alias "instance-endless-names-output-11-1"
        Then instance "instance-hello-input-out-11-1" output is expected response "names"
        Then MultiManager with id "mm11" is still running

    @local @api @cleanupmm @cleanupm @requires-multi-host
    Scenario: API-001 TC-012 MultiManager API Manager - Host connection
        Given MultiManager with options "--id mm12 --server-api-port 20012" is started
        When started MultiHost with options "--id mh12 --server-api-port 21012 --multi-manager-url http://0.0.0.0:20012"
        When Manager started on MultiManager "mm12" with config "{\"id\": \"Mgr12\"}"
        And MultiManager with id "mm12", "msth/mh12/api/v1/start" POST endpoint queried with data "{ \"runtimeAdapter\": \"process\", \"cpmUrl\": \"127.0.0.1:20012\", \"cpmId\": \"Mgr12\"}"
        Then MultiManager with id "mm12" lists 1 running hosts on Manager id "Mgr12"

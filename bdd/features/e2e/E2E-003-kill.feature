Feature: Kill e2e tests

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-003 TC-001 Kill sequence
        Given host one execute sequence in background "../packages/reference-apps/sequence-20s.tar.gz"
        And host one process is working
        And wait "500" ms
        And get logs in background
        And wait "1000" ms
        When send kill
        Then host one process is stopped
        And get from log response containerId
        And container is stopped

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-003 TC-002 Kill sequence - kill handler should emit event when executed
        Given host one execute sequence in background "../packages/reference-apps/sequence-20s-kill-handler.tar.gz"
        And host one process is working
        And wait "500" ms
        And get logs in background
        And wait "2500" ms
        When send kill
        And get event from sequence
        And host one process is stopped
        Then response body is "{\"eventName\":\"kill-handler-called\",\"message\":\"\"}"
        And get from log response containerId
        And container is stopped

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-003 TC-003 Container exits after sequence execution
        Given host one execute sequence in background "../packages/reference-apps/inert-sequence-1.tar.gz"
        And host one process is working
        And wait "500" ms
        And get logs in background
        And wait "1000" ms
        Then host one process is stopped
        And get from log response containerId
        And container is stopped

    Scenario: E2E-003 TC-004 Kill instance
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        Then instance started with arguments "/package/data.json"
        And wait for "8000" ms
        # And get logs in background
        And wait "1000" ms
        Then send kill message to instance
        # Then instance is stopped
        # And get from log response containerId
        # And container is stopped

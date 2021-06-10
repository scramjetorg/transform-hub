Feature: Kill e2e tests

    Scenario: E2E-003 TC-001 Kill instance
        Given host started
        When host process is working
        And sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "5000" ms
        When get instance health
        And get containerId
        And instance health is "true"
        And send kill message to instance
        And wait "8000" ms
        And container is closed
        Then host stops

    @ignore
    Scenario: E2E-003 TC-002 Kill sequence - kill handler should emit event when executed
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/sequence-20s-kill-handler.tar.gz" loaded
        And wait for "4000" ms
        And instance started with arguments "/package/data.json"
        And wait for "5000" ms
        When get instance health
        And get containerId
        And instance health is "true"
        Then get event from instance
        When send kill message to instance
        And instance response body is "{\"eventName\":\"kill-handler-called\",\"message\":\"\"}"
        And wait "8000" ms
        And container is closed
        Then host stops

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-003 TC-005 Kill sequence - kill handler should emit event when executed
        Given host one execute sequence in background "../packages/reference-apps/sequence-20s-kill-handler.tar.gz"
        When host one process is working
        And wait "500" ms
        And get logs in background
        And wait "2500" ms
        And send kill
        And get event from sequence
        Then host one process is stopped
        When response body is "{\"eventName\":\"kill-handler-called\",\"message\":\"\"}"
        Then get from log response containerId
        Then container is stopped



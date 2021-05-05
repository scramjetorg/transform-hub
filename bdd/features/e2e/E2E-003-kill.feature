Feature: Kill e2e tests

    Scenario: E2E-003 TC-001 Kill sequence
        Given host one execute sequence in background "../packages/reference-apps/sequence-20s.tar.gz"
        And host one process is working
        And wait "1000" ms
        When send kill
        And get logs
        And get from response containerId
        Then host one process is stopped
        And container is stopped

    Scenario: E2E-003 TC-002 Kill sequence - kill handler should emit event when executed
        Given host one execute sequence in background "../packages/reference-apps/sequence-20s-kill-handler.tar.gz"
        And host one process is working
        And wait "3000" ms
        When send kill
        Then get event from sequence
        And response body is "{\"eventName\":\"kill-handler-called\",\"message\":\"\"}"
        Then host one process is stopped

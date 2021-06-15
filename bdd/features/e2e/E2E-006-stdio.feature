Feature: Stdio e2e tests

    Scenario: E2E-006 TC-001 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host started
        When host process is working
        And sequence "../packages/reference-apps/unhealthy-sequence.tar.gz" loaded
        And wait for "4000" ms
        And instance started
        And wait for "4000" ms
        # And send input to instance
        When get instance health
        And get containerId
        And instance health is "true"
        And send "file" to stdin
        And get instance stdout
        Then instance response body is "{\"2,4,6,8,10\"}"
        And get instance stderr
        Then instance response body is "{\"1,3,5,7,9,11\"}"
        And wait for "3000" ms
        And container is closed
        Then host stops



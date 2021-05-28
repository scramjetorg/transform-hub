Feature: Monitoring e2e tests

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-005 TC-001 Get monitoring from sequence, should return default monitoring value: healthy true
        Given host one execute sequence in background "../packages/reference-apps/healthy-sequence.tar.gz"
        And host one process is working
        And wait "3000" ms
        When get sequence health
        And host one process is stopped
        Then response body is "{\"healthy\":true}"

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-005 TC-002 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host one execute sequence in background "../packages/reference-apps/unhealthy-sequence.tar.gz"
        And host one process is working
        And wait "3000" ms
        When get sequence health
        And host one process is stopped
        Then response body is "{\"healthy\":false}"

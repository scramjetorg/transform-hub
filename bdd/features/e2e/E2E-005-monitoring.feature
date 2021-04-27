Feature: Monitoring e2e tests

    Scenario: E2E-005 TC-001 Get monitoring from sequence, should return default monitoring value: healthy true
        Given host one execute sequence in background "../packages/reference-apps/healthy-sequence.tar.gz"
        And host one process is working
        And wait "3000" ms
        When get sequence health
        Then response body is "{\"healthy\":true}"
        And host one process is stopped

    Scenario: E2E-003 TC-002 Get monitoring from sequence where new handler method is added and returning: healthy false
        Given host one execute sequence in background "../packages/reference-apps/unhealthy-sequence.tar.gz"
        And host one process is working
        And wait "3000" ms
        When get sequence health
        Then response body is "{\"healthy\":false}"
        And host one process is stopped

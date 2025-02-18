Feature: Expose API route in sequence

    # API GET
    @ci-hub @starts-host
    Scenario: HUB-003 TC-001 API route should be available at hub URL
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When I send a "GET" request to "/api/v1/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "GET /abc"

    # API POST
    @ci-hub @starts-host
    Scenario: HUB-003 TC-002 API should accept POST requests at hub URL
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When I send a "POST" request to "/api/v1/rpc/test/abc" with body "test"
        Then the response status should be 200
        And the response body should be "POST /abc test"

    # API DELETE
    @ci-hub @starts-host
    Scenario: HUB-003 TC-003 API should handle DELETE requests at hub URL
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When I send a "DELETE" request to "/api/v1/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "DELETE /abc"

    # API UNKNOWN (in this example PUT)
    @ci-hub @starts-host
    Scenario: HUB-003 TC-004 API should return 405 for unknown methods at hub URL
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When I send a "PUT" request to "/api/v1/rpc/test/abc" with body "test"
        Then the response status should be 405
        And the response body should be "Method Not Allowed"

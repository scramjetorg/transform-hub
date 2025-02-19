Feature: Expose API route in sequence

    Before:


    # API GET
    @ci-hub @starts-host
    Scenario: HUB-003 TC-001 API route should be available at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-rpc.json --runtime-adapter=process"
        Then host is running
        When I send a "GET" request to "/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "GET /abc"

    # API POST
    @ci-hub @starts-host
    Scenario: HUB-003 TC-002 API should accept POST requests at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-rpc.json --runtime-adapter=process"
        Then host is running
        When I send a "POST" request to "/rpc/test/abc" with body "test"
        Then the response status should be 200
        And the response body should be "POST /abc test"

    # API DELETE
    @ci-hub @starts-host
    Scenario: HUB-003 TC-003 API should handle DELETE requests at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-rpc.json --runtime-adapter=process"
        Then host is running
        When I send a "DELETE" request to "/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "DELETE /abc"

    # API UNKNOWN (in this example PUT)
    @ci-hub @starts-host
    Scenario: HUB-003 TC-004 API should return 405 for unknown methods at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-rpc.json --runtime-adapter=process"
        Then host is running
        When I send a "PUT" request to "/rpc/test/abc" with body "test"
        Then the response status should be 405
        And the response body should be "Method Not Allowed"

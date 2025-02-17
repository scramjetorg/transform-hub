Feature: Expose API route in sequence

    # API GET
    Scenario: API route should be available at hub URL
        Given the hub is running
        When I send a GET request to "/api/v1/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "GET /abc"

    # API POST
    Scenario: API should accept POST requests at hub URL
        Given the hub is running
        When I send a POST request to "/api/v1/rpc/test/abc" with body "test"
        Then the response status should be 200
        And the response body should be "POST /abc test"

    # API DELETE
    Scenario: API should handle DELETE requests at hub URL
        Given the hub is running
        When I send a DELETE request to "/api/v1/rpc/test/abc"
        Then the response status should be 200
        And the response body should be "DELETE /abc"

    # API UNKNOWN (in this example PUT)
    Scenario: API should return 405 for unknown methods at hub URL
        Given the hub is running
        When I send a PUT request to "/api/v1/rpc/test/abc" with body "test"
        Then the response status should be 405
        And the response body should be "Method Not Allowed"

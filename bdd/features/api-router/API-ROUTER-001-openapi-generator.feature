@api-router-generator
Feature: API router OpenAPI generator CLI

    Scenario: API-ROUTER TC-001 The built generator loads a schema module and writes OpenAPI JSON to stdout
        Given the built API router generator and schema fixture are available
        When I run the built API router generator with the schema fixture
        Then the generator stdout is an OpenAPI document containing the fixture health route

    Scenario: API-ROUTER TC-002 The built generator writes OpenAPI JSON to the requested output file
        Given the built API router generator and schema fixture are available
        When I run the built API router generator with the schema fixture and an output file
        Then the generator output file is an OpenAPI document containing the fixture health route

    Scenario: API-ROUTER TC-003 The built generator displays command help
        Given the built API router generator and schema fixture are available
        When I run the built API router generator help
        Then the generator help describes its schema argument and optional output file

Feature: CLI config tests

    This feature checks CLI config functionalities

    @ci-api
    Scenario: E2E-012 TC-001 Test 'si config set'
        Given I set config for local Hub
        When I execute CLI with "config print"
        When I execute CLI with "config set apiUrl http://127.0.0.1:8888/api/v1"
        When I execute CLI with "config print"
        When I confirm apiUrl has changed to "http://127.0.0.1:8888/api/v1"

    @ci-api
    Scenario: E2E-012 TC-002 Test 'si config profile create/remove'
        When I execute CLI with "config profile list"
        When I execute CLI with "config profile create testProfile"
        When I execute CLI with "config profile list"
        Then I confirm "testProfile" "exists" on the list
        When I execute CLI with "config profile use testProfile"
        When I execute CLI with "config set log --format json"
        Then I confirm I switched to "testProfile" profile
        When I execute CLI with "config profile remove testProfile"
        When I execute CLI with "config profile list"
        Then I confirm "testProfile" "not exist" on the list
        Then I confirm I switched to "default" profile

    @ci-api
    Scenario: E2E-012 TC-003 Test seting values in config after changing profile
        When I execute CLI with "config profile list"
        When I execute CLI with "config profile create testProfile"
        When I execute CLI with "config profile use testProfile"
        Then I confirm I switched to "testProfile" profile
        When I execute CLI with "config set apiUrl http://127.0.0.1:8888/api/v1"
        When I execute CLI with "config set log --format json"
        When I confirm apiUrl has changed to "http://127.0.0.1:8888/api/v1"
        When I execute CLI with "config profile remove testProfile"
        Then I confirm "testProfile" "not exist" on the list
        Then I confirm I switched to "default" profile

Feature: Expose API route in sequence

    Before:


    # API GET
    @ci-hub @starts-host
    Scenario: HUB-004 TC-001 Secret game's route should be available at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root ../../dist/gameplay-hub/ --identify-existing --startup-config data/sample-config-gameplay.json --runtime-adapter=process"
        Then host is running
        When I send a "GET" request to "/rpc/game/api/auth"
        Then the response status should be 200
        And the response body should be "{\"message\":\"Game initialized\",\"token\":\"token\"}"

    # API GET
    @ci-hub @starts-host
    Scenario: HUB-004 TC-002 Direct game's route should be available at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root ../../dist/gameplay-hub/ --identify-existing --startup-config data/sample-config-gameplay.json --runtime-adapter=process"
        Then host is running
        When I send a "GET" direct request to "/api/init" on port 3001
        Then the response status should be 200

    # API GET
    @ci-hub @starts-host
    Scenario: HUB-004 TC-003 Direct game's route should be available at hub URL
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root ../../dist/gameplay-hub/ --identify-existing --startup-config data/sample-config-gameplay.json --runtime-adapter=process"
        Then host is running
        When I send a "GET" direct request to "/api/start" on port 3001
        Then the response status should be 200

    # API GET
    @ci-hub @starts-host
    Scenario: HUB-004 TC-004 Get game instances
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root ../../dist/gameplay-hub/ --identify-existing --startup-config data/sample-config-gameplay.json --runtime-adapter=process"
        Then host is running
        Then I get list of "game" instances



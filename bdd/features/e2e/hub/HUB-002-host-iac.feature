Feature: HUB-002 Host started in Infrastructure as Code mode

    @ci @starts-host
    Scenario: HUB-002 TC-001 Start host with existing sequences
        When hub process is started with parameters "-P 9002 --sequences-root ../dist/reference-apps/ --identify-existing --no-docker"
        Then API is available on port 9002
        * Set host base to "http://localhost:9002/api/v1"
        Then I get list of sequences
        And There are some sequences
        And I see a sequence called "hello-alice-out"
        * exit hub process

#    @ci @starts-host
#    Scenario: HUB-002 TC-002 Start host with instances started

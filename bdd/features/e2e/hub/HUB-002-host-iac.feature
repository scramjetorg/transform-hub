Feature: HUB-002 Host started in Infrastructure as Code mode

    @ci @starts-host
    Scenario: HUB-002 TC-001 Start host with existing sequences
        When hub process is started with random ports and parameters "--sequences-root ../dist/reference-apps/ --identify-existing --runtime-adapter=process"
        Then host is running
        Then I get list of sequences
        And there are some sequences
        And I see a sequence called "hello-alice-out"
        * exit hub process

    @ci @starts-host
    Scenario: HUB-002 TC-002 Start host with instances started
        When hub process is started with random ports and parameters "--sequences-root ../dist/reference-apps/ --identify-existing --startup-config data/sample-config.json --runtime-adapter=process"
        Then host is running
        Then I get list of instances
        And there are some instances
        And the output of an instance of "args-config-test" is as in "data/sample-config-output.txt" file
        * exit hub process

#    @ci @starts-host
#    Scenario: HUB-002 TC-003 Start host with instances started and exits automatically

#    @ci @starts-host
#    Scenario: HUB-002 TC-004 Start host with instances started and stays alive

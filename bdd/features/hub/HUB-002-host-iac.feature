Feature: HUB-002 Host started in Infrastructure as Code mode

    @ci-hub @starts-host
    Scenario: HUB-002 TC-001 Start host with existing sequences
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        Then I get list of sequences
        And there are some sequences
        And I see a sequence called "args-config-test"
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-002 TC-002 Start host with instances started
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --startup-config data/sample-config.json --runtime-adapter=process"
        Then host is running
        Then I get list of instances
        And there are some instances
        And the output of an instance of "args-config-test" is as in "data/sample-config-output.txt" file
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-002 TC-003 Start host with hubclient controller
        When hub process is started with random ports and parameters "--sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-hubclient.json --runtime-adapter=process"
        Then host is running
        Then I get list of instances
        And there are some instances
        And send kill message to instance of sequence "hub-client"
        And wait for "500" ms
        And host is running
        * exit hub process

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
        When hub process is started with random ports and parameters "--sequences-root iac-test-data/sequences/ --identify-existing --startup-config iac-test-data/start-config-hubclient.json --runtime-adapter=process -K"
        Then host is running
        Then I get list of instances
        And there are some instances
        And instances of sequence "hub-client" are available
        And send kill message to instances of sequence "hub-client"
        And wait for "500" ms
        And host is running
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-002 TC-004 Event forwarding works between sequences
        When hub process is started with random ports and parameters "--sequences-root=data/sequences/ --instance-lifetime-extension-delay=10 --identify-existing --runtime-adapter=process"
        And host is running
        And I get list of instances
        And start Instance by name "event-sequence" with JSON arguments '["event-one", "event-two"]'
        * remember last instance as "first"
        And start Instance by name "event-sequence" with JSON arguments '["event-two", "event-three"]'
        * remember last instance as "second"
        * switch to instance "first"
        And send event "event-one" to instance with message '{"test": 1}'
        # * wait for "100" ms
        Then "stdout" starts with 'event {"test":1}'
        * switch to instance "second"
        Then "stdout" starts with 'event {"test":2}'
        And host is running
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-002 TC-005 Required startup restart exhaustion should fail host fast
        When hub process is started with random ports expecting exit code 1 and parameters "--sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-required-exit.json --runtime-adapter=process"
        Then host is running
        And hub process exits on its own with code 1 within 10000 ms
        And hub logs should contain "Restarting required startup entry" exactly 1 times
        And hub logs should contain "Required startup entry exhausted restartLimit, fail fast" exactly 1 times

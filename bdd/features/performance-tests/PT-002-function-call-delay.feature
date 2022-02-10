Feature: Maintain efficiency within a host

    @ci
    Scenario: PT-002 TC-001 Maintain efficiency - quick test
        Given host is running
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with args "4000 2000", output to "delay-test-result.txt" and timeout 30 s
        And get runner PID
        Then file "delay-test-result.txt" is generated
        When calculate avg delay from "delay-test-result.txt" of first "2000" function calls from "2000"
        When calculated avereage delay time is lower than 0.1 ms
        And runner has ended execution
        Then host is still running

    Scenario: PT-002 TC-002 Maintain efficiency
        Given host is running
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with args "12000 2000", output to "delay-test-result.txt" and timeout 120 s
        And get runner PID
        Then file "delay-test-result.txt" is generated
        When calculate avg delay from "delay-test-result.txt" of first "10000" function calls from "2000"
        When calculated avereage delay time is lower than 0.1 ms
        And runner has ended execution
        Then host is still running

    Scenario: PT-002 TC-003 Maintain efficiency test with core dump
        Given host is running
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with args "12000 2000 1", output to "delay-test-result.txt" and timeout 120 s
        And get runner PID
        Then file "delay-test-result.txt" is generated
        When calculate avg delay from "delay-test-result.txt" of first "10000" function calls from "2000"
        When calculated avereage delay time is lower than 0.1 ms
        When runner has ended execution
        And memory dump file "core.node.1" was created
        And search word "scramjetTest" and find 0 occurences in "core.node.1" file
        And search word scramjetTest and find more than 1 occurences in "core.node.1" file
        And remove core dump file from "core.node.1"
        Then host is still running

Feature: Maintain efficiency within a host

    @ci-performance
    Scenario: PT-002 TC-001 Maintain efficiency - quick test
        Given host is running
        When sequence "../packages/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with arguments "4000 2000" and write stream to "delay-test-result.txt" and timeout after 30 seconds
        And get runner PID
        Then file "delay-test-result.txt" is generated
        When calculate average delay time from "delay-test-result.txt" of first "2000" function calls starting "2000"
        When calculated avereage delay time is lower than 0.1 ms
        Then host is still running

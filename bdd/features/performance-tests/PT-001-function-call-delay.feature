Feature: Verify delay

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: PT-001 TC-001 Verify delay - quick
        Given host one execute sequence in background "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" with arguments "4000"
        And host one process is working
        When get stdout stream long timeout
        And save response data to file "delay.test.result.txt"
        And file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "2000" function calls starting "2000"
        And host one process is stopped
        Then calculated avereage delay time is lower than "100000" ns

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: PT-001 TC-002 Verify delay - long
        Given host one execute sequence in background "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" with arguments "12000"
        And host one process is working
        When get stdout stream long timeout
        And save response data to file "delay.test.result.txt"
        And file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "10000" function calls starting "2000"
        And host one process is stopped
        Then calculated avereage delay time is lower than "100000" ns

    @ignore
    Scenario: PT-001 TC-003 Verify delay - quick
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And wait for "1000" ms
        And instance started with arguments "4000"
        And wait for "800" ms
        And get "stdout" in background with instanceId
        And save response to file "delay.test.result.txt"
        And file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "2000" function calls starting "2000"
        Then calculated avereage delay time is lower than "100000" ns
        Then host stops

    @ignore
    Scenario: PT-001 TC-004 Verify delay - long
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And wait for "1000" ms
        And instance started with arguments "12000"
        And wait for "800" ms
        And get "stdout" in background with instanceId
        And save response to file "delay.test.result.txt"
        And file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "10000" function calls starting "2000"
        Then calculated avereage delay time is lower than "100000" ns
        Then host stops

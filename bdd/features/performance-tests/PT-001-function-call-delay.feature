Feature: Verify delay

    Scenario: PT-001 TC-001 Verify delay - quick
        Given host started
        When host process is working
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with arguments "4000 4000" and write stream to "delay.test.result.txt"
        And get containerId
        Then file "delay.test.result.txt" is generated
        When calculate average delay time from "delay.test.result.txt" of first "2000" function calls starting "2000"
        When calculated avereage delay time is lower than "100000" ns
        And wait for "2000" ms
        And container is closed
        Then host stops

    Scenario: PT-001 TC-002 Verify delay - long
        Given host started
        When host process is working
        When sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" loaded
        And instance started with arguments "12000 4000" and write stream to "delay.test.result.txt"
        And get containerId
        Then file "delay.test.result.txt" is generated
        When calculate average delay time from "delay.test.result.txt" of first "10000" function calls starting "2000"
        When calculated avereage delay time is lower than "100000" ns
        And wait for "2000" ms
        And container is closed
        Then host stops


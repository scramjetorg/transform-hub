Feature: Verify delay

    Scenario: Verify delay short
        Given host one execute sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" with arguments "4000" and redirects output to "delay.test.result.txt" long timeout
        When file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "2000" function calls starting "2000"
        Then calculated avereage delay time is lower than "100000" ns

    #added to ignore because execution is taking long time
    @ignore
    Scenario: Verify delay long
        Given host one execute sequence "../packages/reference-apps/inert-sequence-2-with-delay.tar.gz" with arguments "12000" and redirects output to "delay.test.result.txt" long timeout
        When file "delay.test.result.txt" is generated
        And calculate average delay time from "delay.test.result.txt" of first "10000" function calls starting "2000"
        Then calculated avereage delay time is lower than "100000" ns

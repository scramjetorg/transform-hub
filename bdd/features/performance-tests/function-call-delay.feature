Feature: Verify delay

    Scenario: Verify delay
        Given host one execute sequence "../packages/ncbir/delay-test.tar.gz" with arguments "4000" and redirects output to "delay.test.result.txt"
        When file "delay.test.result.txt" is generated
        And calculate avereage delay time of first "2000" function calls starting at "2000"
        Then calculated avereage delay time is lower than "100000" ns

    # Scenario: Verify delay
    #     Given host one execute sequence "../packages/ncbir/delay-test.tar.gz" with arguments "12000" and redirects output to "delay.test.result.txt"
    #     When file "delay.test.result.txt" is generated
    #     And calculate avereage delay time of first "10000" function calls starting from call number "2000"
    #     Then calculated avereage delay time is lower than "100000" ns

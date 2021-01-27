Feature: Samples

    Scenario: Execute sample test
        Given input file containing names "names.txt"
        When scramjet server porcesses input file as a stream
        Then file "output.txt" is generated
        And file "output.txt" in each line contains "Hello," followed by name from file "names.txt"

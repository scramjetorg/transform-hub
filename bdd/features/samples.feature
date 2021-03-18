Feature: Samples
    
    Scenario: Execute example HelloAlice
        Given input file containing data "data.json"
        When scramjet server porcesses input file as a stream
        Then file "dataOut.txt" is generated
        And file "dataOut.txt" in each line contains "Hello " followed by name from file "data.json" finished by "!"

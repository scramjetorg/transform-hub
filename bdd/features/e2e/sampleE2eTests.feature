Feature: Sample e2e tests

    Scenario: Execute example HelloAlice
        Given input file containing data "data.json"
        When host one execute sequence "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt" and redirects output to "dataOut.test.result.txt"
        Then file "dataOut.test.result.txt" is generated
        And file "dataOut.test.result.txt" in each line contains "Hello " followed by name from file "data.json" finished by "!"

    Scenario: Stop sequence process after 0s
        Given input file containing data "data.json"
        When start host one and process package "../packages/samples/example.tar.gz"
        And wait "300" ms
        And send stop message with timeout "0" and canKeepAlive "true"
        And wait "4000" ms
        Then host one process is stopped

    Scenario: Stop sequence after 4s
        Given input file containing data "data.json"
        When start host one and process package "../packages/samples/example.tar.gz"
        And wait "300" ms
        And send stop message with timeout "4000" and canKeepAlive "true"
        And wait "3000" ms
        Then host one process is working
        And wait "5000" ms
        And host one process is stopped

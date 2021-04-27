Feature: Sample e2e tests

    Scenario: E2E-001 TC-001 Execute example HelloAlice
        Given input file containing data "data.json"
        When host one execute sequence "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt" and redirects output to "dataOut.test.result.txt"
        Then file "dataOut.test.result.txt" is generated
        And file "dataOut.test.result.txt" in each line contains "Hello " followed by name from file "data.json" finished by "!"

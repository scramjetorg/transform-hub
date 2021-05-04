Feature: Sample e2e tests

    Scenario: E2E-001 TC-001 Execute example HelloAlice
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get stdout stream
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"
        And host one process is stopped

    Scenario: E2E-001 TC-002 Execute example HelloAlice
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/hello-alice-out.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get output stream long timeout
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"
        And host one process is stopped

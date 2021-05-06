Feature: Sample e2e tests

    Scenario: E2E-001 TC-001 Execute example
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get stdout stream
        And host one process is stopped
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"

    Scenario: E2E-001 TC-002 Execute hello-alice-out
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/hello-alice-out.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get output stream long timeout
        And host one process is stopped
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"

Feature: Sample e2e tests

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-001 TC-001 Execute example
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get stdout stream
        And host one process is stopped
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"

    #added to ignore because this scenario is based on host-one
    @ignore
    Scenario: E2E-001 TC-002 Execute hello-alice-out
        Given file "data.json" exists on hard drive
        When host one execute sequence in background "../packages/samples/hello-alice-out.tar.gz" with arguments "/package/data.json output.txt"
        And host one process is working
        Then get output stream long timeout
        And host one process is stopped
        And response in each line contains "Hello " followed by name from file "data.json" finished by "!"

    Scenario: E2E-001 TC-003 Execute hello-alice-out example for host
        Given host started
        And wait for "1000" ms
        And host process is working
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And wait for "4000" ms
        # And instance started with arguments "/package/data.json"
        # And wait for "2000" ms
        # And get "output" in background with instanceId
        # And response in every line contains "Hello " followed by name from file "data.json" finished by "!"

Feature: Sample e2e tests

    @ci
    Scenario: E2E-001 TC-001 Execute hello-alice-out example for host
        Given host is running
        When sequence "../packages/samples/hello-alice-out.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And get "output" in background with instanceId
        And get instance health
        And get containerId
        And instance health is "true"
        And wait for "2000" ms
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        # And get status
        And instance health is "true"
        And delete sequence and volumes
        And confirm that sequence and volumes are removed
        And container is closed
        Then host is still running

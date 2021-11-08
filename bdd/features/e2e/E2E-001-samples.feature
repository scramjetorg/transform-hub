Feature: Sample e2e tests

    Scenario: E2E-001 TC-001 Execute hello-alice-out example for host
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And get "output" in background with instanceId
        And wait for instance healthy is "true"
        And get containerId
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-001 TC-002 API test - Get instance output
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And get "output" in background with instanceId
        And wait for instance healthy is "true"
        And get containerId
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        And send kill message to instance
        And wait for "2000" ms
        And delete sequence and volumes
        And confirm that sequence and volumes are removed
        Then container is closed
        And host is still running

    Scenario: E2E-001 TC-003 - KM5_Cloud Server Instance Component
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started with arguments "/package/data.json"
        And get "output" in background with instanceId
        And wait for instance healthy is "true"
        And get containerId
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        And send kill message to instance
        And wait for "2000" ms
        And delete sequence and volumes
        And confirm that sequence and volumes are removed
        And container is closed
        Then host is still running

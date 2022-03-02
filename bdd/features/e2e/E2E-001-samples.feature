Feature: Sample e2e tests

    @ci
    Scenario: E2E-001 TC-002 API test - Get instance output
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started
        And get "output" with instanceId and wait for it to finish
        And wait for instance healthy is "true"
        And get runner PID
        When response in every line contains "Hello " followed by name from file "data.json" finished by "!"
        And send kill message to instance
        And wait for "12000" ms
        And delete sequence and volumes
        And confirm that sequence and volumes are removed
        Then runner has ended execution
        And host is still running

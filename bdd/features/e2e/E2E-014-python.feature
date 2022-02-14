Feature: Test our shiny new Python runner

    @python
    Scenario: E2E-014 TC-001 Run simple python sequence with input and output
        Given host is running
        When sequence "../python-hello.tar.gz" loaded
        And instance started
        And send "python runner" to input
        Then "output" is "Hello python runner!"
        And host is still running

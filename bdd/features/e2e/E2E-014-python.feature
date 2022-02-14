Feature: Test our shiny new Python runner

    @python
    Scenario: E2E-014 TC-001 Run simple python sequence with input and output
        Given host is running
        When sequence "../python-hello.tar.gz" loaded
        And instance started
        And send "python runner" to input
        Then "output" is "Hello python runner!"
        And host is still running

    @python
    Scenario: E2E-014 TC-002 Python sequences can use stdin and stdout
        Given host is running
        When sequence "../python-stdinout.tar.gz" loaded
        And instance started
        And send "python runner" to stdin
        Then "stdout" is "Got on stdin: python runner"
        And host is still running

    @python
    Scenario: E2E-014 TC-003 Exceptions thrown in python sequences appear in stderr
        Given host is running
        When sequence "../python-exception-test.tar.gz" loaded
        And instance started
        Then "stderr" contains "TestException: This exception should appear on stderr"
        And host is still running

    @python
    Scenario: E2E-014 TC-004 Arguments can be passed to Python sequences
        Given host is running
        When sequence "../python-debug-args.tar.gz" loaded
        And instance started with arguments "foo 3 4 bar"
        Then "output" is "{'named_arg': 'foo', 'wildcard_args': ('3', '4', 'bar')}"
        And host is still running

    @python
    Scenario: E2E-014 TC-005 Python sequences can be killed
        Given host is running
        When sequence "../python-forever.tar.gz" loaded
        And instance started
        And get runner PID
        And send kill message to instance
        Then runner has ended execution
        And host is still running

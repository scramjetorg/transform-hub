Feature: Test our shiny new Python runner

    @ci @python
    Scenario: E2E-014 TC-001 Run simple python sequence with input and output
        Given host is running
        When sequence "../python/reference-apps/python-hello.tar.gz" loaded
        And instance started
        And send "python runner" to input
        Then "output" is "Hello python runner!"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-002 Python sequences can use stdin and stdout
        Given host is running
        When sequence "../python/reference-apps/python-stdinout.tar.gz" loaded
        And instance started
        And send "python runner" to stdin
        Then "stdout" is "Got on stdin: python runner"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-003 Exceptions thrown in python sequences appear in stderr
        Given host is running
        When sequence "../python/reference-apps/python-exception-test.tar.gz" loaded
        And instance started
        Then "stderr" contains "TestException: This exception should appear on stderr"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-004 Arguments can be passed to Python sequences
        Given host is running
        When sequence "../python/reference-apps/python-debug-args.tar.gz" loaded
        And instance started with arguments "foo 3 4 bar"
        Then "output" is "{'named_arg': 'foo', 'wildcard_args': ('3', '4', 'bar')}"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-005 Python sequences can be killed
        Given host is running
        When sequence "../python/reference-apps/python-forever.tar.gz" loaded
        And instance started
        And get runner PID
        And send kill message to instance
        Then runner has ended execution
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-006 Text input is decoded and split into lines
        Input contains multibyte chars which should be counted as 1 letter each.
        Given host is running
        When sequence "../python/reference-apps/python-chunk-lengths.tar.gz" loaded
        And instance started
        And send file "../python/test/sample_unicode_1.txt" as text input
        Then "output" is "4,8,5,"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-007 Binary input is not decoded and not split into lines
        Input contains multibyte chars; each byte should be counted separately.
        Given host is running
        When sequence "../python/reference-apps/python-chunk-lengths.tar.gz" loaded
        And instance started
        And send file "../python/test/sample_unicode_1.txt" as binary input
        Then "output" is "20,"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-008 Instance can run stop handler before it shuts down
        Given host is running
        When sequence "../python/reference-apps/python-stop-handler.tar.gz" loaded
        And instance started
        And get runner PID
        And keep instance streams "stdout"
        And send stop with timeout 2000
        Then runner has ended execution
        And kept instance stream "stdout" should be "Cleaning up... Cleanup done.\n"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-009 Instance by default reports as healthy
        Given host is running
        When sequence "../python/reference-apps/python-forever.tar.gz" loaded
        And instance started
        Then instance health is "true"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-010 User can override health check method
        Given host is running
        When sequence "../python/reference-apps/python-unhealthy-sequence.tar.gz" loaded
        And instance started
        Then instance health is "false"
        And host is still running


    @ci @python
    Scenario: E2E-014 TC-011 Send data between python instances using topics
        Given host is running
        When sequence "../python/reference-apps/python-topic-producer.tar.gz" loaded
        And instance started
        And send "topic test input" to input
        And sequence "../python/reference-apps/python-topic-consumer.tar.gz" loaded
        And instance started
        Then "output" is "consumer got: producer got: topic test input"
        And host is still running

    @ci @python
    Scenario: E2E-014 TC-012 Sequence can receive and emit events
        Given host is running
        When sequence "../python/reference-apps/python-events.tar.gz" loaded
        And instance started
        And send event "test-event" to instance with message "foo"
        Then instance emits event "test-response" with body
            """
            {"eventName":"test-response","message":"reply to foo"}
            """
        And host is still running

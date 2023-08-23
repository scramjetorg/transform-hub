Feature: Test our shiny new Python runner

    @ci-unified
    Scenario: E2E-015 TC-001 Run simple sequence with input and output
        Given host is running
        When find and upload sequence "hello.tar.gz"
        And instance started
        And send "python runner" to input
        And wait for "100" ms
        Then "output" is "Hello python runner!"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-002 Sequences can use stdin and stdout
        Given host is running
        When find and upload sequence "stdinout.tar.gz"
        And instance started
        And send "python runner" to stdin
        And wait for "100" ms        
        Then "stdout" is "Got on stdin: python runner"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-004 Arguments can be passed to sequences
        Given host is running
        When find and upload sequence "debug-args.tar.gz"
        And instance started with arguments "foo 3"
        Then "output" is "{\"first_arg\":\"foo\",\"second_arg\":\"3\"}"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-005 Sequences can be killed
        Given host is running
        When find and upload sequence "forever.tar.gz"
        And instance started
        And get runner PID
        And send kill message to instance
        Then runner has ended execution
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-008 Instance can run stop handler before it shuts down
        Given host is running
        When find and upload sequence "stop-handler.tar.gz"
        And instance started
        And get runner PID
        And keep instance streams "stdout"
        And send stop message to instance with arguments timeout 2000 and canCallKeepAlive "false"
        Then runner has ended execution
        And kept instance stream "stdout" should be "Cleaning up... Cleanup done.\n"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-009 Instance by default reports as healthy
        Given host is running
        When find and upload sequence "forever.tar.gz"
        And instance started
        Then instance health is "true"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-011 Send data between instances using topics
        Given host is running
        When find and upload sequence "topic-producer.tar.gz"
        And instance started
        And send "topic test input" to input
        And wait for "100" ms
        And find and upload sequence "topic-consumer.tar.gz"
        And instance started
        Then "output" will be data named "python-topics"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-012 Sequence can receive and emit events
        Given host is running
        When find and upload sequence "events.tar.gz"
        And instance started
        And send event "test-event" to instance with message "foo"
        And wait for "100" ms
        Then instance emits event "test-response" with body
            """
            {"eventName":"test-response","message":"reply to foo"}
            """
        And host is still running

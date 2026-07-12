Feature: Test our shiny new Python runner

    @ci-unified
    Scenario: E2E-015 TC-001 Run simple sequence with input and output
        Given host is running
        When sequence "data/sequences/python-bdd-packages/python-bdd-unified-simple.tar.gz" loaded
        And instance started
        And send "python runner" to input
        Then "output" is "Hello python runner!"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-005 Sequences can be killed
        Given host is running
        When sequence "data/sequences/python-bdd-packages/python-bdd-unified-forever.tar.gz" loaded
        And instance started
        And get runner PID
        And send kill message to instance
        Then runner has ended execution
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-008 Instance can run stop handler before it shuts down
        Given host is running
        When sequence "data/sequences/python-bdd-packages/python-bdd-unified-stop-handler.tar.gz" loaded
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
        When sequence "data/sequences/python-bdd-packages/python-bdd-unified-forever.tar.gz" loaded
        And instance started
        Then instance health is "true"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-011 Send data between instances using topics
        Given host is running
        When sequence "data/sequences/python-bdd-packages/python-bdd-topic-producer.tar.gz" loaded
        And instance started
        And send "topic test input" to input
        And sequence "data/sequences/python-bdd-packages/python-bdd-topic-consumer.tar.gz" loaded
        And instance started
        Then "output" will be data named "python-topics"
        And host is still running

    @ci-unified
    Scenario: E2E-015 TC-012 Sequence can receive and emit events
        Given host is running
        When sequence "data/sequences/python-bdd-packages/python-bdd-unified-events.tar.gz" loaded
        And instance started
        And send event "test-event" to instance with message "foo"
        Then instance emits event "test-response" with body
            """
            "reply to foo"
            """
        And host is still running

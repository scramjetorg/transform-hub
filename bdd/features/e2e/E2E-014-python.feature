Feature: Test our shiny new Python runner

    @ci-instance-python
    Scenario: E2E-014 TC-003 Exceptions thrown in python sequences appear in stderr
        Given host is running
        When sequence "../packages/reference-apps/python-exception-test.tar.gz" loaded
        And instance started
        Then "stderr" contains "TestException: This exception should appear on stderr"
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-006 Text input is decoded and split into lines
        Input contains multibyte chars which should be counted as 1 letter each.
        Given host is running
        When sequence "../packages/reference-apps/python-chunk-lengths.tar.gz" loaded
        And instance started
        And send file "data/test-data/sample_unicode_1.txt" as text input
        Then "output" is "4,8,5,"
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-007 Binary input is not decoded and not split into lines
        Input contains multibyte chars; each byte should be counted separately.
        Given host is running
        When sequence "../packages/reference-apps/python-chunk-lengths.tar.gz" loaded
        And instance started
        And send file "data/test-data/sample_unicode_1.txt" as binary input
        Then "output" is "20,"
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-010 User can override health check method
        Given host is running
        When sequence "../packages/reference-apps/python-unhealthy-sequence.tar.gz" loaded
        And instance started
        Then instance health is "false"
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-013 Logger in context can log in instance
        Given host is running
        When sequence "../packages/reference-apps/python-logs-test.tar.gz" loaded
        And instance started
        Then "log" contains "Debug log message"
        And send kill message to instance
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-014 Rename topic output and input
        Given host is running
        Then I set json format
        Then I set apiUrl in config
        When I execute CLI with "seq send ../packages/reference-apps/python-topic-producer.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--output-topic names3"
        Then I send input data "topic test input" with options "--end"
        When I execute CLI with "seq send ../packages/reference-apps/python-topic-consumer.tar.gz" arguments
        Then I get Sequence id
        Then I start Sequence with options "--input-topic names3"
        And I get Instance output without waiting for the end
        Then confirm data named "python-topics" will be received
        And host is still running

    @ci-instance-python
    Scenario: E2E-014 TC-015 Create Stream from async generator
        Given host is running
        When sequence "../packages/reference-apps/python-gen-async.tar.gz" loaded
        And instance started
        And send "1" to input
        Then "output" is "saved to db: 1"
        And host is still running

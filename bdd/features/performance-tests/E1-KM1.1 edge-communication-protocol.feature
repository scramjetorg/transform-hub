Feature: KM1.1: Communication protocol - EDGE

RUNTIME_ADAPTER=process SCRAMJET_TEST_LOG=1 DEVELOPMENT=1 yarn test:bdd --tags="@edge"

    Background: Prepare environment
        Given I set config for local Hub

    @edge
    Scenario: E1-KM1.1 TC-001 Delay between runner and Hub
        When I execute CLI with "sequence send data/sequences/sequence-timestamps-consumer.tar.gz"
        And I get sequence id
        And I start sequence topic consumer 5 times
        When I execute CLI with "sequence send data/sequences/sequence-timestamp-producer.tar.gz"
        And I get sequence id
        And I start sequence topic producer 5 times
        And I execute CLI with "topic ls"
        And wait for "20000" ms
        And I execute CLI with "topic get diffs" without waiting for the end
        Then I confirm topic "diffs" received
        And wait for "2000" ms
        And calculate average from topic diffs
        # And confirm average delay time is lower than 0.1 ms


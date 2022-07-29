Feature: Instance lifecycle API behavior

    Background:
        Given host is running

    Scenario: Starting an instance
        Given sequence "hello" is available
        When SequenceClient.start is executed
        Then it should return an InstanceClient
        And instance status should be "starting"
        When instance starts producing output
        Then instance status should be "running"

    Scenario: Instance completes successfully
        Given instance "hello" is running
        When instance output is completed
        Then instance status should immediately change to "finishing"
        When wait until runner has ended execution
        Then instance status should immediately change to "completed"

    Scenario Outline: Interrupting an instance
        Given instance "hello" is running
        When InstanceClient's <method> is executed
        Then <method> request should resolve successfully
        And instance status should immediately change to <status in progress>
        When wait until runner has ended execution
        Then instance status should immediately change to <final status>

        Examples:
            | method | status in progess | final status |
            | stop   | stopping          | completed    |
            | kill   | killing           | errored      |

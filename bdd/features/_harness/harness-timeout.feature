@harness-selftest
Feature: BDD harness timeout guard

    Scenario: Harness watchdog terminates a hanging step
        Given I sleep for 999999 ms

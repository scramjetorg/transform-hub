Feature: CLI prune diagnostic

    This isolated diagnostic reproduces the CLI prune sequence without running
    the rest of E2E-010.

    @ci-api @cli @diagnostic-prune
    Scenario: E2E-010 prune diagnostic removes multiple uploaded Sequences
        Given I set config for local Hub
        When I execute CLI with "seq send data/sequences/bdd-packages/args-to-output.tar.gz"
        And I execute CLI with "seq send data/sequences/bdd-packages/args-to-output.tar.gz"
        And I execute CLI with "seq send data/sequences/bdd-packages/hello-output.tar.gz"
        And I execute CLI with "seq prune"
        Then I wait for "Sequence" list to be empty

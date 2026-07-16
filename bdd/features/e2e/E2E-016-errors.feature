Feature: Test error handling while sequence is uploaded

    @ci-instance-node
    Scenario: E2E-016 TC-001 Run errored sequence
        Given I set config for local Hub
        When I deploy sequence "data/sequences/missing-import"
        Then I should see error message: "Application Error Occurred"
        Then I should see exitCode: "1"

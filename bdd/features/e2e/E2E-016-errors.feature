Feature: Test error handling while sequence is uploaded

    @ci-unified
    Scenario: E2E-016 TC-001 Run errored sequence
        Given I set config for local Hub
		When I deploy sequence "data/sequences" "hello-bad.tar.gz"
        Then I should see error message: "Sequence entrypoint path app.js is invalid. Check `main` field in Sequence package.json"
        Then I should see exitCode: "1"
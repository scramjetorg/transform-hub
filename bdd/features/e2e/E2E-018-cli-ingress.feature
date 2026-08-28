@cli-ingress @ci-verser2
Feature: Real CLI ingress profiles
  The published CLI artifact uses only the selected isolated profile to reach
  a Verser2 control ingress. These journeys keep profile, certificate, port,
  and process state local to their ScenarioIsolation owner.

  Scenario: mTLS profiles select their ingress endpoint and preserve dispatch boundaries
    Given real CLI mTLS profiles for platform, Space, and Hub ingress
    When the real CLI uses the persisted platform profile for raw and named version requests
    And the real CLI uses the selected Space profile for raw and named version requests
    And the real CLI uses the selected Hub profile for raw and named version requests
    Then each mTLS ingress receives its two selected CLI requests
    When the real CLI attempts to traverse upstream from the Hub profile
    Then the real CLI exits with code 54
    And the Hub ingress receives no additional request
    When the real CLI uses a rejected mTLS credential
    Then the real CLI exits with one of codes "51,52,58"
    And the Space ingress receives no additional request
    When the real CLI uses a profile with a missing credential
    Then the real CLI exits with code 50
    And the Hub ingress receives no additional request

  Scenario: non-mTLS Hub ingress accepts the real CLI without a client certificate
    Given a real CLI non-mTLS Hub ingress profile
    When the real CLI uses the non-mTLS profile for raw and named version requests
    Then the non-mTLS Hub ingress receives two selected CLI requests
    When the real CLI attempts to traverse upstream from the non-mTLS Hub profile
    Then the real CLI exits with code 54
    And the non-mTLS Hub ingress receives no additional request

  Scenario: completion uses the isolated profile and leaves valid profile state
    When two real CLI completion commands run against isolated session storage
    Then both real CLI completion commands succeed
    And each completion output contains the bundled completion script
    And the isolated CLI profile state is valid JSON

  Scenario: real native ingress dispatches named and raw CLI commands without active requests
    Given a real CLI native ingress fixture profile
    When the real CLI sends raw and named version commands through the native ingress
    Then the native ingress records raw and named version dispatch
    And the native ingress has no active requests

  Scenario: real native ingress receives raw bodies, streams output, and maps API errors
    Given a real CLI native ingress fixture profile
    When the real CLI sends JSON and file raw API bodies through the native ingress
    Then the native ingress receives the JSON and file bodies
    When the real CLI streams a raw API response through the native ingress
    Then the real CLI output contains "streamed-output"
    When the real CLI receives a native API error response
    Then the real CLI exits with code 70
    And the native ingress has no active requests

  Scenario: real CLI maps SIGINT after native ingress request handoff
    Given a real CLI native ingress fixture profile
    When the real CLI is interrupted during a native ingress request
    Then the real CLI exits with code 60
    And the native ingress releases the interrupted request

  Scenario: real CLI preserves legacy HTTP v1 profile fallback
    Given a real CLI legacy HTTP profile fixture
    When the real CLI requests the Hub version through the legacy profile
    Then the real CLI exits with code 0
    And the legacy HTTP fixture receives one request

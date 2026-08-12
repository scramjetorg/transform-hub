@phase2 @ci-verser2
Feature: Control-plane admission and enrollment
  These isolated journeys exercise the production Host and Manager control
  ingresses through externally connected mTLS brokers and use published CSR
  enrollment command artifacts.

  @manager-ingress
  Scenario: Host control ingress admits an allowlisted certificate and rejects another trusted certificate
    Given an isolated real Host control ingress with an allowed client fingerprint
    When an external allowed mTLS broker requests the Host control route
    Then the Host control route responds with its v2 identity
    And an external rejected mTLS broker cannot connect to the Host control ingress

  @manager-ingress
  Scenario: Manager control ingress applies fingerprint trust to external brokers
    Given an isolated real Manager control ingress with an allowed client fingerprint
    When an external allowed mTLS broker requests the Manager control route
    Then the Manager control route responds with its v2 identity
    And an external rejected mTLS broker cannot connect to the Manager control ingress

  @manager-ingress
  Scenario: An external mTLS broker reaches a Hub-owned route through a production Manager
    Given an isolated production Manager control ingress with a routed Hub guest
    When an external allowed mTLS broker requests the routed Hub version
    Then the routed Hub version response is served through the Manager ingress

  @manager-ingress
  Scenario: A production Manager releases its control ingress after local broker startup fails
    Given an isolated production Manager whose control ingress local broker attachment fails
    Then the failed Manager control ingress releases its listener

  @manager-ingress
  Scenario: A production Manager control ingress and Hub runner listener use separate ports
    Given an isolated production Manager control ingress and Hub runner listener
    Then the Manager ingress and Hub runner listener bind without a port collision

  @csr-enrollment
  Scenario: CSR enrollment command artifacts generate, approve, and redeem a Hub certificate
    Given isolated CSR enrollment artifacts backed by a production Manager enrollment server
    When the CSR enrollment command artifacts generate, approve, and redeem a Hub request
    Then the Hub enrollment certificate is installed with the pinned Manager CA

  @csr-enrollment
  Scenario: CSR enrollment command artifacts render safe failures without protected operands
    When the Manager CSR enrollment artifact receives an unknown protected option
    Then the CSR enrollment artifact reports a safe usage error
    When the Hub CSR enrollment artifact has an operational failure
    Then the CSR enrollment artifact reports a generic operational error

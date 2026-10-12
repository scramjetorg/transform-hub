@hub-event-watch @hub-event-watch-preheaders
Feature: Hosted Hub event-watch cancellation before response headers
  The hosted caller must be able to cancel its real routed request while the relay
  withholds actual Host response headers, without disturbing the multiplexed Agent.

  Scenario: Abort and repeated close release only the selected opening watch
    Given an isolated built Hub and actual native relay for pre-header cancellation
    When the hosted observer aborts and closes real watches while origin headers are held
    Then each pre-header cancellation releases only its request and preserves the same control Agent

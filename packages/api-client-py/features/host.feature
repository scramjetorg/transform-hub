Feature: Python Host-Client BDD tests

  @ci
  Scenario: List instances on host
    Given host is running
    When asked for instances
    Then host is still running
  
  @ci
  Scenario: List sequences on host
    Given host is running
    When asked for sequences
    Then host is still running

  @ci
  Scenario: Give version from host
    Given host is running
    When asked for version
    Then returns response with version
    Then host is still running
  
  @ci
  Scenario: Send sequence to host
    Given host is running
    When sequence ../../python/reference-apps/python-alice.tar.gz loaded
    Then returns response with id
    Then host is still running
  
  @ci
  Scenario: Get sequence from host
    Given host is running
    When sequence ../../python/reference-apps/python-alice.tar.gz loaded
    When - sequence get
    Then returns response with id
    Then host is still running

  @ci 
  Scenario: Delete sequence from host
    Given host is running
    When sequence ../../python/reference-apps/python-alice.tar.gz loaded
    When - sequence removed
    Then returns response with opStatus == OK
    Then host is still running

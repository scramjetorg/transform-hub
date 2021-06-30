Feature: Host configuration

    Scenario: H-001 TC-001 Set host port (short param)
        When hub process is started with parameters "-P 9001"
        Then API is available on port 9001
        * exit hub process

    Scenario: H-001 TC-002 Set host port (--port)
        When hub process is started with parameters "--port 9001"
        Then API is available on port 9001
        * exit hub process

    Scenario: H-001 TC-003 Set host port (short param)
        When hub process is started with parameters "-P 19001"
        Then API is available on port 19001
        * exit hub process

    Scenario: H-001 TC-003 Set host port (--port)
        When hub process is started with parameters "--port 19001"
        Then API is available on port 19001
        * exit hub process


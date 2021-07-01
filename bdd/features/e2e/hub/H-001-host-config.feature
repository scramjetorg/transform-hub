Feature: Host configuration

    @starts-host
    Scenario: HUB-001 TC-001 Set host port (-P)
        When hub process is started with parameters "-P 9001"
        Then API is available on port 9001
        * exit hub process

    @starts-host
    Scenario: HUB-001 TC-002 Set host port (--port)
        When hub process is started with parameters "--port 9001"
        Then API is available on port 9001
        * exit hub process

    @starts-host
    Scenario: HUB-001 TC-003 Set host port (-P)
        When hub process is started with parameters "-P 19001"
        Then API is available on port 19001
        * exit hub process

    @starts-host
    Scenario: HUB-001 TC-004 Set host port (--port)
        When hub process is started with parameters "--port 19001"
        Then API is available on port 19001
        * exit hub process

    @starts-host
    Scenario: HUB-001 TC-005 Set SocketServer path (-S)
        When hub process is started with parameters "-S /tmp/test-socket-S"
        Then SocketServer starts on "/tmp/test-socket-S"
        * exit hub process

    @starts-host
    Scenario: HUB-001 TC-006  Set SocketServer path (--socket-path)
        When hub process is started with parameters "--socket-path /tmp/test-socket"
        Then SocketServer starts on "/tmp/test-socket"
        * exit hub process

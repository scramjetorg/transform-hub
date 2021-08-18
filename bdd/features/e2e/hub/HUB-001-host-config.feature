Feature: Host configuration

    @ci @starts-host
    Scenario: HUB-001 TC-001 Set host port (-P)
        When hub process is started with parameters "-P 9001"
        Then API is available on port 9001
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-002 Set host port (--port)
        When hub process is started with parameters "--port 9001"
        Then API is available on port 9001
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-003 Set host port (-P)
        When hub process is started with parameters "-P 19001"
        Then API is available on port 19001
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-004 Set host port (--port)
        When hub process is started with parameters "--port 19001"
        Then API is available on port 19001
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-005 Set SocketServer path (-S)
        When hub process is started with parameters "-S /tmp/test-socket-S"
        Then SocketServer starts on "/tmp/test-socket-S"
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-006  Set SocketServer path (--socket-path)
        When hub process is started with parameters "--socket-path /tmp/test-socket"
        Then SocketServer starts on "/tmp/test-socket"
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-007  Set API server name (--hostname)
        When hub process is started with parameters "--hostname 0.0.0.0"
        Then API starts with "0.0.0.0" server name
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-008  Set API server name (-H)
        When hub process is started with parameters "-H 0.0.0.0"
        Then API starts with "0.0.0.0" server name
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-009  Set runner image (--runner-image)
        When hub process is started with parameters "--runner-image scramjetorg/runner:0.10.7"
        And sequence "../packages/reference-apps/inert-function.tar.gz" is loaded
        And instance started with arguments "/package/data.json"
        And get runner container information
        Then container uses "scramjetorg/runner:0.10.7" image
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-010  Default runner image
        When hub process is started with parameters "''"
        And sequence "../packages/reference-apps/inert-function.tar.gz" is loaded
        And instance started with arguments "/package/data.json"
        And wait for "2000" ms
        And get runner container information
        Then container uses image defined in sth-config
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-011  Set runner memory limit (--runner-max-mem)
        When hub process is started with parameters "--runner-max-mem 128"
        And sequence "../packages/reference-apps/hello-alice-out.tar.gz" is loaded
        And instance started with arguments "/package/data.json"
        And wait for "2000" ms
        And get runner container information
        Then container memory limit is 128
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-012  Set prerunner image (--prerunner-image)
        When hub process is started with parameters "--prerunner-image scramjetorg/pre-runner:0.10.7"
        And get all containers
        And send fake stream as sequence
        And wait for "10000" ms
        And get last container info
        And last container uses "scramjetorg/pre-runner:0.10.7" image
        And end fake stream
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-013  Set prerunner memory limit (--prerunner-max-mem)
        When hub process is started with parameters "--prerunner-max-mem 64"
        And get all containers
        And send fake stream as sequence
        And wait for "20000" ms
        And get last container info
        Then last container memory limit is 64
        And end fake stream
        * exit hub process



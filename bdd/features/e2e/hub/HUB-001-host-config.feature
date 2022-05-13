Feature: HUB-001 Host configuration

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
    Scenario: HUB-001 TC-007  Set API server name (--hostname)
        When hub process is started with parameters "--hostname 0.0.0.0 -P 9001"
        Then API starts with "0.0.0.0:9001" server name
        * exit hub process

    @ci @starts-host
    Scenario: HUB-001 TC-008  Set API server name (-H)
        When hub process is started with parameters "-H 0.0.0.0 -P 9001"
        Then API starts with "0.0.0.0:9001" server name
        * exit hub process

    @ci @starts-host @docker-specific
    Scenario: HUB-001 TC-010  Default runner image for js/ts sequences
        When hub process is started with random ports and parameters "-P 8000"
        And sequence "../packages/reference-apps/inert-function.tar.gz" is loaded
        And instance started
        And get runner container information
        Then container uses node image defined in sth-config
        * exit hub process

    @ci @starts-host @docker-specific
    Scenario: HUB-001 TC-011  Set runner memory limit (--runner-max-mem)
        When hub process is started with random ports and parameters "-P 8000 --runner-max-mem 128"
        And sequence "../packages/reference-apps/hello-alice-out.tar.gz" is loaded
        And instance started
        And get runner container information
        Then container memory limit is 128
        * exit hub process

    @ci @starts-host @docker-specific
    Scenario: HUB-001 TC-013  Set prerunner memory limit (--prerunner-max-mem)
        When hub process is started with random ports and parameters "-P 8000 --prerunner-max-mem 64"
        And get all containers
        And send fake stream as sequence
        And get last container info
        Then last container memory limit is 64
        And end fake stream
        * exit hub process



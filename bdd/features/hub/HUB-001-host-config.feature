Feature: HUB-001 Host configuration

    @ci-hub @starts-host
    Scenario: HUB-001 TC-001 Set host port (-P)
        When hub process is started with parameters "-P 9001 --instances-server-port 19001"
        Then API is available on port 9001
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-002 Set host port (--port)
        When hub process is started with parameters "--port 9001 --instances-server-port 19001"
        Then API is available on port 9001
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-007  Set API server name (--hostname)
        When hub process is started with parameters "--hostname 0.0.0.0 -P 9001 --instances-server-port 19001"
        Then API starts with "0.0.0.0:9001" server name
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-008  Set API server name (-H)
        When hub process is started with parameters "-H 0.0.0.0 -P 9001 --instances-server-port 19001"
        Then API starts with "0.0.0.0:9001" server name
        * exit hub process

    # Needs to be fixed.
    @starts-host @docker-specific @needs-fix @slow
    Scenario: HUB-001 TC-009  Set runner image (--runner-image)
        When hub process is started with parameters "-P 9002 --instances-server-port 19002 --runner-image repo.int.scp.ovh/scramjet/runner:0.10.0-pre.7"
        And sequence "data/sequences/bdd-packages/js-inert-function.tar.gz" is loaded
        And instance started
        And get runner container information
        Then container uses "repo.int.scp.ovh/scramjet/runner:0.10.0-pre.7" image
        * exit hub process

    # Needs to be fixed.
    @starts-host @docker-specific @needs-fix @slow
    Scenario: HUB-001 TC-010  Default runner image for js/ts sequences
        When hub process is started with parameters "-P 9002 --instances-server-port 19002"
        And sequence "data/sequences/bdd-packages/js-inert-function.tar.gz" is loaded
        And instance started
        And get runner container information
        Then container uses node image defined in sth-config
        * exit hub process

    # Needs to be fixed.
    @starts-host @docker-specific @needs-fix @slow
    Scenario: HUB-001 TC-011  Set runner memory limit (--runner-max-mem)
        When hub process is started with random ports and parameters "--runner-max-mem 128"
        And sequence "../packages/hello-alice-out.tar.gz" is loaded
        And instance started
        And get runner container information
        Then container memory limit is 128
        * exit hub process

    @ci-hub @starts-host @docker-specific @requires-docker @slow
    Scenario: HUB-001 TC-012  Set prerunner image (--prerunner-image)
        When hub process is started with random ports and parameters "--prerunner-image repo.int.scp.ovh/scramjet/pre-runner:0.10.0-pre.7"
        And get all containers
        And send fake stream as sequence
        And get last container info
        And last container uses "repo.int.scp.ovh/scramjet/pre-runner:0.10.0-pre.7" image
        And end fake stream
        * exit hub process

    @ci-hub @starts-host @docker-specific @requires-docker @slow
    Scenario: HUB-001 TC-013  Set prerunner memory limit (--prerunner-max-mem)
        When hub process is started with random ports and parameters "--prerunner-max-mem 64"
        And get all containers
        And send fake stream as sequence
        And get last container info
        Then last container memory limit is 64
        And end fake stream
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-014 Use YAML config with port
        When hub process is started with port changing parameters "--config data/test-data/sth-config.yml"
        Then API is available on port 9078
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-015 Use JSON config with port
        When hub process is started with port changing parameters "--config data/test-data/sth-config.json"
        Then API is available on port 9079
        * exit hub process

    @ci-hub @starts-host
    Scenario: HUB-001 TC-016 Scenario Hub runner port collision is handled
        # Occupy the default runner verser2 port 2444 to simulate the suite
        # host's runner listener. The Hub harness must dynamically allocate a
        # free runner host port (not inherit 2444) to survive.
        When port 2444 is occupied
        When hub process is started with random ports and parameters ""
        Then host is running
        * exit hub process

        # Release the occupied port and verify a clean start under dynamic
        # runner port allocation.
        When the occupied port is released
        When hub process is started with random ports and parameters ""
        Then host is running
        * exit hub process

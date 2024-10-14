Feature: Stop e2e tests

    @ci-instance-node
    Scenario: E2E-002 TC-001 API test - Send stop, sequence sends keepAlive, runner closes successfully
        Given host is running
        When sequence "../refapps/can-keep-alive.tar.gz" loaded
        And instance started with arguments "SEND_KEEPALIVE"
        And wait for instance healthy is "true"
        And get runner PID
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for instance healthy is "true"
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for instance healthy is "true"
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And runner has ended execution
        Then host is still running

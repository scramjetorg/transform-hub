Feature: Stop e2e tests

    @ci
    Scenario: E2E-002 TC-001 API test - Send stop, sequence sends keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments "SEND_KEEPALIVE"
        And wait for instance healthy is "true"
        And get containerId
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for instance healthy is "true"
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for instance healthy is "true"
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-002 TC-002 API test - Send stop, sequence doesn't send keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments ""
        And wait for instance healthy is "true"
        And get containerId
        And send stop message to instance with arguments timeout 2000 and canCallKeepAlive "true"
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-002 TC-003 API test - Send stop, sequence send keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments "SEND_KEEPALIVE"
        And wait for instance healthy is "true"
        And get containerId
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And container is closed
        Then host is still running

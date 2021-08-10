Feature: Stop e2e tests

    @ci
    Scenario: E2E-002 TC-001 Send stop, sequence sends keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments "SEND_KEEPALIVE"
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for "3000" ms
        And get instance health
        And instance health is "true"
        And send stop message to instance with arguments timeout 5000 and canCallKeepAlive "true"
        And wait for "3000" ms
        And get instance health
        And instance health is "true"
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And wait for "2000" ms
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-002 TC-002 Send stop, sequence doesn't send keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments ""
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And send stop message to instance with arguments timeout 2000 and canCallKeepAlive "true"
        And wait for "5000" ms
        And container is closed
        Then host is still running

    @ci
    Scenario: E2E-002 TC-003 Send stop, sequence send keepAlive
        Given host is running
        When sequence "../packages/reference-apps/can-keep-alive.tar.gz" loaded
        And instance started with arguments "SEND_KEEPALIVE"
        And wait for "4000" ms
        And get instance health
        And get containerId
        And instance health is "true"
        And send stop message to instance with arguments timeout 0 and canCallKeepAlive "false"
        And wait for "4000" ms
        And container is closed
        Then host is still running

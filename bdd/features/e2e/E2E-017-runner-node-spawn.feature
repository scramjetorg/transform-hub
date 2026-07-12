Feature: Runner-node spawn-isolation regression coverage

    # These scenarios exercise the corrected spawn-pipes runner-node design
    # (see .omo/plans/runner-worker-isolation.md, Wave 5). They are additive,
    # use only @scramjet/runner via the host's process runtime adapter, and
    # do not depend on the Wave 4 outer-runner rewiring of
    # packages/runner/src/bin/start-runner.ts. Until that rewiring lands,
    # these scenarios are acceptance/regression definitions whose --name
    # selectors must remain stable.

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-001 Node sequence completes successfully under runner-node spawn isolation
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-runner-node-completes.json --runtime-adapter=process"
        Then host is running
        And stable instance name "node-completes-instance" becomes available
        And I use instance client for stable name "node-completes-instance"
        And keep instance streams "stdout"
        And get runner PID
        And runner has ended execution
        Then kept instance stream "stdout" should be "NODE_COMPLETES_OK\n"
        And host is still running

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-002 Sequence stdout bytes arrive before SEQUENCE_STOPPED
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-runner-node-throw.json --runtime-adapter=process"
        Then host is running
        And stable instance name "throw-after-stdout-instance" becomes available
        And I use instance client for stable name "throw-after-stdout-instance"
        And keep instance streams "stdout"
        And get runner PID
        And runner has ended execution
        Then kept instance stream "stdout" should be "STDOUT_BEFORE_THROW\n"
        And host is still running

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-003 Exposed sequence API streams response chunks
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-runner-node-api.json --runtime-adapter=process"
        Then host is running
        And stable instance name "api-streaming-instance" becomes available
        And I use instance client for stable name "api-streaming-instance"
        And wait for instance healthy is "true"
        When I send a "GET" streaming request to "/rpc/streaming/stream-out" and collect response chunks
        Then the response status should be 200
        And I observe at least 2 streaming response chunks
        And the streamed response body contains "chunk-0"
        And the streamed response body contains "chunk-3"
        And host is still running

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-004 Exposed sequence API request body streams into the handler
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-runner-node-api.json --runtime-adapter=process"
        Then host is running
        And stable instance name "api-streaming-instance" becomes available
        And I use instance client for stable name "api-streaming-instance"
        And wait for instance healthy is "true"
        When I send a "POST" streaming request to "/rpc/streaming/stream-in" with 4 body chunks of "part-" every 1000 ms
        Then the response status should be 200
        And the response body reports at least 2 request body chunks
        And host is still running

    @ci-runner-node @slow
    Scenario: E2E-017 TC-005 STOP with keepAlive matches current behaviour under runner-node spawn isolation
        Given host is running
        When sequence "data/sequences/bdd-packages/can-keep-alive.tar.gz" loaded
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

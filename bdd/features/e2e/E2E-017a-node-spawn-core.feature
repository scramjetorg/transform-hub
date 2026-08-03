Feature: Runner-node spawn-isolation core coverage

    # These scenarios exercise the corrected spawn-pipes runner-node design.
    # They are additive and use only @scramjet/runner via the host's process
    # runtime adapter. Their --name selectors remain stable.

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

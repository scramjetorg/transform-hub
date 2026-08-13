Feature: Runner-node spawn-isolation core coverage

    # These scenarios exercise the corrected spawn-pipes runner-node design.
    # They are additive and use only @scramjet/runner via the host's process
    # runtime adapter. Their --name selectors remain stable.

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-001 Node runner completes through the Host process adapter
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-runner-node-completes.json --runtime-adapter=process"
        Then host is running
        And stable instance name "node-completes-instance" becomes available
        And I use instance client for stable name "node-completes-instance"
        And get runner PID
        And runner has ended execution
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
        And hub logs should contain "STH runtime error" within 10000 ms
        And hub logs should contain "phase=instance-runtime" within 10000 ms
        And hub logs should contain "sequenceId=throw-after-stdout" within 10000 ms
        And hub logs should contain "intentional throw after stdout" within 10000 ms
        And host is still running

    @ci-runner-node @starts-host @slow
    Scenario: E2E-017 TC-006 Missing Node import is diagnosed through the Host process adapter
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When starting Instance by name "missing-import" fails
        Then hub logs should contain "STH runtime error" within 10000 ms
        And hub logs should contain "phase=runner-connect" within 10000 ms
        And hub logs should contain "sequenceId=missing-import" within 10000 ms
        And hub logs should contain "Cannot find module" within 10000 ms
        And host is still running

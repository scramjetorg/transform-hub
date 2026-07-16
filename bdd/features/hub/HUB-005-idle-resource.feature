Feature: HUB-005 Hub idle resource usage

    @ci-hub @starts-host @slow
    Scenario: HUB-005 TC-001 Hub idle CPU and memory stay stable as sequence timeout grows
        When hub process is started with random ports and startup sequence timeout 2000 ms and parameters "--sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-exit.json --runtime-adapter=process -X"
        Then host is running
        And I capture Hub CPU and memory until it exits as "2-second"
        When hub process is started with random ports and startup sequence timeout 10000 ms and parameters "--sequences-root data/sequences/ --identify-existing --startup-config data/sample-config-exit.json --runtime-adapter=process -X"
        Then host is running
        And I capture Hub CPU and memory until it exits as "10-second"
        Then 10-second baseline-normalized idle CPU rate is at most 5 percent per second
        And 10-second Hub peak RSS is at most 5 percent above the 2-second baseline

Feature: HUB-004 STH runtime error logging

    @ci-hub @starts-host @sth-logging @slow
    Scenario: HUB-004 TC-003 Invalid startup parameters are visible in STH logs
        When hub process is started with random ports and parameters "--instance-lifetime-extension-delay 100 -K --sequences-root data/sequences/ --identify-existing --runtime-adapter=process"
        Then host is running
        When start Instance by name "params-validator" with JSON arguments '["not-an-object"]'
        Then hub logs should contain "STH runtime error" within 10000 ms
        And hub logs should contain "phase=instance-runtime" within 10000 ms
        And hub logs should contain "sequenceId=params-validator" within 10000 ms
        And hub logs should contain "INVALID_PARAMS expected first argument to be an object with requiredName string" within 10000 ms
        * exit hub process

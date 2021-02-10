Feature: Mock runner tests.

    Scenario: After sending ping, mock runner replies with pong.
        Given mock runner is running
        When message "[4000,{}]" is sent
        Then message "[3000,{}]" is received

    Scenario: Mock runner confirms receiving correct reguest.
        Given mock runner is running
        When message "[3010,{}]" is sent
        Then message "[3004,{\"received\":3010}]" is received
    
    Scenario: Mock runner recognizes incorrect messages.
        Given mock runner is running
        When message "incorrect" is sent
        Then message "[3004,{\"received\":\"unknown message\"}]" is received

    Scenario: Mock runner stops running after sending kill message.
        Given mock runner is running
        When message "[4002,{}]" is sent
        Then mock runner is not running
        
    Scenario: Monitoring message is received when runner is running in monitoring mode.
        Given mock runner is running with monitoring
        Then message "[3010,{\"healthy\":true}]" is received
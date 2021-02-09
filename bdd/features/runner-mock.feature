Feature: Mock runner test

    Scenario: Ping pong
        Given mock runner is running
        When message "[4000,{}]" is sent
        Then message "[3000,{}]" is received

    Scenario: Correct message
        Given mock runner is running
        When message "[3010,{}]" is sent
        Then message "[3004,{\"received\":3010}]" is received
    
    Scenario: Incorrect message
        Given mock runner is running
        When message "incorrect" is sent
        Then message "[3004,{\"received\":\"unknown message\"}]" is received

    Scenario: Incorrect message
        Given mock runner is running
        When message "[4002,{}]" is sent
        Then mock runner is not running

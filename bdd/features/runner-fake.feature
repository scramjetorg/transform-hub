Feature: Fake runner test

    Scenario: Healthcheck massage is printed
        Given runner fake is running 
        Then healthcheck message is printed 
        
        
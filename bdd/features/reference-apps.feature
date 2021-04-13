Feature: Reference apps tests
    
    Scenario: Run inert app
        Given run app "dist/reference-apps/read-sequence-3/index.js"
        When wait "3000" ms 
        # Then app produces folllowin output "{ x: 1 },{ x: 2 },{ x: 3 }"

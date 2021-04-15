Feature: Reference read apps tests

    Scenario: Run read sequence 1 app
        Given run app "../dist/reference-apps/read-sequence-1/index.js" and save output to "read-sequence-1.test.result.txt"
        Then output file "read-sequence-1.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    Scenario: Run read sequence 2 app
        Given run app "../dist/reference-apps/read-sequence-2/index.js" and save output to "read-sequence-2.test.result.txt"
        Then output file "read-sequence-2.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    Scenario: Run read sequence 3 app
        Given run app "../dist/reference-apps/read-sequence-3/index.js" and save output to "read-sequence-3.test.result.txt"
        Then output file "read-sequence-3.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

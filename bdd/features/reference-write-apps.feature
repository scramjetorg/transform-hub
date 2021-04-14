Feature: Reference write apps tests

    Scenario: Run write function app
        Given run app "../dist/reference-apps/write-function/index.js" and save output to "write-function.test.result.txt"
        Then output file "write-function.test.result.txt" contains
            """
            """

    Scenario: Run write sequence 1 app
        Given run app "../dist/reference-apps/write-sequence-1/index.js" and save output to "write-sequence-1.test.result.txt"
        Then output file "write-sequence-1.test.result.txt" contains
            """
            """

    Scenario: Run write sequence 2 app
        Given run app "../dist/reference-apps/write-sequence-2/index.js" and save output to "write-sequence-2.test.result.txt"
        Then output file "write-sequence-2.test.result.txt" contains
            """
            """

    Scenario: Run write sequence 3 app
        Given run app "../dist/reference-apps/write-sequence-3/index.js" and save output to "write-sequence-3.test.result.txt"
        Then output file "write-sequence-3.test.result.txt" contains
            """
            """

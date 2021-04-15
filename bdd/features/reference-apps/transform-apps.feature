Feature: Reference transform apps tests

    Scenario: Run transform function app
        Given run app "../dist/reference-apps/transform-function/index.js" and save output to "transform-function.test.result.txt"
        Then output file "transform-function.test.result.txt" contains
            """
            """

    Scenario: Run transform sequence 1 app
        Given run app "../dist/reference-apps/transform-sequence-1/index.js" and save output to "transform-sequence-1.test.result.txt"
        Then output file "transform-sequence-1.test.result.txt" contains
            """
            """

    Scenario: Run transform sequence 2 app
        Given run app "../dist/reference-apps/transform-sequence-2/index.js" and save output to "transform-sequence-2.test.result.txt"
        Then output file "transform-sequence-2.test.result.txt" contains
            """
            """

    Scenario: Run transform sequence 3 app
        Given run app "../dist/reference-apps/transform-sequence-3/index.js" and save output to "transform-sequence-3.test.result.txt"
        Then output file "transform-sequence-3.test.result.txt" contains
            """
            """

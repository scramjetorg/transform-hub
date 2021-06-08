Feature: Reference transform apps tests

    @ignore
    Scenario: RA-003 TC-001 Run transform function app
        Given run app "../dist/reference-apps/transform-function/index.js" and save output to "./reports/.work/transform-function.test.result.txt"
        Then output file "./reports/.work/transform-function.test.result.txt" contains
            """
            """

    @ignore
    Scenario: RA-003 TC-002 Run transform sequence 1 app
        Given run app "../dist/reference-apps/transform-sequence-1/index.js" and save output to "./reports/.work/transform-sequence-1.test.result.txt"
        Then output file "./reports/.work/transform-sequence-1.test.result.txt" contains
            """
            """

    @ignore
    Scenario: RA-003 TC-003 Run transform sequence 2 app
        Given run app "../dist/reference-apps/transform-sequence-2/index.js" and save output to "./reports/.work/transform-sequence-2.test.result.txt"
        Then output file "./reports/.work/transform-sequence-2.test.result.txt" contains
            """
            """

    @ignore
    Scenario: RA-003 TC-004 Run transform sequence 3 app
        Given run app "../dist/reference-apps/transform-sequence-3/index.js" and save output to "./reports/.work/transform-sequence-3.test.result.txt"
        Then output file "./reports/.work/transform-sequence-3.test.result.txt" contains
            """
            """

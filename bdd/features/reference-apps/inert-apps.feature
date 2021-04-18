Feature: Reference inert apps tests

    Scenario: Run inert function js app
        Given run app "../dist/reference-apps/inert-function-js/index.js" and save output to "./reports/.work/inert-function-js.test.result.txt"
        Then output file "./reports/.work/inert-function-js.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    Scenario: Run inert function app
        Given run app "../dist/reference-apps/inert-function/index.js" and save output to "./reports/.work/inert-function.test.result.txt"
        Then output file "./reports/.work/inert-function.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    #https://app.asana.com/0/1200141514105151/1200194457354406
    @ignore
    Scenario: Run inert sequence 1 app
        Given run app "../dist/reference-apps/inert-sequence-1/index.js" and save output to "./reports/.work/inert-sequence-1.test.result.txt"
        Then output file "./reports/.work/inert-sequence-1.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    Scenario: Run inert sequence 2 app
        Given run app "../dist/reference-apps/inert-sequence-2/index.js" and save output to "./reports/.work/inert-sequence-2.test.result.txt"
        Then output file "./reports/.work/inert-sequence-2.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

    Scenario: Run inert sequence 3 app
        Given run app "../dist/reference-apps/inert-sequence-3/index.js" and save output to "./reports/.work/inert-sequence-3.test.result.txt"
        Then output file "./reports/.work/inert-sequence-3.test.result.txt" contains
            """
            { x: 1 }
            { x: 2 }
            { x: 3 }
            { x: 4 }
            """

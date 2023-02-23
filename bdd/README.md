# Behavior Driven Development

As the "problem scope" of the business problem that our technology solves is quite complex, we decided to use the BDD practice to support the development process. BDD is a methodology of high automation and agility. It describes a cycle of interactions with well-defined outcomes. As a result of these activities, we obtain working, tested software that has a real value.

We use [Cucumber](https://cucumber.io/) as a software tool to support the BDD process and [Gherkin](https://cucumber.io/docs/gherkin/) syntax that allows us to write tests in a human-readable language.

If you use Visual Studio Code as your IDE, please install the [Cucumber (Gherkin) Full Support](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete&ssr=false#review-details) extension. It will be very useful for writing or editing BDD tests. After installing it, please make sure that in your local .vscode/ directory file `settings.json` exists:

```json
{
  "cucumberautocomplete.steps": [
    "./bdd/step-definitions/**/*.ts"
  ],
  "cucumberautocomplete.strictGherkinCompletion": true
}

```

---

# How to run tests :runner:

## How to run BDD tests :cucumber:

The following instructions apply to the state of the repository from `release/0.22`.

BDD tests are located in a `bdd` folder, to execute them simply follow the steps below.

### Preparation :books:

Before start running any test, please make sure that all the packages are installed and built. In order to do that please run the following command:

```bash
yarn clean && yarn install && yarn build:all
```

This command will remove all the 'dist' folders (if there were any), after that it will install dependencies, compile the code in all the packages including 'reference-apps' package, which contains all the Sequences that we use in our BDD tests. After executing the command from above, every Sequence will be also compressed into `.tar.gz` file. Those compressed files are ready-to-use Sequence packages, that we use in BDD tests scenarios.

### Executing BDD tests :rocket:

The test scenarios are located in `*.feature` files, and these in separate folders named according to the subject of the testing, and these in `features` directory in `bdd` folder.
Every scenario has its own title and unique index number. We can use those indexes to either execute one test or a bulk of tests, for example:

- to execute one particular test named `Scenario: E2E-001 TC-002 API test - Get instance output` run the following command:

> :bulb: **NOTE:** Commands for executing tests must be run from the root of the repository.

```bash
yarn test:bdd --name="E2E-001 TC-002"
```

This is the output after running this single test:

![test1.png](../images/test1.png)

- to execute a bulk of scenarios, for example from the same feature file, you can simply use the substring of their index like "E2E-001", run the following command:

```bash
yarn test:bdd --name="E2E-001"
```

This command will run all the scenarios that have the substring "E2E-001" in their index, whether they are in the same feature file or not. Cucumber will search all the files.

Three tests scenarios were found and executed:

![test2.png](../images/test2.png)

When you want to execute a group of tests you can do it using the substring of their name, for example, to execute all E2E tests:

```bash
yarn test:BDD --name="E2E"
```

- you can also execute a bulk of tests by using their `--tag` (`@tag_name`). Tags are used to group related features, independent of your file and directory structure. For example:

```bash
yarn test:bdd --tags="@ci"
```

The list of scenarios marked with `@ci` tag is quite long so I will paste only start of the test and the summary of the test execution:

![test_ci.png](../images/test_ci.png)

(...)

![test3.png](../images/test3.png)

Scenario can have more that one tag, can have two or even more, for example:

![tags.png](../images/tags.png)

In the situation like this above, when you want to execute tests with `@ci` tag but without `@starts-host` tag, command like this below will do the job:

```bash
yarn test:bdd --tags="@ci" --tags="not @starts-host"
```

### Results :bar_chart:

The results of the performed test will be displayed in the console as a summary of executed tests. There is also a report generated in `html` which illustrates the results in a very user friendly form. Html report is generated every time we run a BDD test, those html's are saved in `bdd/reports` folder.

## Shell variables :shell: :computer:

There is a list of variables that can be used in BDD tests. These variables are used to pass values to the test scenarios. The full list of variables you will find here :point_right: [ENV_VARS.md](../ENV_VARS.md)

You can use them in the command line, for example like this:

```bash
DEVELOPMENT=1 yarn test:bdd --name="E2E-001 TC-002"
# it will run the tests in development mode, which means that logs will be seen during test execution.
```

# How to run unit tests :runner:

With the command below you will run all the unit tests in a whole project:

    yarn test

This command runs `test` script defined in the main `package.json` [file](../package.json). The script executes yarn command: `yarn test`. In a result, yarn goes through all the packages and runs unit tests in every package.

If you see the error along the way, that means some tests were not passed.

Below you can see an example, which shows the result of all passed unit test in all the packages:

```bash
run-script: 8.428s packages/api-client: script test executed in 8407ms.
run-script: 8.661s packages/load-check: script test executed in 8640ms.
run-script: 9.339s packages/client-utils: script test executed in 9318ms.
run-script: 10.158s packages/adapters: script test executed in 10137ms.
run-script: 10.501s packages/cli: script test executed in 10480ms.
run-script: 11.077s packages/logger: script test executed in 11055ms.
run-script: 11.689s packages/host: script test executed in 11668ms.
run-script: 12.068s packages/api-server: script test executed in 12048ms.
run-script: 12.100s packages/pre-runner: script test executed in 30ms.
(...)
Done in 44.90s.
```

If you want to run a particular test file, go to directory where the test file is and run command:

    npm test

For example if you want to run unit test for the Runner package, go to runner's test directory and run the test:

    cd packages/runner/test
    npm test

and you will see the results in the console:

![ava](../images/ava.png)

If you want to run one particular test in the file, go to directory where the test file is and run command:

    npx ava name-of-the-file.spec.ts -m "Name-of-the-unit-test"

for example:

    npx ava runner.spec.ts -m "Runner new instance"

![ava1](../images/ava1.png)

If you add `-w` a the end of the command above the test will run automatically after every change you make in the test, eg.:

    npx ava runner.spec.ts -m "Stop sequence" -w

# Behavior Driven Development

As the "problem scope" of the business problem that our technology solves is quite complex we decided to use the BDD practice. It involves the use of specialized software to support the development process. BDD is a methodology of high automation and agility. It describes a cycle of interactions with well-defined outcomes. As a result of these activities, we obtain working, tested software that has real value.

We use [Cucumber](https://cucumber.io/) as a software tool to support the BDD process and [Gherkin](https://cucumber.io/docs/gherkin/) syntax that allows us to write tests in a human-readable language.

If you use Visual Studio Code, you can use the [Cucumber (Gherkin) Full Support](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete&ssr=false#review-details) extension which will be very useful for writing BDD tests.

---
# How to run tests :runner:
## How to run BDD tests :cucumber:

The following instructions apply to the state of the repository from `release/0.12`.

BDD tests are located in a `bdd` folder, to execute them simply follow the steps below:

### Preparation :books:
Before start running any test please make sure that all the packages are installed and built. In order to do that please run the following command:

    yarn clean && yarn install && yarn build:all && yarn packseq

This command will remove all the 'dist' folders, after that it will install build all the packages including 'reference-apps' package, which contains all the applications that we use in our BDD tests. After executing the command from above every single application will be also compressed into `.tar.gz` file. We also need the for the BDD tests execution.

### Executing BDD tests :rocket:
The test scenarios are located in `.feature` files, and these in separate folders named according to the subject of the testing, and these in `features` directory in `bdd` folder.
Every scenario has its own title and unique index number. We can use those indexes to either execute one test or a bulk of tests, for example:

- to execute one particular test named `Scenario: E2E-001 TC-002 API test - Get instance output` run the following command:

```bash
yarn test:bdd --name="E2E-001 TC-002"
```
This is the output after running this single test:

![test1.png](../images/test1.png)

- to execute a bulk of scenarios, for example from the same feature file, you can simply use the substring of their index like "E2E-001", run the following command:

```bash
yarn test:bdd --name="E2E-001"
```
This command will run all the scenarios that have the substring "E2E-001" in their index whether they are in the same feature file or not. Cucumber will search all the files.

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

In the situation like this above, when you want to execute tests only with tag `@starts-host` command like this below will do the job:

    yarn test:bdd --tags="@ci" --tags="not @starts-host"

### Results :bar_chart:

The results of the performed test will be displayed in the console as a summary of executed tests. There is also a report generated in `html` which illustrates the results in a very user friendly form. Html report is generated every time we run a BDD test, those html's are saved in `BDD/reports` folder.

## Shell variables :shell: :computer:

There is a list of variables that can be used in BDD tests. These variables are used to pass values to the test scenarios. The full list of variables you will find here :point_right: [ENV_VARS.md](../ENV_VARS.md)

You can use them in the command line:

```bash
DEVELOPMENT=1 yarn test:bdd --name="E2E-001 TC-002"
# it will run the tests in development mode, which means that logs will be seen during test execution.
```


=================================================================
# How to run unit tests :runner:

Make unit and BDD tests via command:

```bash
yarn test
```

It will execute:

```bash
yarn test:parallel && yarn test:BDD
```

## Unit tests

```bash
yarn test:packages
```

If you want to run a particular test file, go to directory where the test file is and run command:

```bash
npx ava name-of-the-file.spec.ts
```

If you want to run one particular test in the file, go to directory where the test file is and run command:

```bash
npx ava name-of-the-file.spec.ts -m "Name-of-the-unit-test"
```

If you add `-w` a the end of the command above the test will run automatically after every change you make in the test, eg.:

```bash
npx ava runner.spec.ts -m "Stop sequence" -w
```

In a result of running all the test, both unit and BDD (command: `yarn test`), Lerna goes through all the packages and runs unit tests and also checks the `BDD` directory and runs all BDD scenarios.

If you see the error along the way, that means some tests were not passed.

Below you can see an example, which shows the result of all passed unit test in all the packages:

```bash
lerna success run Ran npm script 'test' in 17 packages in 26.1s:
lerna success - @scramjet/adapters
lerna success - @scramjet/api-client
lerna success - @scramjet/api-server
lerna success - @scramjet/sth-config
lerna success - @scramjet/host
lerna success - @scramjet/logger
lerna success - @scramjet/model
lerna success - @scramjet/pre-runner
lerna success - @scramjet/runner
lerna success - @scramjet/example
lerna success - @scramjet/example2
lerna success - @scramjet/hello-alice-out
lerna success - @scramjet/supervisor
lerna success - @scramjet/symbols
lerna success - @scramjet/test-ava-ts-node
lerna success - @scramjet/types
Done in 26.66s.
```

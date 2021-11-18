# How to run test

Make unit and bdd tests via command:

```bash
yarn test
```

It will execute:

```bash
yarn test:parallel && yarn test:bdd
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

## BDD tests

BDD test are written using Gherkin syntax

The following instructions apply to the state of the repository from the `release/0.10`.
BDD tests are located in a `bdd` folder, to execute them simply follow the steps below:

- start with:

```bash
yarn clean && yarn install && yarn build:all && yarn packseq
```

Remember if you want to test core dump file you must set ```echo '/cores/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern``` on your linux machine.

- execute all bdd test from the command line:

```bash
yarn test:bdd
```

- or execute a particular bdd scenario by adding the scenario title after a `--name` flag:

```bash
yarn test:bdd --name="Execute example HelloAlice"
```

When you want to execute a group of tests you can do it using the substring of their name, for example, to execute all E2E tests:

```bash
yarn test:bdd --name="E2E"
```

You can also execute tests based on their tag name, for example:

```bash
yarn test:bdd --tags '@ci'
```

Results of the performed test will be displayed in the console. There is also a report generated in `html` which illustrates the results in a very user friendly form. Html report is generated every time we run a bdd test, those html's are saved in `bdd/reports` folder.

In a result of running all the test, both unit and bdd (command: `yarn test`), Lerna goes through all the packages and runs unit tests and also checks the `bdd` directory and runs all bdd scenarios.

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

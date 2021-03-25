# Scramjet Cloud Server Instance (CSI)

## Installation

```bash
npm install -g lerna yarn
```

```bash
yarn link
```

```bash
yarn install
```

It'll install all dependencies at once.

## Publish

Create a new release of the packages that have been updated.
Prompts for a new version and updates all the packages on git and npm.

```bash
lerna publish
```

```bash
yarn publish
```

## Commands

Build all packages

```bash
yarn build
```

Remove all files in `*dist/*` directory

```bash
yarn clean
```

Check and fix syntax

```bash
yarn lint
```

Watch files

```bash
yarn watch
```

Test files

```bash
yarn test
```

Test files parallel

```bash
yarn test:parallel
```

BDD Test

```bash
yarn test:bdd
```

Run script excluding package

```bash
lerna run --ignore @scramjet/<package_name> build
```

```bash
lerna run --ignore @scramjet/<package_name> build && @scramjet/<package_name> build
```

Run script only in one package

```bash
lerna run --scope @scramjet/<package_name> <script-name>
```

<!--
- `npm run build` - build all services, samples etc.,
- `npm run build:supervisor` - build only supervisor,
- `npm run clean` - remove all files in *dist/* directory,
- `npm run lint` - check files
 -->

---

Add new package

```bash
lerna create package_name
```

List all of the public packages in the current Lerna repo.

```bash
lerna ls
```

Bootstrap the packages in the current Lerna repo. Installing all their dependencies and linking any cross-dependencies.

```bash
lerna bootstrap
```

Add external dependency

```bash
lerna add <dependency_name> --scope=@scope_name/package_name
```

Add internal dependency

```bash
lerna add @scope_name/package_name --scope=@scope_name/package_name
```

Import the package in the local path `<pathToRepo>` into `packages/<directory-name>` with commit history.

```bash
lerna import <pathToRepo>
```

Run an npm script in each package that contains that script.

```bash
lerna run [script]
```

## Howto run components

### Runner

Starting `Runner` script: `/scramjet-csi-dev/packages/runner/src/bin/start-runner.ts`

Example of usage:

```bash
node dist/runner/bin/start-runner.js sequence-file-path fifo-files-path
```

### HostOne

Starting `HostOne` script: `/scramjet-csi-dev/packages/host-one/src/bin/start-host-one.ts`

Example of usage:

```bash
node dist/host-one/bin/start-host-one.js sequence-file-path config-file-path
```

## How to run samples

### "Hello Alice" sample

The following instructions apply to the state of the repository from the `release/0.4`.
To execute the sample simply run the following commands from the level of the main folder:

```bash
yarn install &&
yarn build &&
yarn build:docker &&
yarn prepack &&
cd packages/pre-runner &&
yarn prepare-sample-tar &&
cd $(git rev-parse --show-toplevel) &&  # this line will throw you back to the main folder
cd dist/supervisor/bin &&
SEQUENCE_PATH=../../../packages/pre-runner/sample-package/package.tar.gz node supervisor.js
```

## How to run tests

### BDD test

The following instructions apply to the state of the repository from the `release/0.4`.
BDD tests are located in a `bdd` folder, to execute them there are several steps to follow:

- start with:

```bash
yarn install &&
yarn build &&
yarn build:docker &&
yarn prepack &&
cd packages/pre-runner &&
yarn prepare-sample-tar &&
cd $(git rev-parse --show-toplevel) &&  # this line will throw you back to the main folder
```

- go to `bdd` folder:

```bash
cd bdd
```

- run `npm i`

```bash
npm i
```

- execute all bdd test using from the command line:

```bash
yarn test:bdd
```

- or execute a particular bdd scenario by adding the scenario title after a `--name` flag:

```bash
yarn test-bdd --name="Execute example HelloAlice"
```

Results of the performed test will be displayed in the console. There is also a report generated in `html` which illustrates the results in a very user friendly form. Html report is generated every time we run a bdd test, those html's are saved in `bdd` folder.

## Documentation

Want to check out more? [See the doc =>](https://github.com/scramjet-cloud-platform/docs)

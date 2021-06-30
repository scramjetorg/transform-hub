[Home](../README.md)  |  [Back](README.md)

STH configuration and usage 👀 <!-- omit in toc -->
===

## Table of Contents <!-- omit in toc -->

- [Intro](#intro)
- [Installation](#installation)
  - [Lerna](#lerna)
  - [Yarn](#yarn)
  - [Dependencies](#dependencies)
  - [Other](#other)
- [TypeScript](#typescript)
- [Linter config](#linter-config)
  - [How to setup](#how-to-setup)
  - [How to run](#how-to-run)
- [Code building](#code-building)
- [Execute sample](#execute-sample)
- [Configure your own sample](#configure-your-own-sample)
- [Run the server](#run-the-server)
- [Send package](#send-package)
- [Code debugging](#code-debugging)
  - [Visual Studio Code](#visual-studio-code)
- [File watcher](#file-watcher)
- [Docker commands](#docker-commands)
- [Code documentation](#code-documentation)
  - [How to generate](#how-to-generate)
  - [How to use](#how-to-use)

## Intro

You need to have installed git and also [cloned the repository](https://github.com/scramjetorg/transform-hub). Check out below links *how to do things* or jump right to the STH [installation and configuration process](#installation).

How to:

- [install git and download the repo](./helpers.md),
- [work remotely in Visual Studio code](./linux-setup-and-vscode.md),
- [work remotely in IntelliJ IDEA](https://www.jetbrains.com/help/idea/creating-a-remote-server-configuration.html).

Check out tips and tricks abut [VM, Linux and stuff =>](./linux-setup-and-vscode.md#some-things-worth-doing/installing-on-your-machine)

## Installation

### Lerna

Allows you to manage monorepo. Can be used with `npm` as well as with `yarn`. [Read more about lerna =>](https://lerna.js.org/)

Install lerna globally.

```bash
npm install -g lerna
```

[See more lerna commands  =>](./lerna-commands.md)

### Yarn

The project uses yarn workspaces, so yarn also needs to be installed.

```bash
npm install --global yarn
```

[Read more about workspaces =>](https://classic.yarnpkg.com/en/docs/workspaces/)

### Dependencies

The dependencies that the project use are list in a `package.json` file. There is a global `package.json` and per every package (located in the packages folder).

Example:

```json
{
  ...
  // here goes all dependencies that will be used by developer in code mode
  "devDependencies": {
    "@scramjet/types": "^0.10.0-pre.7",
    "@types/node": "14.14.33",
    "ava": "^3.15.0",
    "ts-node": "^9.1.1",
    "typedoc": "0.20.28",
    "typedoc-plugin-markdown": "3.4.5",
    "typescript": "4.1.4"
  },
  // here goes all dependencies that will be used by STH after the bundle is made (in dist folder)
  "dependencies": {
    "scramjet": "^4.35.2"
  },
  ...
}
```

Firs install root `package.json` file:

```bash
npm i
```

Then install packages dependencies. To do it, run the below commands (also in the root directory).

Symlink packages via command:

```bash
lerna exec yarn && lerna link
```

> Hint: We are using yarn workspaces because there is a bug in `lerna bootstrap` with symlinking packages 😅. NPM recently added workspaces in version 7.x, but it'll take a while for them to fix all bugs 🙄.

[Read more about symlink =>](https://classic.yarnpkg.com/en/docs/cli/link/)

[Read more about lerna issue =>](https://github.com/lerna/lerna/issues/1457)

Now install all dependencies at once 🥳

```bash
yarn
```

### Other

Nice to have some cool stuff that will make your life easier 😉.

Fancy [man helper tldr](https://tldr.sh/).

```bash
npm install -g tldr
```

Interactive ncurses client and real-time monitoring, statistics displaying tool for the HAProxy TCP/HTTP load balancer.

```bash
sudo apt-get install hatop
```

[Nodemon](https://www.npmjs.com/package/nodemon) is a tool that helps develop node.js based applications by automatically restarting the node application when file changes in the directory are detected;

[NPX](https://www.npmjs.com/package/npx) allows you to run binaries that are in node_modules folder or your local cache even if they are not declared in devDependencies. [See example with webpack =>](https://www.npmjs.com/package/npx#examples)

## TypeScript

TS is an open-source language which builds on JavaScript, by adding static type definitions.

```bash
# install globally
npm install -g typescript
```

[See the docs for info on how to use it.](https://www.typescriptlang.org/docs/)

Third-party TS modules needs Types support installed. For example `request` needs `@types/request`.

[Search for supported TS packages =>](https://www.typescriptlang.org/dt/search)

The main package that you will use is [@types/node](https://www.npmjs.com/package/@types/node) - TypeScript definitions for Node.js.

[TS-node](https://www.npmjs.com/package/ts-node) - is an execution environment and REPL for node.js, with source map support. In other words, it is an executable, which allows TypeScript to be run seamlessly in a NodeJS environment. As you can see with TS-node, you can run TypeScript files (`*.ts`), so there is no need to compile it to plain JavaScript :).

```bash
# install globally
npm install -g typescript
npm install -g ts-node
```

After installation you can use it via command:

```bash
ts-node script.ts
```

## Linter config

The project uses ESLint as a linter. The main advantage is flexible configuration and support for TS and JS files. [The typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) is a tooling which powers TypeScript usage with ESLint.

### How to setup

1. In VS code [download the ESlint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

2. Open the VS Code Palette *(Ctrl+Shift+P)* and type: **Preferences: Open Setting (JSON)**. Open the file and add the rules below.

    ```json
        "eslint.validate": [
            "typescript",
            "javascript"
        ],
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        }
    ```

### How to run

Use command in a root directory.

To check lint errors and warnings:

```bash
yarn run lint
```

To auto-fix code formatting in files:

```bash
yarn run lint --fix
```

## Code building

To build all services and samples type below command in the root directory:

```bash
lerna run build
```

To build global dist folder and move all compiled to js output files use:

```bash
lerna run prepack
```

You can also build samples and services separately.
For example, to build a *sample/test* can be used scripts listed in VS Code.

![show npm scripts](./../images/npm-scripts.png)

Furthermore, you can use lerna to do it via command:

```bash
lerna run --scope @scramjet/<package_name> build
```

If you want to remove all generated files in the dist/ folder simply type:

```bash
yarn run clean
```

In the nut shell you can use:

```bash
lerna run clean && lerna run build && lerna run prepack
```

## Execute sample

To execute a sample also use lerna and type:

```bash
lerna run --scope @scramjet/<package_name> start
```

## Configure your own sample

To configure sample add a new folder to *src/samples/* directory and name it meaningfully. Then add index.ts and tsconfig.json.

```json
{
  "compilerOptions": {"outDir": "../../../dist/samples/dir_name"}, // remember to change the *dir_name* here
  "extends": "../../../conf/tsconfig.json",
  "include": ["**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

Now you can generate package.json.

```bash
npm init
```

If you need **typescript** and **ts-node** support remember to add them to the devDependencies.

```json
  "devDependencies": {
    "@types/node": "^14.14.22",
    "ts-node": "^9.1.1",
    "typescript": "^4.1.3"
  }
```

As well as scripts.

```json
  "scripts": {
    "start": "node ../../../dist/samples/test/index.js",
    "build": "tsc -p tsconfig.json"
  },
// ...
```

## Run the server

```bash
ts-node packages/host/src/bin/start.ts
```

## Send package

To send a package use below command.

```bash
curl -H "Content-Type: application/octet-stream" --data-binary "@home/user/package.tar.gz" http://localhost:8000/api/v1/sequence -v
```

See other commands to manage and communicate with sequence / instance [go to CSH stream protocol description](../architecture/CSH-stream-protocol.md)

## Code debugging

### Visual Studio Code

There's no need to install any additional extensions. You just need to copy `launch.json` file form *config/* folder to your *.vscode* folder.

If you want to debug code in the file open that file go to *Run* tab and choose *Check current*.

```json
    {
      "type": "node",
      "request": "launch",
      "name": "Check current",
      "program": "${file}"
    }
```

Right now there is also *Check sample test* it allows you to check sample named test. When you run check on test sample you'll also make build on it.

There's no need to install any additional extensions. You just need to copy `launch.json` file form *config/* folder to your *.vscode* folder.

```json
    {
      "type": "node",
      "request": "launch",
      "name": "Specify the name", // It will display in a debug dropdown menu
      "program": "${workspaceFolder}/src/dir_name/index.ts",
      "preLaunchTask": "tsc: build - src/dir_name/tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/dir_name/**/*.js"]
    }
```

[Read more about config in VS doc =>](https://code.visualstudio.com/docs/typescript/typescript-debugging)

[Read more about VS code debugging =>](https://code.visualstudio.com/docs/editor/debugging)

[Read how to setup VS code =>](./linux-setup-and-vscode.md)

[Link to VS the doc =>](https://vscode.readthedocs.io/en/latest/editor/debugging/)

## File watcher

If you want to add a watcher to your sample add the following script to the package JSON file.

```json
  "scripts": {
    // ...,
    "watch": "tsc -b --watch",
    // ...
  }
```

Watcher can be executed from root folder via lerna per one package, few packages, or for all packages in the repo.

[See lerna commands =>](./lerna-commands.md)

## Docker commands

Remove all unused containers, networks, images. Optionally both dangling and unreferenced images with `--all` flag, and volumes with `--volumes` .

```bash
docker system prune --all --volumes
```

Build shiny new docker image:

```bash
lerna run build:docker
```

You can find more [Docker CLI commands in the docs =>](https://docs.docker.com/engine/reference/commandline/cli/)

## Code documentation

The project uses TSDoc as documentation. It allows generating code documentation similar to TS markup syntax.

### How to generate

```bash
yarn build:docs
```

### How to use

- [Check out TSDoc =>](https://tsdoc.org/)
- [Check out GitHub =>](https://www.npmjs.com/package/@microsoft/tsdoc)

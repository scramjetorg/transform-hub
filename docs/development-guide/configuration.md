[Back](README.md)

STH configuration and usage 👀 <!-- omit in toc -->
===

## Table of Contents <!-- omit in toc -->

- [Introduction](#introduction)
- [Dictionary](#dictionary)
- [Installation](#installation)
  - [Node](#node)
  - [Lerna](#lerna)
  - [Yarn](#yarn)
  - [Dependencies](#dependencies)
  - [Other](#other)
- [TypeScript](#typescript)
- [Linter config](#linter-config)
  - [How to setup](#how-to-setup)
  - [How to run](#how-to-run)
- [Code building](#code-building)
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

## Introduction

**Scramjet Transform Hub** (STH) is an execution system that will be installed on a managed server by the developer. Once installed, it will serve as an execution platform for programs on this server. Developers will be able to quickly and simply execute programs on this platform, which will automatically forge connections between programs and allow for remote control of program running, managing and termination.

The main aim of STH is to enable developers to execute programs in a much more efficient and simpler way than is currently available. Think of it as an operating system living on a managed server, fully controlled by the developer, but drastically cutting the code required to run applications.

STH right now support only node, but we will do more engines and languages shortly.

## Dictionary

What is **sequence**?
> Chained list of functions with at least one function element.

What is **package**?
> Package is zipped folder witch contains sequence and package.json file.

What is **instance**?
> Executed sequence, in other words instance of the sequence that is running.

What is **package.json**?
> Contains the characteristic of the sequence, and instance in json format. [See how to prepare the package.json file](#1-specify-the-json-file).

## Installation

Project works only on Unix-like operating systems. Right now we don't support Windows.

### Node

Check if you already have Node.js and npm installed, run the following commands in your console:

```bash
node -v
npm -v
```

If your local machine don't have node.js installed download it. Choose the way and follow the instructions.

- [Download binary file to install node.js](https://nodejs.org/en/download/)
- [Installing Node.js via package manager](https://nodejs.org/en/download/package-manager/)

### Lerna

Allows you to manage monorepo. Can be used with `npm` as well as with `yarn`. [Read more about lerna =>](https://lerna.js.org/)

Install lerna globally.

```bash
npm install -g lerna
```

[See more lerna commands  =>](https://github.com/lerna/lerna/tree/main/commands/)

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
  /* here goes all dependencies that will be used by STH after the bundle is made (in dist folder) */
  "dependencies": {
    "scramjet": "^4.35.2"
  },
  ...
}
```

Install all dependencies at once:

```bash
npm i  # npm install
yarn   # yarn install
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
yarn lint
```

To auto-fix code formatting in files:

```bash
yarn lint --fix
```

## Code building

To build all services and samples type below command in the root directory:

```bash
yarn build
```

To build global dist folder and move all compiled to js output files use:

```bash
yarn prepack
```

You can also build samples and services separately. Use lerna to do it via command:

```bash
lerna run --scope @scramjet/<package_name> build
```

If you want to remove all generated files in the dist/ folder simply type:

```bash
yarn run clean
```

In the nut shell you can use:

```bash
yarn clean && yarn build && yarn prepack
```

## Run the server

Run server in development mode.

```bash
ts-node packages/sth/src/bin/start.ts
```

## Send package

To send a package use below command.

```bash
curl -H "Content-Type: application/octet-stream" --data-binary "@home/user/package.tar.gz" http://localhost:8000/api/v1/sequence -v
```

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

[Link to VS the doc =>](https://vscode.readthedocs.io/en/latest/editor/debugging/)

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

# Scramjet Transform Hub <!-- omit in toc -->

Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Rasperry Pi or wherever else you'd like.

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) or hop on our [Scramjet Slack](https://join.slack.com/t/scramjetframework/shared_invite/enQtODg2MDIyMTQ5MzUxLTVlNTIwMmFlYWU0YTg2ZTg1YmFiOTZkZTdhNzNmNjE2ZmQ3ZWQzZjI5MGQyZDAyOWM2NDc5YzdmZGQzNGI3YTU)!

This is the STH development repo. In order to use it, you need to have linux based os, for instance [Ubuntu](https://ubuntu.com/download/server), [docker](https://www.docker.com/get-started) and [node.js v14.x](https://nodejs.org/en/) installed. We're working on development guides for Mac and Windows and node.js v16.x compatibility. A docker install will also be shortly available.

## TL;DR

First clone build and start the hub, copy the following commands to the terminal:

```bash
git clone https://github.com/scramjetorg/transform-hub.git && \
  cd transform-hub && sudo gpasswd -a $USER docker && \
  yarn install && yarn build:all && npm i -g dist/cli && yarn start -P 8000
```

Depending on your machine this may take some time. When it's done the Hub should be running and you should see initial logs showing that the API server has been started on port 8000, something like this:

```
2021-07-07T18:19:36.808Z info (object:Host) API listening on port: localhost:8000
```

Now create an application, let's say you want to get the currency rates every 10 seconds and do something. In a clean folder save this as index.js:

```js
const { DataStream } = require("scramjet");
const fetch = require("node-fetch");

module.exports = function(_stream, apikey, fr, to) {
    const idx = `${fr}_${to}`;
    const get = () => fetch(`https://free.currconv.com/api/v7/convert?q=${idx}&compact=ultra&apiKey=${apikey}`).then(r => r.json());
    const defer = (t = 10000) => new Promise((res) => setTimeout(res, t));

    return DataStream
        .from(async function*() {
            while (true)
                yield await Promise.all([get(), defer()]).then(([data]) => data);
        })
        .do(async x => { console.log(x[idx]); }) // add some logic here
        .run();
};
```

Copy a [package.json from here](./packages/samples/currency-js/package.json).

Open a terminal run your program on the hub:

```bash
si pack /path/to/my/folder -o ~/package.tar.gz # compress the app to a package
SEQ_ID=$(si seq send ~/package.tar.gz)         # upload the package to the server SEQ_ID is now it's id
INT_ID=$(si seq start $SEQ_ID -C "{}" $APIKEY BTC EUR)
                                               # start the program on the host with arguments
si inst stdout $INT_ID                         # see the output from the program.
```

See `si help` for more information. Also you will need to get an [API key for this example](https://free.currencyconverterapi.com/).

## Table of contents <!-- omit in toc -->

- [TL;DR](#tl-dr)
- [Intro](#intro)
- [The Basics](#the-basics)
- [How to start development](#how-to-start-development)
  - [Development commands](#development-commands)
  - [Start host](#start-host)
  - [Lerna commands](#lerna-commands)
  - [Clean build](#clean-build)
  - [Docker commands](#docker-commands)
  - [Install Host and execute](#install-host-and-execute)
  - [Install CLI and execute](#install-cli-and-execute)
  - [Build Host on Docker](#build-host-on-docker)
  - [Run Transform Hub in Docker](#run-transform-hub-in-docker)
- [Run components](#run-components)
  - [Runner](#runner)
- [Sequences and samples](#sequences-and-samples)
  - [Compress the package](#compress-the-package)
  - ["Hello Alice" sample](#hello-alice-sample)
- [How to run tests](#how-to-run-tests)
  - [Unit tests](#unit-tests)
  - [BDD tests](#bdd-tests)
- [Publish](#publish)

## Intro

The readme file contains information about the development process of the STH. It is focused mainly on a day by day commands. Commands won't work as long as you don't set up the environment correctly. You can [find setup instructions in the docs.](docs/development-guide/README.md)

## The basics

Scramjet Transform Hub allows you to deploy and execure programs that you build and develop. As mentioned above, you can run any program you like, but you need to know a couple important things:

* The program should consist of a function or an array of functions, such a program is called a **Transform Sequence**.
* The sequence will be executed within a separate docker instance (we're working on other execution environment integrations - help will be appreciated).
* The sequence function will receive a stream as input in the first argument - you can send the data to it via the command `si instance input`.
* If your sequence contains more than one function, then the output from the previous one is passed to the next one. The first function in sequence receives the input from API.
* The last (or the only) function in sequence can return a `Promise` or a `Stream` - based on this, STH will know when processing is done.
* Once the returned `Promise` is resolved, or the `Stream` is ended, STH will gracefully stop the sequence and remove it's container.
* You can communicate with the server via API, command line client `si` which we wrote for your convienience.
* The sequence is called with an AppContext as `this`, a class that allows you to communicate back from the sequence: send logs, provide health info, send and receive events from the API or CLI.
* You can run your sequence multiple times with different arguments (like for instance currency tickers with different symbols or sensor data readers for each sensor)
* The program does not leave your server and doesn't use any external systems. It runs on the server you install the host on.
* Currently STH supports node.js runner only, we're working on bringing you runners for other languages, with Python and C++ as the first ones.

Some important links:

* Here you can find the definition of the [Transform Sequence AppContext](./docs/types/interfaces/appcontext.md)
* You can see the [Scramjet Transform Hub API docs here](./docs/development-guide/stream-and-api.md)
* You can see the [CLI documentation here](./docs/development-guide/scramjet-interface-cli.md), but `si help` should also be quite effective.
* Don't forget to `star` this repo if you like it, `subscribe` to releases and keep visiting us for new versions and updates.
* You can [open an issue - file a bug report or a feature request here](https://github.com/scramjetorg/transform-hub/issues/new/choose)

## How to start development

If you want to help out, we're happy to accept pull requests. Please follow the below information to start development.

```bash
git clone git@github.com:scramjetorg/transform-hub.git      # clone the repo
cd transform-hub/                                           # enter the cloned directory
yarn install                                                # install dependencies
yarn build:all                                              # build all packages
                                                            #    -> modules, samples and docker images
yarn install -g dist/cli/                                   # install the cli
yarn packseq                                                # packs the sequencees
yarn start                                                  # start the hub
```

Now in another window:

```bash
si pack /path/to/my/folder -o ~/package.tar.gz # compress the app to a package
SEQ_ID=$(si seq send ~/package.tar.gz)         # upload the package to the server SEQ_ID is now it's id
INT_ID=$(si seq start $SEQ_ID -C "{}" $APIKEY BTC EUR)
                                               # start the program on the host with arguments
si inst stdout $INT_ID                         # see the output from the program.
```

### Start host

Host can be started in multiple ways

```bash
yarn start                          # Starts Host after it's been built
node dist/host/bin/start            # This is the same as above
ts-node packages/host/src/bin/start # This starts node from source code
```

### Lerna commands

We use Lerna to control our monorepo. Here's a couple of helpful commands:

```bash
lerna create package_name # Add new package:
lerna ls # List all of the public packages in the current Lerna repo:
lerna run [script] # Run an npm script in each package that contains that script.
lerna run --ignore @scramjet/<package_name> <script-name>
    # Run script in all packages excluding one package:
lerna run --ignore @scramjet/<package_name> --ignore @scramjet/<package_name> <script-name>
    # ... or run script excluding more packages
lerna run --scope @scramjet/<package_name> <script-name>
    # Run script only in one package
lerna run --scope @scramjet/<package_name> --scope @scramjet/<package_name> <script-name>
    # Run script in more packages
```

### Clean build

This is how to perform a clean build

```bash
yarn install:clean        # this command will perform yarn clean && yarn clean:modules && yarn install at once
yarn build:all-packages   # optionally build:all if you want all dockerfiles.
```

### Docker commands

During development some artifact may be left over in docker, here's how to clean them

```bash
docker ps                      # list containers
docker volume prune -f         # remove all unused local volumes
docker system prune --all -f   # remove all unused images not just dangling ones
docker stop $(docker ps -a -q) # stops all running containers
```

> *(`-f`) -  don't prompt confirmation

### Install Host and execute

After build is done, you can install and run Hub globally:

```bash
npm install -g ./dist/hub  # installs packages globally
scramjet-transform-hub     # starts host
```

You can also install current Hub release from registry:

```bash
npm install -g @scramjet/hub
scramjet-transform-hub
```

### Install CLI and execute

In the root folder, after building run the following commands:

```bash
npm i -g ./dist/cli # install CLI globally
si help             # show CLI commands
```

You can also install the package from NPM.

```bash
npm i -g @scramjet/cli # install CLI globally
si help                # show CLI commands
```

> **HINT:** If something goes wrong make clean, install, build.

### Build Host on Docker

Build from current source:

```bash
cd ./packages/host/
yarn build:docker
```

Build current release:

```bash
cd ./packages/host/
yarn build:docker-release
```

### Run Transform Hub in Docker

```bash
cd ./packages/sth/
docker-compose up

# or run in detached mode
docker-compose up -d
docker-compose logs -f
```

To run Hub without docker-compose:

```bash
docker run -d --init \
  --name scramjet-hub \
  -p 8000:8000 \
  -v /tmp/:/tmp/ \
  -v /var/run/docker.sock:/var/run/docker.sock \
  scramjetorg/host:$(jq -r .version < package.json)
```

## Run components

### Runner

Starting `Runner` script: `./packages/runner/src/bin/start-runner.ts`

Example of usage:

```bash
node dist/runner/bin/start-runner.js sequence-file-path fifo-files-path
```

## Sequences and samples

To run sequence / sample (example Alice), first, you need to install all the dependencies, [install and execute host](#install-host-and-execute), compress the package, and then you're good to go and use curl commands.

> **HINT:** The following instructions apply to the state of the repository from the `release/0.10`.

### Compress the package

The sequence in a `tar.gz` file format with package.js (aka package) can be generated in different ways.

Assuming that you have the [host running](#install-host-and-execute) use command:

```bash
yarn packseq # this creates tar.gz for all packages in the repo
```

When the host is not running you can use a script:

```bash
lerna run prepare-sample-tar
```

To compress specific package use linux tar command:

```bash
tar -C /path/to/package/dir czf <package-name.tar.gz> .
```

### "Hello Alice" sample

To execute the sample run the commands listed below from the level of the main folder.

If the sequence is not packed:

```bash
lerna run prepare-sample-tar
```

> HINT: remember that to use curl commands host must be running.  [See how to execute host =>](#install-host-and-execute)

Now upload the package:

```bash
SEQ_ID=$(
    curl -H 'content-type: application/octet-stream' \
    --data-binary '@packages/samples/hello-alice-out.tar.gz' \
    "http://localhost:8000/api/v1/sequence" | jq ".id" -r
)
```

You can use the following that will build and send any of the reference packages and samples in this repo:

```bash
SEQ_ID=$(./scripts/_/upload-sequence packages/samples/hello-alice-out) # -> when you want to upload the package (it will be built if needed)
SEQ_ID=$(./scripts/_/upload-sequence packages/samples/hello-alice-out -r) # -> when you want to upload the package and make sure it's rebuilt
SEQ_ID=$(./scripts/_/upload-sequence dist/my-package.tgz -r) # -> when you want to upload a ready tarball
```

> **HINT:** INSTANCE_ID and SEQ_ID are shell variables.

Start the sequence and see the output from it.

```bash
INSTANCE_ID=$(curl -H "Content-Type: application/json" --data-raw '{"appConfig": {},"args": ["/package/data.json"]}' http://localhost:8000/api/v1/sequence/$SEQ_ID/start | jq ".id" -r)
curl -X GET -H "Content-Type: application/octet-stream" "http://localhost:8000/api/v1/instance/$INSTANCE_ID/stdout"
```

as a result you should see something like this in the console:

```bash
Hello Alice!
Hello Ada!
Hello Aga!
Hello Michał!
Hello Maciek!
Hello Marcin!
Hello Patryk!
Hello Rafał!
Hello Aida!
Hello Basia!
Hello Natalia!
Hello Monika!
Hello Wojtek!
Hello Arek!
```

after that hit enter and type kill to exit the process:

```bash
sequence: kill
```

[See more about streams and curl commands =>](docs/development-guide/stream-and-api.md)

> **HINT:** If something goes wrong run clean, build.

Copy and paste 🤞

```bash
yarn clean && yarn build
```

## How to run tests

Make unit and bdd tests via command:

```bash
yarn test
```

It will execute:

```bash
yarn test:parallel && yarn test:bdd
```

### Unit tests

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

If you add `-w` a the end of the command above the test will run automaticaly after every change you make in the test, eg.:

```bash
npx ava runner.spec.ts -m "Stop sequence" -w
```

### BDD tests

The following instructions apply to the state of the repository from the `release/0.10`.
BDD tests are located in a `bdd` folder, to execute them simply follow the steps below:

- start with:

```bash
yarn clean && yarn install && yarn build:all && yarn packseq
```

Remeber if you want to test core dump file you must set ```echo '/cores/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern``` on your linux machine.

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

## Publish

To perform full publishing of packages with build and install, perform
the following commands:

```bash
# <clone>
yarn cache clean           # optional clean cache
yarn install               # install dependencies
yarn build:all-packages    # build all packages
yarn bump:version          # bump version and docker images prior to publishing
yarn bump:postversion      # prepare dist folder, publish packages from dist, push git tags
```

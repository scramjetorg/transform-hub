# Scramjet Transform Hub

<p align="center">
    <a><img src="https://img.shields.io/github/license/scramjetorg/transform-hub?color=green&style=plastic" alt="GitHub license" /></a>
    <a><img src="https://img.shields.io/github/v/tag/scramjetorg/transform-hub?label=version&color=blue&style=plastic" alt="STH version" /></a>
    <a><img src="https://img.shields.io/github/stars/scramjetorg/transform-hub?color=pink&style=plastic" alt="GitHub stars" /></a>
    <a><img src="https://img.shields.io/tokei/lines/github/scramjetorg/transform-hub?color=yellow&style=plastic" alt="GitHub total lines" /></a>
    <a><img alt="npm" src="https://img.shields.io/npm/dt/@scramjet/sth?color=orange&style=plastic"></a>
</p>
<p align="center">⭐ Star us on GitHub — it motivates us a lot! 🚀 </p>
<p align="center">
    <img src="https://assets.scramjet.org/sth-logo.svg" alt="Scramjet Transform Hub Logo">
</p>

---

# Table of contents

1. [Introduction](#introduction-🤝)
2. [Usage](#usage-💡)
3. [Installation](#installation-🗜️)
4. [Sample usage](#sample-usage-😎)
5. [The Basics](#the-basics-🔤)
6. [How to start development](#how-to-start-development-👨‍💻)
    - [Start host](#start-host-🏁 )
    - [Lerna commands](#lerna-commands-📝)
    - [Clean build](#clean-build-🏗️)
    - [Docker commands](#docker-commands-🐳)
    - [Install Host and execute](#install-host-and-execute-✅)
    - [Install CLI and execute](#install-cli-and-execute-✅)
    - [Build Host on Docker](#build-host-on-docker-🏗️)
    - [Run Transform Hub in Docker](#run-transform-hub-in-docker-🤖)
7. [Run components](#run-components-🤹‍♀️)
    - [Runner](#runner-🏃‍♂️)
8. [Sequences and samples](#sequences-and-samples-🌀)
    - [Compress the package](#compress-the-package-📦)
    - ["Hello Alice" sample](#hello-alice-sample)
9. [License and contributions](#license-and-contributions-📃)

- Configuration
- Known issues and limitations
- Getting help

---
# Introduction 🤝

This repository contains the source code for https://scramjet.org/docs (🚧404🚧 website under construction 👷).

If you want to read the docs, go there ☝🏼

What's more, this repository is intended for developers who would like to:

- participate in the Scramjet Transform Hub development community
- register feature requests, issues and PRs for this product
- build Transform Hub from source
- dive into code and see how it works

The developers who would like to simply use Scramjet Transform Hub to run data processing applications, we recommend following resources:

- [Repository with Introductory README and code samples](https://github.com/scramjetorg/scramjet-cloud-docs)
- [NPM page for main scramjet/sth package](https://www.npmjs.com/package/@scramjet/sth)
- [NPM page for scramjet/cli package](https://www.npmjs.com/package/@scramjet/cli)

---

# Usage 💡

Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like.

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) 📧 or hop on our [Scramjet Slack](https://join.slack.com/t/scramjetframework/shared_invite/enQtODg2MDIyMTQ5MzUxLTVlNTIwMmFlYWU0YTg2ZTg1YmFiOTZkZTdhNzNmNjE2ZmQ3ZWQzZjI5MGQyZDAyOWM2NDc5YzdmZGQzNGI3YTU) ![slack](./images/slack.png)

This is the STH development repo. In order to use it, you need to have linux based os, for instance [Ubuntu](https://ubuntu.com/download/server), [docker](https://www.docker.com/get-started) and [node.js v16.x](https://nodejs.org/en/) installed. We're working on development guides for Mac and Windows. 🔜

---

# Installation 🗜️

Our hub is based on node.js, so you need to install node.js and npm, which is the default package manager for node.js.
We will guide you step by step through the installation process.

There are several installations you need to perform to get the hub up and running, and event more to start developing with us. If may already have some of these installed, but we'll show you how to install them if you don't.

- NPM
- node.js
- lerna
- yarn
- typescript
- ts-node

### Install Node.js and configure Scramjet NPM Registry

1. To check if you already have Node.js(v16.xx.x) and npm installed, please check the installed version, run the following commands in your console:

        node -v
        npm -v

If none of the above commands is found, please proceed with the installation.

2. It is recommend to use a Node version manager like [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md) to install Node.js and npm. To install or update nvm, you should run the install script, to do that use the following cURL command in your console:

        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

After executing the above command you should get in the console this info:

![nvm_installation_output](./images/nvm_installation_output.png)

Which means that you need to run those two more commands to finish the installation:

        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

Export lines from above will be saved in your ~/.bashrc file so that you will not need to run it every session start.
After that you can check nvm version just to confirm that you have successfully installed nvm.

command: `nvm --version`

output: `v0.37.2`

![nvm_version](./images/nvm_version.png)


3. Now you are ready to install node.js, simply type in your console:

        nvm install 16 # command will install latest LTS Version of Node.js


> 📝 **Note**:
The project is working on Node Long Term Support (LTS) Version. Witch contains Node Package Manager (NPM) in `^8.1.0` version.
NodeJS in version `^17.XX.X` will install NPM in version `^8.1.2` and we don't use it right now 😉.

🤓 For more info you can check out the node.js official [webpage](https://nodejs.org/en/download/)

Now you can check the installed version of node.js and npm, run the following command in your console:

command: `node -v`

output: `v16.13.0`

command: `npm -v`

output: `8.1.0`

![node&npm_version](./images/node&npm_version.png)

OK! It looks like you have successfully installed node.js and npm. There are few more installations you need to perform, run the following commands in your console one after another:

        npm install -g lerna
        npm install -g yarn
        npm install -g typescript
        npm install -g ts-node

![installations](./images/installations.png)

The same as before the installations can be confirmed by checking the installed versions:

![versions](./images/versions.png)

OK! You have successfully installed all the required packages 🎉 🎆

We also work with Docker ![docker](./images/docker.png), we are currently working on solution where using Docker will be optional, but until then please continue with the installation procedure.
Run the following command in your console:

        sudo apt install -y docker.io docker-compose

Verify that Docker and Docker-Compose are installed by getting their versions:

        sudo docker version
        docker-compose version

Now let's clone build and start the hub. Please copy the following commands to the terminal:

    git clone https://github.com/scramjetorg/transform-hub.git && \
    cd transform-hub && sudo gpasswd -a $USER docker && \
    yarn install && yarn build:all && npm i -g ./dist/cli && yarn start -P 8000

Depending on your machine this may take some time, so it is a perfect time for another hot beverage ☕ or walk 🚶🏼‍♀️ or joggling 🤹‍♂️ or push-ups maybe..? no? Then simply wait 🧘 When it's done, the Hub should be running and you should see initial logs showing that the API server has been started on port 8000, something like this:

    2021-07-07T18:19:36.808Z info (object:Host) API listening on port: localhost:8000

Hub is all set and ready to work with.

![hub_start](./images/hub_start.png)

---

# Sample usage 😎

Now you can either use one of our ready-to-go samples, which you will find in a separate repo on [GitHub](https://github.com/scramjetorg/scramjet-cloud-docs/tree/main/samples) or you can create an application by yourself using the following steps below. Maybe let's try to create something on one of the hottest topics lately, which is cryptocurrency. Let's say you want to get the crypto prices every second.

In a clean folder save this as `index.js`:

```js
const { PassThrough } = require("stream");
const fetch = require("node-fetch");

const getData = async (baseCurrency, currency) =>
    fetch(`https://api.coinbase.com/v2/prices/${baseCurrency}-${currency}/spot`)
        .then(res => res.json());

module.exports = async function(_stream, baseCurrency = "BTC", currency = "USD") {
    const outputStream = new PassThrough();

    setInterval(async () => {
        getData(baseCurrency, currency)
            .then(data => {
                outputStream.write(JSON.stringify(data) + "\r\n");
            })
            .catch(() => {
                outputStream.write(JSON.stringify({ error: true }) + "\r\n");
            });
    }, 1000);

    return outputStream;
};
```

Save this as `package.json` in the same folder:

```json
{
  "name": "@scramjet/crypto-prices",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "",
  "license": "ISC",
  "repository": {
    "type": "git",
    "url": "https://github.com/scramjetorg/transform-hub.git"
  },
  "dependencies": {
    "node-fetch": "^2.6.1"
  }
}
```

Open a terminal and run your program on the transform hub:

```bash
# install dependencies
npm install

# make a compressed package with sequence
si pack . -o crypto-prices.tar.gz

# send sequence to transform hub, this will output Sequence ID
si seq send crypto-prices.tar.gz

# start a sequence with parameters, this will output Instance ID
si seq start <sequence-id> ETH USD

# See output
si inst output <instance-id>
```

For more CLI functionalities see `si help` or dive into our CLI [docs](./packages/cli/README.md).

---

# The basics 🔤

Scramjet Transform Hub allows you to deploy and execute programs that you build and develop. As mentioned above, you can run any program you like, but you need to know a couple of important things:

* The program should consist of a function or an array of functions, such a program is called a **Transform Sequence**.
* The sequence will be executed within a separate docker instance (🔜 we're working on other execution environment integrations - help will be appreciated 🦾).
* The sequence function will receive a stream as input in the first argument - you can send the data to it via the command `si instance input`.
* If your sequence contains more than one function, then the output from the first function is passed to the next one. Also, the first function in sequence receives the input from API.
* The last (or the only) function in sequence can return a `Promise` or a `Stream` - based on this, STH will know when processing is done.
* Once the returned `Promise` is resolved, or the `Stream` is ended, STH will gracefully stop the sequence and remove its container.
* You can communicate with the server via API, command line client `si` which we wrote for your convenience.
* The sequence is called with an AppContext as `this`, a class that allows you to communicate back from the sequence: send logs, provide health info, send and receive events from the API or CLI.
* You can run your sequence multiple times with different arguments (like for instance currency tickers with different symbols or sensor data readers for each sensor)
* The program does not leave your server and doesn't use any external systems. It runs on the server you install the host on.
* Currently STH supports node.js runner only, we're working on bringing you runners for other languages, with Python and C++ as the first ones.

Some important links 👀:

* Here you can find the definition of the [Transform Sequence AppContext](./docs/types/interfaces/appcontext.md)
* You can see the [Scramjet Transform Hub API docs here](./docs/development-guide/stream-and-api.md)
* You can see the [CLI documentation here](./docs/development-guide/scramjet-interface-cli.md), but `si help` should also be quite effective.
* Don't forget to `star` this repo if you like it, `subscribe` to releases and keep visiting us for new versions and updates.
* You can [open an issue - file a bug report or a feature request here](https://github.com/scramjetorg/transform-hub/issues/new/choose)

---

# How to start development 👨‍💻

If you want to help out, we're happy to accept your pull requests. Please follow the below information to start development.

>>>>>>>info o lernie i yarnie

```bash
git clone git@github.com:scramjetorg/transform-hub.git      # clone the repo
cd transform-hub/                                           # enter the cloned directory
yarn install                                                # install dependencies
yarn build:all                                              # build all packages
                                                            #    -> modules, samples and docker images
yarn global add file:$(pwd)/dist/cli                        # install the cli
yarn packseq                                                # packs the sequences
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

## Start host 🏁

Host can be started in multiple ways

```bash
yarn start                          # Starts Host after it's been built
node dist/host/bin/start            # This is the same as above
ts-node packages/host/src/bin/start # This starts node from source code
```

## Lerna commands 📝

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

## Clean build 🏗️

This is how to perform a clean build

```bash
yarn install:clean        # this command will perform yarn clean && yarn clean:modules && yarn install at once
yarn build:all-packages   # optionally build:all if you want all dockerfiles.
```

## Docker commands 🐳

During development some artifact may be left over in docker, here's how to clean them

```bash
docker ps                      # list containers
docker volume prune -f         # remove all unused local volumes
docker system prune --all -f   # remove all unused images not just dangling ones
docker stop $(docker ps -a -q) # stops all running containers
```

> *(`-f`) -  don't prompt confirmation

## Install Host and execute ✅

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

## Install CLI and execute ✅

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

> **💡 HINT:** If something goes wrong make clean, install, build.

## Build Host on Docker 🏗️

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

## Run Transform Hub in Docker 🤖

```bash
cd ./packages/sth/
docker-compose up

# or run in detached mode
docker-compose up -d
docker-compose logs -f
```

To run Hub without docker-compose:

```bash
docker run \
  -ti  \
  --name scramjet-hub \
  --init \
  -p 8000:8000 \
  -v /tmp/:/tmp/ \
  -v /var/run/docker.sock:/var/run/docker.sock \
  scramjetorg/sth:$(jq -r .version package.json)
```

---

# Run components 🤹‍♀️

## Runner 🏃‍♂️

Starting `Runner` script: `./packages/runner/src/bin/start-runner.ts`

Example of usage:

```bash
node dist/runner/bin/start-runner.js sequence-file-path fifo-files-path
```

## Sequences and samples 🌀

To run sequence/sample (example Alice), first, you need to install all the dependencies, [install and execute host](#install-host-and-execute), compress the package, and then you're good to go and use curl commands.

> 💡 **HINT:** The following instructions apply to the state of the repository from the `release/0.12`.

### Compress the package 📦

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

> **💡 HINT**: remember that to use curl commands host must be running.  [See how to execute host =>](#install-host-and-execute)

Now upload the package:

```bash
SEQ_ID=$(
    curl -H 'content-type: application/octet-stream' \
    --data-binary '@packages/reference-apps/hello-alice-out.tar.gz' \
    "http://localhost:8000/api/v1/sequence" | jq ".id" -r
)
```

You can use the following that will build and send any of the reference packages and samples in this repo:

```bash
SEQ_ID=$(./scripts/_/upload-sequence packages/reference-apps/hello-alice-out) # -> when you want to upload the package (it will be built if needed)
SEQ_ID=$(./scripts/_/upload-sequence packages/reference-apps/hello-alice-out -r) # -> when you want to upload the package and make sure it's rebuilt
SEQ_ID=$(./scripts/_/upload-sequence dist/my-package.tgz -r) # -> when you want to upload a ready tarball
```

> **💡 HINT:** *INSTANCE_ID and SEQ_ID are shell variables.*

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

> **💡 HINT:** If something goes wrong run clean, build.

Copy and paste 🤞

```bash
yarn clean && yarn build
```

---
# License and contributions 📃

This project is licensed dual licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.

We accept valid contributions and we will be publishing a more specific project   road map so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributions via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in [`bdd` directory](./bdd).

---

# Help wanted 💁🏻💁‍♀️💁🏼‍♂️

The project need's your help! There's lots of work to do and we have a lot of plans. If you want to help and be part of the Scramjet team, please reach out to us, [on slack](https://join.slack.com/t/scramjetframework/shared_invite/zt-bb16pluv-XlICrq5Khuhbq5beenP2Fg) or email us: [opensource@scramjet.org](opensource@scramjet.org).

---
# Donation 💸

Do you like this project? It helped you to reduce time spent on delivering your solution? You are welcome to buy us a coffee :coffee:

* [You can sponsor us on github](https://github.com/sponsors/scramjetorg) :github:

* There's also a Paypal donation link if you prefer that: [![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW)

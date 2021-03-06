<h1 align="center"><strong>Scramjet Transform Hub Command Line Interface</strong></h1>

<p align="center">
    <a href="https://github.com/scramjetorg/transform-hub/blob/HEAD/LICENSE"><img src="https://img.shields.io/github/license/scramjetorg/transform-hub?color=green&style=plastic" alt="GitHub license" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/github/v/tag/scramjetorg/transform-hub?label=version&color=blue&style=plastic" alt="STH version" /></a>
    <a href="https://github.com/scramjetorg/transform-hub"><img src="https://img.shields.io/github/stars/scramjetorg/transform-hub?color=pink&style=plastic" alt="GitHub stars" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/npm/dt/@scramjet/sth?color=orange&style=plastic" alt="npm" /></a>
    <a href="https://scr.je/join-community-mg1"><img alt="Discord" src="https://img.shields.io/discord/925384545342201896?label=discord&style=plastic"></a>
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW">
        <img src="https://img.shields.io/badge/Donate-PayPal-green.svg?color=yellow&style=plastic" alt="Donate" />
    </a>
</p>
<p align="center">⭐ Star us on GitHub — it motivates us a lot! 🚀 </p>
<p align="center">
    <img src="https://assets.scramjet.org/sth-logo.svg" alt="Scramjet Transform Hub Logo">
</p>


This package provides a Scramjet Command Line Interface to communicate with Transform Hub and Cloud Platform. The document is focused mainly on the Scramjet Transform Hub part.

1. Install the Scramjet CLI.<br /><br />

    ```bash
    npm install -g @scramjet/cli
    ```

    Once installed, the Scramjet CLI is available under the `si` command that stands for _Scramjet Interface_.<br /><br />

2. Install the autocompletion script.<br />
   To use Scramjet CLI with command hints, please install completion script. It depends on bash-completion so first make sure it's already installed by running `type _init_completion`.<br /><br />

    Below command installs completion script in `~/.bashrc`.<br /><br />

    ```bash
    si completion install
    ```

    Running command `si completion bash` prints script to the terminal.

## Commands <!-- omit in toc -->

- [Show help](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#show-help)
- [Manage config](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#manage-config)
  - [Global vs session](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#global-vs-session)
  - [Logs configuration](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#logs-configuration)
- [Show Scramjet Hub parameters](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#show-scramjet-hub-parameters)
- [Sequence operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#sequence-operations)
  - [Start sequence](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#start-sequence)
- [Instance operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#instance-operations)
  - [Events](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#events)
- [Topic operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#topic-operations)

## Show help

Check the available commands by typing `si --help` in the terminal.

```bash
Usage:
    si [options] [command]

Options:
    -v, --version            show current version
    -h, --help               display help for command

Commands:
    hub                      allows to run programs in different data centers, computers or devices in local network
    config|c                 config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings
    sequence|seq             operations on a program, consisting of one or more functions executed one after another
    instance|inst [command]  operations on running Sequence
    topic                    publish/subscribe operations allows to manage data flow
    completion               completion operations
    util|u                   various utilities
```

Show subcommand help by providing `--help` or `-h` option after each as in example below.

```bash
Usage
    si [command] --help

Example
    si sequence -h
```

## Manage config

Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings.

```bash

Options:
    -h, --help  display help for command

Commands:
    print|p     print out the current configuration
    use         add properties to session configuration
    set         add properties to global config
    reset       reset configuration value to default
```

If you wish to run your programs on your machine(s), please make sure the environment is set to development. To check the config values use `si config print` command.

```json
{
    "configVersion": 1,
    "apiUrl": "http://127.0.0.1:8000/api/v1",
    "debug": true,
    "format": "pretty", // choose the format of data displayed on the terminal
    "middlewareApiUrl": "",
    "env": "development", // choose an environment to work with STH (development) or SCP (production)
    "scope": "",
    "token": ""
}
```

Please check that the CLI environment is set to development. The CLI interface can work in either the development or production environment.

The CLI **development environment** communicates with the **Transform Hub**. If this is your first installation of Scramjet CLI, the environment should already be set to development since it is the default value of the CLI environment.

> 💡 <small>An environmental value that is set to production allows to use commands of the Scramjet Cloud Platform. We encourage you to [sign up for the SCP Beta](https://scramjet.org/#join-beta).</small>

If you wish to use the open source STH on your own machine, please make sure the STH API URL is set correctly in the CLI. By default the STH starts the API server on `http://0.0.0.0:8080/api/v1`. The API URL can be set in the CLI with the following command:
`si config set apiUrl http://0.0.0.0:8080/api/v1`

> 💡 <small>An URL pattern looks like this: `http://<localhost|IPaddress>:<portNumber>/api/v1`</small>

### Global vs session configurations

```bash
Usage:
si config set [options] [command]

Commands:
  json <json>               set configuration properties from json object
  apiUrl <url>              specify the Hub API Url (default: http://127.0.0.1:8000/api/v1)
  log [options]             specify log options
  middlewareApiUrl <url>    specify middleware API url
  scope <name>              specify default scope that should be used when session start
  token <jwt>               specify platform authorization token (default: )
  env <production|develop>  specify the environment (default: development)
```

```bash

Usage:
    si config use [options] [command]

Commands:
  apiUrl <url>  specify the hub API url (current: http://127.0.0.1:8000/api/v1)
```

### Logs configuration

```bash
Usage:
    index config set log [options]

Options:
    --debug <boolean>  specify log to show extended view (default: true)
    --format <format>  specify format between "pretty" or "json" (default: pretty)
    -h, --help         display help for command
```

## Show Scramjet Hub parameters

Allows to run programs in different data centers, computers or devices in local network

```bash
Usage:
    si hub [command] [options...]

Options:
    -h, --help  display help for command

Commands:
    list|ls     list the hubs
    info        display info about the hub
    logs        pipe running hub log to stdout
    load        monitor CPU, memory and disk usage on the Hub
    set <apiUrl>
```

## Sequence operations

Sequence (Transform Sequence) is a list of chained functions with a lightweight application business logic that contains a developer code. The minimal number is one function.

```bash
Usage:
    si seq [command] [options...]

Options:
    -h, --help                   display help for command

Commands:
    list|ls                      lists available Sequences
    pack [options] <path>        create archived file (package) with Sequence for later use
    send <package>               send package or folder to the hub
    use|select <id>              specify the hub Sequence to use (current: )
    start [options] <id>         start the Sequence with or without given arguments
    deploy|run [options] <path>  pack (if needed), send and start the Sequence
    get <id>                     obtain basic information about a Sequence
    delete|rm <id>               delete the Sequence form Hub
    prune                        remove all Sequences from the current scope (use with caution)
```

> 💡 <small>Argument id - the Sequence id to start or '-' for the last uploaded.</small>

### Start Sequence

Before starting the Sequence the package has to be prepared. The package is an archived directory with the Sequence and all its required dependencies. The package can be easily created with the command presented below.

```bash
Usage:
    si seq pack [options] <path>

Options:
  -c, --stdout                output to stdout (ignores -o)
  -o, --output <file.tar.gz>  output path - defaults to dirname
  -h, --help                  display help for command
```

After the Sequence was packed, the package is ready to be send to the Hub (STH or SCP Hub) by `si seq send <path-to-file>` command.

Now the Sequence can be executed on the Hub. The Sequence Instance will be created and run.

```bash
Usage:
    si sequence start [options] <id>

Options:
    -f, --config-file <path-to-file>   path to configuration file in JSON format to be passed to instance context
    -s, --config-string <json-string>  configuration in JSON format to be passed to instance context
    --args <json-string>               arguments to be passed to first function in Sequence
    -h, --help                         display help for command
```

All above steps can be done by single command: `si seq deploy`, so Sequence will be packed (if needed), sent and started.

```bash
Usage:
    si sequence deploy|run [options] <path>

Options:
    -o, --output <file.tar.gz>         output path - defaults to dirname
    -f, --config-file <path-to-file>   path to configuration file in JSON format to be passed to instance context
    -s, --config-string <json-string>  configuration in JSON format to be passed to instance context
    --args <json-string>               arguments to be passed to first function in Sequence
    -h, --help                         display help for command
```

## Instance operations

Instance (Sequence Instance) is a running Sequence, that can process an enormous amount of data on the fly without losing persistence.

```bash
Usage:
    si inst [command] [options...]

Options:
    -h, --help                   display help for command

Commands:
    list|ls                      list the instances
    use <id>                     select an instance to communicate with
    health <id>                  display the instance health status
    info <id>                    display info about the instance
    log <id>                     pipe running instance log to stdout
    kill <id>                    kill instance without waiting for unfinished task
    stop <id> <timeout>          end instance gracefully waiting for unfinished tasks
    input [options] <id> [file]  send file to input, if file not given the data will be read from stdin
    output <id>                  pipe running instance output to stdout
    stdio|attach <id>            listen to all stdio - stdin, stdout, stderr of a running instance
    event                        show events commands
    stdin <id> [file]            send file to stdin, if file not given the data will be read from stdin
    stderr <id>                  pipe running instances stderr stream to stdout
    stdout <id>                  pipe running instances stdout stream to stdout
```

> 💡 <small>Argument id - the instance id or '-' for the last one started or selected.</small>

### Events

```bash
Usage:
    si inst event [command] [options...]

Commands:
    emit|invoke <id> <eventName> [payload]   send event with eventName and a JSON formatted event payload
    on [options] [options] <id> <eventName>  get the last event occurrence (will wait for the first one if not yet retrieved)
```

## Topic operations

Publish/subscribe operations allows to manage data flow.

```bash

Usage:
    si topic [command] [options...]

Options:
  -h, --help                            display help for command

Commands:
  get [options] <topic-name>            get data from topic
  send [options] <topic-name> [<file>]  send data on topic from file, directory or directly through the console
```

## Docs

See the code documentation here: [scramjetorg/transform-hub/docs/cli/modules.md](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/cli/modules.md)

## Scramjet Transform Hub

This package is part of [Scramjet Transform Hub](https://www.npmjs.org/package/@scramjet/sth).

Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program, as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like.

## Use cases

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) or hop on our [Scramjet Discord](https://scr.je/join-community-mg1)!

## Some important links

* Scramjet, the company behind [Transform Hub](https://scramjet.org)
* The [Scramjet Framework - functional reactive stream processing framework](https://framework.scramjet.org)
* The [Transform Hub repo on github](https://github.com/scramjetorg/transform-hub)
* You can see the [Scramjet Transform Hub API docs here](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/api-client/README.md)
* You can see the [CLI documentation here](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/README.md), but `si help` should also be quite effective.
* Don't forget to ⭐ this repo if you like it, `subscribe` to releases and keep visiting us for new versions and updates.
* You can [open an issue - file a bug report or a feature request here](https://github.com/scramjetorg/transform-hub/issues/new/choose)

## License and contributions

This module is licensed under AGPL-3.0 license.

The Scramjet Transform Hub project is dual-licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.

## Contributions

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request. More info about our BDD test you will find [here](https://github.com/scramjetorg/transform-hub/tree/HEAD/bdd/README.md).

### Help wanted 👩‍🎓🧑👱‍♀️

The project need's your help! There's lots of work to do and we have a lot of plans. If you want to help and be part of the Scramjet team, please reach out to us, [on discord](https://scr.je/join-community-mg1) or email us: [opensource@scramjet.org](mailto:opensource@scramjet.org).

### Donation 💸

Do you like this project? It helped you to reduce time spent on delivering your solution? You are welcome to buy us a coffee ☕ Thanks a lot! 😉

[You can sponsor us on github](https://github.com/sponsors/scramjetorg)

* There's also a Paypal donation link if you prefer that:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW)




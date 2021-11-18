Scramjet Interface <!-- omit in toc -->
===

- [Scramjet tool set](#scramjet-tool-set)
  - [Download CLI](#download-cli)
  - [Download SDK](#download-sdk)
- [CLI base usage](#cli-base-usage)
  - [Login](#login)
  - [Set up config](#set-up-config)
- [Create a package](#create-a-package)
- [Sequence operations](#sequence-operations)
  - [Post](#post)
  - [List](#list)
  - [Start](#start)
  - [Delete](#delete)
  - [Seq help](#seq-help)
- [Instance operations](#instance-operations)
  - [List inst](#list-inst)
  - [Show inst data](#show-inst-data)
  - [Stop](#stop)
  - [Kill](#kill)
  - [Health status](#health-status)
  - [Instance events](#instance-events)
  - [Inst logs](#inst-logs)
- [Stdio](#stdio)
  - [Inst help](#inst-help)
- [CLI troubleshooting](#cli-troubleshooting)
  - [linux](#linux)
  - [windows](#windows)
  - [macos](#macos)

## Scramjet tool set

Scramjet platform can be managed by:

- Web Interface,
- Application Protocol Interface (API),
- Command Line Interface (CLI)

All of those are providing same level of control but usage differs.

Scramjet CLI is a tool allowing developer to control sequences and TaaS process from command line of her/his computer.

### Download CLI

CLI is not yet published, but it will be obtainable via:

- pre-compiled binary,
- node package manager - [NPM](npm_link).

Download the binary:

```bash
curl 'https://scramjet.sh/install-cli.sh' | bash -s #verify
```

Install via npm globally:

```bash
npm install -g @scramjet/cli #verify
```

<!-- [pip](pip_link) [homebrew](hb_link) -->

### Download SDK

Download [Scramjet Software Developer Kit](https://github.com/scramjetorg/transform-hub) (SDK) via GitHub to develop your code comfortably.

```bash
git clone git@github.com:scramjetorg/transform-hub
```

To build the source code you need:

- [Node.js](https://nodejs.org/en/),
- [NPM](https://www.npmjs.com/get-npm) or other package manager.

For Windows users we recommend using WSL as terminal emulator or GitBash. Powershell or default windows cmd are currently not supported.
<!-- ToDo: add SDK usage documentation -->
[Read more about SDK usage.](xxx)

## CLI base usage

Once installed CLI is available under command:

```bash
si
```

To shows the list of available commands:

```bash
si -h
```

__Result:__ a list of possible commands:

```bash
Usage: si [options...] | si [command] [options...]

General options

* `-L, --log-level <level>  Specify log level (default: "trace")`
* `-a, --api-url <url>      Specify base API url (default: "http://127.0.0.1:8000/api/v1")`
* `-h, --help               display help for command`

Commands

* `pack [options]`
* `host [command]           something`
* `config, c [command]       configuration file operations`
* `sequence, seq [command]   operations on sequence`
* `instance, inst [command]  operations on instance`
* `help [command]           display help for command`

Show sequence and instance help by providing --help option after each.

```

### Set up config

Set STH url:

```bash
si config apiUrl "http://url.to.host:8000"
```
<!--
Check out config:

```bash
> si config --list
```

If you are not able to see the result of this command check [troubleshooting](#cli-troubleshooting) section.
-->

## Create a package

Usage: `si pack [options] <directory>`

Options:

* `-c, --stdout                output to stdout (ignores -o)`
* `-o, --output <file.tar.gz>  output path - defaults to dirname`
* `-h, --help                  display help for command`

## Sequence operations

```bash
si seq run [options] [package] [args...] # Uploads a package and immediatelly executes it with given arguments
si seq send [<sequencePackage>]          # send packed and compressed sequence file
si seq list|ls                           # list the sequences
si seq start [options] <id> [args...]    # start the sequence
si seq get <id>                          # get data about the sequence
si seq delete|rm <id>                    # delete the sequence
si seq help [command]                    # display help for command
```

## Instance operations

```bash
si inst list|ls                                       # list the instances
si inst kill <id>                                     # kill instance without waiting for unfinished tasks
si inst stop <id> <timeout>                           # end instance gracefully waiting for unfinished tasks
si inst status <id>                                   # status data about the instance
si inst health <id>                                   # show the instance health status
si inst info <id>                                     # show info about the instance
si inst invokeEvent|emit <id> <eventName> [<payload>] # send event with eventName and a JSON formatted event payload
si inst event|on [options] <id> <event>               # invoke the event by eventName and optionally with message
si inst input <id> [<file>]                           # send file to input, if file not given the data will be read from stdin
si inst output <id>                                   # show stream on output
si inst log <id>                                      # show instance log
si inst attach <id>                                   # connect to all stdio - stdin, stdout, stderr of a running instance
si inst stdin <id> [<file>]                           # send file to stdin, if file not given the data will be read from stdin
si inst stderr <id>                                   # show stream on stderr
si inst stdout <id>                                   # show stream on stdout
si inst help [command]                                # display help for command
```

## CLI troubleshooting

### linux

| Problem | Possible solution|
| When I run `si` nothing is happening | ... |
| `'si' is not recognized` | ... |

### windows

| Problem | Possible solution|
| When I run `si` nothing is happening | ... |
| `'si' is not recognized` | ... |

### macos

| Problem | Possible solution|
| When I run `si` nothing is happening | ... |
| `'si' is not recognized` | ... |


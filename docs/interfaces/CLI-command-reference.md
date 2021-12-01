Scramjet Interface <!-- omit in toc -->
===

- [Scramjet tool set](#scramjet-tool-set)
  - [Download CLI](#download-cli)
- [CLI base usage](#cli-base-usage)
  - [Set up config](#set-up-config)
- [Create a package](#create-a-package)
- [Sequence operations](#sequence-operations)
- [Instance operations](#instance-operations)
- [Host operations](#host-operations)
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

<!--
CLI is not yet published, but it will be obtainable via:

- pre-compiled binary,
- node package manager - [NPM](npm_link).

Download the binary:

```bash
curl 'https://scramjet.sh/install-cli.sh' | bash -s #verify
```
-->

Install via npm globally:

```bash
npm install -g @scramjet/cli
```

<!-- [pip](pip_link) [homebrew](hb_link) -->

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
si config apiUrl "http://url.to.host:8000/api/v1"
```

Check out config:

```bash
 si config print
```

__Result:__

```bash
14:33 $ si config print
{
  configVersion: 1,
  apiUrl: 'http://127.0.0.1:8000/api/v1',
  log: false,
  format: 'pretty',
  cpmApiUrl: 'http://127.0.0.1:9000/api/v1',
  hostId: '75bd5593-7391-4200-b949-aa66d3d56b77'
}
```

If you are not able to see the result of this command check [troubleshooting](#cli-troubleshooting) section.


## Create a package

Usage: `si pack [options] <directory>`

Options:

* `-c, --stdout                output to stdout (ignores -o)`
* `-o, --output <file.tar.gz>  output path - defaults to dirname`
* `-h, --help                  display help for command`

## Sequence operations

```bash
si seq run [options] [package] [args...] # Uploads a package and immediately executes it with given arguments
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

## Host operations

```bash
si host version # display the Host version
si host load    # monitor CPU, memory and disk usage on the Host
si host logs    # display the logs of the Host.
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

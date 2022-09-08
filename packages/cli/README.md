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
  - [Global configuration](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#global-configuration)
  - [Profile configuration](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#profile-configuration)
  - [Session configuration](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#session-configuration)
  - [Config commands](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/#config-commands)
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
Usage: si [options] [command]

This is a Scramjet Command Line Interface to communicate with Transform Hub and Cloud Platform.

Options:
  -v, --version            Display current CLI version
  --config <name>          Set global configuration profile
  --config-path <path>     Set global configuration from file
  -h, --help               display help for command

Commands:
  hub                      Allows to run programs in different data centers, computers or devices in local network
  config|c                 Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings
  sequence|seq             Operations on a Sequence package, consisting of one or more functions executed one after another
  instance|inst [command]  Operations on the running Sequence
  topic                    Manage data flow through topics operations
  completion               completion operations
  util|u                   Various utilities
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

There are 3 configuration types inside CLI for different purpose:

1. Default configuration - contains default values for the Scramjet Transform Hub (STH) settings.
2. Profile configuration - contains personalized values for the Scramjet Transform Hub (STH) and Scramjet Cloud Platform settings.
3. Session configuration - contains values for the current session.

### Global configuration

**Default SI configuration** is a global configuration file used by all CLI processes. This is a basic configuration used by CLI when no other is chosen or set.

This is an example of a 'default.json' file:

```json
{
  "configVersion": 1,
  "apiUrl": "http://127.0.0.1:8000/api/v1",
  "middlewareApiUrl": "",
  "env": "development",
  "scope": "",
  "token": "",
  "log": {
    "debug": false,
    "format": "pretty"
  }
}
```

Properties description:

| Property           | Description            | Default value |
| ------------------ | -----------------------|---------------|
| `configVersion`    | A version of the config.| `1` |
| `apiUrl`           | Hub API url. Applicable only to self hosted Hub.| `"http://127.0.0.1:8000/api/v1"` |
| `middlewareApiUrl` | Scramjet Cloud Platform Space url. To be set during authorization process.| `""`   |
| `env`              | Set the environment you will work in: <br /> - `"production"` → for Scramjet Cloud Platform environment, <br /> - `"development"` → to communicate with Transform Hub (self hosted Hub environment). | `"development"` |
| `scope`            | A default scope that should be used when session starts.| `""` |
| `token`            | Scramjet Cloud Platform authorization token. To be set during authorization process.| `""` |
| `log`              | `"log"` property contains two additional properties: <br /> - `"debug"` → if error occurs stack trace can be shown/hide with the `"true"`/`"false"` option, <br /> - `"format"` → log messages display can be set to `"pretty"` or `"json"`. <br/> | `"debug"`: `false` <br/> `"format"`: `"pretty"` |

Every value can be set for every config property by using command `si config set [command]`

The CLI **development environment** communicates with the **Transform Hub**. If this is your first installation of Scramjet CLI, the environment should already be set to development since it is the default value of the CLI environment.

> 💡 <small>An environmental value that is set to production allows to use commands of the Scramjet Cloud Platform. We encourage you to [sign up for the SCP Beta](https://scramjet.org/#join-beta).</small>

If you wish to use the open source STH on your own machine, please make sure the STH API URL is set correctly in the CLI. By default the STH starts the API server on `http://0.0.0.0:8080/api/v1`. The API URL can be set in the CLI with the following command:
`si config set apiUrl http://0.0.0.0:8080/api/v1`

> 💡 <small>An URL pattern looks like this: `http://<localhost|IPaddress>:<portNumber>/api/v1`</small>

### Profile configuration

**Profile configuration** refers to all configurations that can be manipulated and set by user. Profile configuration can be provided in two ways:

  1. Path to outside configuration file provided by user (read only file, requires all configuration fields in file):
      - `si <someCliCommand> --config-path some/path/toFile`
      - `process.env: SI_CONFIG_PATH=some/path/toFile si <someCliCommand>`

      Below the example of a `profile-config.json` file saved on the disk:

      ```json
      {
      "configVersion": 1,
      "apiUrl": "http://127.0.0.1:8000/api/v1",
      "middlewareApiUrl": "https://api.beta.scramjet.cloud/api/v1",
      "env": "production",
      "scope": "",
      "token": "generatedToken",
      "log":
        {
          "debug": false,
          "format": "pretty"
        }
      }
      ```

      and its use from the command line:

      ```bash
      # check profile
      $ si c profile ls
      Available profiles:
        default
      -> production

      # check current profile settings
      $ si c p
      Current profile: production

      {
        configVersion: 1,
        apiUrl: 'http://127.0.0.1:8000/api/v1',
        middlewareApiUrl: '',
        env: 'development',
        scope: '',
        token: '',
        log: { debug: false, format: 'pretty' }
      }

      # si command execution with external profile configuration
      $ si hub info --config-path /home/user/profile-config.json
      {
        id: 'sth-0',
        info: {
          created: '2022-08-10T09:22:42.011Z',
          lastConnected: '2022-08-10T09:22:42.014Z'
        },
        healthy: true,
        isConnectionActive: true
      }
      ```

      ```bash
      $ SI_CONFIG_PATH=/home/user/profile-config.json si hub info
      {
        id: 'sth-0',
        info: {
          created: '2022-08-10T09:22:42.011Z',
          lastConnected: '2022-08-10T09:22:42.014Z'
        },
        healthy: true,
        isConnectionActive: true
      }
      ```

      The examples above show that CLI uses the external profile configuration provided by user over the configuration set in CLI profile.
      <br />
      <br />

  2. Profile name to configuration handled and manipulated by CLI resources files:
      - `si <someCliCommand> --config <profileName>`

      ```bash
      $ si c profile ls
      Available profiles:
         default
      -> production
         testing

      $ si hub version --config testing
      {
        service: '@scramjet/host',
        apiVersion: 'v1',
        version: '0.27.0',
        build: 'becd14d'
      }
      ```

      - `process.env: SI_CONFIG=profileName si <someCliCommand>`

      ```bash
      $ si c profile ls
      Available profiles:
         default
      -> production
         testing

      $ SI_CONFIG=testing si hub version
      {
        service: '@scramjet/host',
        apiVersion: 'v1',
        version: '0.27.0',
        build: 'becd14d'
      }
      ```

      - `si config profile use <profileName>` - sets a `<profileName>` as a default profile for all shells

      ```bash
      $ si config profile use testing

      $ si config profile ls
      Available profiles:
         default
         production
      -> testing
      ```

   There is always at least a default profile file ('default.json') if none of the above method is used to set config profile.
   Order of precedence for profile configuration is added (if profile config is set with many options only highest precedence is used).

   When user sets any value in `si config`, by calling `si config set [command]`, for example: `si config set log --format pretty` the changes will appear in the currently used profile. If config is provided from user file, exception will be thrown:

   ```bash
    $ si c set env development  --config-path /home/user/my-profile-config.json
    Error: Unable to write for read only configuration
   ```

   It means that `si config set [command]` will change the profile config properties only, not the properties in the config file provided by user.

   <br />

   #### Creating profiles

   <br />Profiles can be managed by a CLI command `si config profile [command]`

   <br />

   Creating profiles is optional. As mentioned before, there is always a default config available. CLI works with it when no profile is created, but it can be quite useful to have some profiles when working with multiple environments, scopes or spaces at the same time.
   This is the list of available `si config profile` commands.

   ```bash
   list|ls                       # Show available configuration profiles
   use <name>                    # Set configuration profile as default to use
   create <name>                 # Create new configuration profile
   remove <name>                 # Remove existing profile configuration
   ```

   **To create a profile:**

   1. Create a new profile using command `si config profile create <profileName>`. When creating a new profile, next to the default configuration file named 'default.json', a new configuration file named 'newProfile.json' is created with all the property values set to default. After creation, the new profile is NOT automatically set as default. You have to switch to the target profile if you want to set new values for it.
   2. List all profiles using command `si config profile list` to see your new profile on the list. The arrow points at the profile which is currently in use. Also a 'si-config.json' file indicates which profile is currently in use.
   3. Switch to the new profile using command `si config profile use profileName`
   This is how the above steps execution would look in the terminal:

   ```bash
   # list profiles
   $ si config profile ls
      Available profiles:
      -> default

   # create profile named 'production'
   $ si config profile create production

   # create profile named 'development'
   $ si config profile create development

   # list profiles
   $ si config profile ls
    Available profiles:
    -> default
      development
      production

   # switch to 'development' profile
   $ si config profile use development

   # list profiles to confirm profile change
   $ si config profile ls
    Available profiles:
      default
    -> development
      production
   ```

   4. Set new values. You can set new values in your profile by using command `si config set [command]`.
   5. Display your config content with `si config print` (too lazy to type? Roger that! Use `si c p` instead).

   ```bash
   # print out current profile config
   $ si c p
    Current profile: development

    {
      configVersion: 1,
      apiUrl: 'http://127.0.0.1:8000/api/v1',
      middlewareApiUrl: '',
      env: 'development',
      scope: '',
      token: '',
      log: { debug: false, format: 'pretty' }
    }
    # change apiUrl property value
    $ si config set apiUrl "http://127.0.0.1:9000/api/v1"

    # set debug property to true
    $ si config set log --debug true

    # set log format to json
    $ si config set log --format json

    # print out the config again to see the changes
    $ si c p
    Current profile: development
    {"configVersion":1,"apiUrl":"http://127.0.0.1:9000/api/v1","middlewareApiUrl":"","env":"development","scope":"","token":"","log":{"debug":true,"format":"json"}}
   ```

   6. Delete profile with `si config profile remove <profileName>`. If you are deleting the profile you are currently using, you will be switched to the `default` profile right after the deletion.

   ```bash
   # list profiles
   $ si config profile ls
    Available profiles:
      default
    -> development
      production

    # remove profile 'development'
    $ si config profile remove development

    # list profiles again to check if the profile was removed
    $ si config profile ls
    Available profiles:
    -> default
      production
   ```

   7. It is possible to reset all config values at once by using command `si config reset all`.

   ```bash
   # print out current profile config
   $ si c p
    Current profile: development

    {
      configVersion: 1,
      apiUrl: 'http://127.0.0.1:9000/api/v1',
      middlewareApiUrl: '',
      env: 'production',
      scope: '',
      token: '',
      log: { debug: true, format: 'pretty' }
    }

    # reset all the config values
    $ si config reset all

    # print out the config again to see the changes
    $ si c p
    Current profile: development

    {
      configVersion: 1,
      apiUrl: 'http://127.0.0.1:8000/api/v1',
      middlewareApiUrl: '',
      env: 'development',
      scope: '',
      token: '',
      log: { debug: false, format: 'pretty' }
    }
   ```

### Session configuration

**Session configuration** is a configuration used inside of CLI to handle all `lastXxx` parameters. Configuration is kept alive in terminal (shell session time of life) that uses CLI (as outcome every terminal will have it's own lastXXX params). With this solution, you can move freely between terminal sessions and communicate with your Hubs and Sequences even more effectively. <br> A session configuration file named `session-config.json` is created locally in the temporary directory named after session id, for example: `/tmp/.si-tmp/4020249`. After the session terminates, the directory is removed along with its contents. The configuration `session-config.json` file is created at the moment of initiating the command related to packing and running the Sequence. This action results in the first write to the session configuration file as a value assignment to the parameters `"lastPackagePath"`, `"lastInstanceId"` and `"lastSequenceId"`.
<br />
<br />

To print out the current session configuration, use `si config session` command.

```bash
{
  lastPackagePath: '',
  lastInstanceId: '',
  lastSequenceId: '',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '4099770'
}
```

`"lastInstanceId"` and `"lastSequenceId"` values are set automatically while running `si seq deploy` or `si seq send` and `si seq start` commands. They can be also set manually with commands:

- `si seq use <sequenceID>`

- `si inst use <instanceID>`

This becomes useful when you want to change the Sequence or Instance ID assigned to alias (`-`).

Lets set an example to show how it works.

```bash
# print out current session config
$ si config session

{
  lastPackagePath: '',
  lastInstanceId: '',
  lastSequenceId: '',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '4125483'
}

# deploy a sequence
$ si seq deploy /hello.tar.gz
SequenceClient {
  _id: '0f424150-5f01-420a-85d0-54ebf4701fc3',
  host: HostClient {
    apiBase: 'http://127.0.0.1:8000/api/v1',
    client: ClientUtils {
      apiBase: 'http://127.0.0.1:8000/api/v1',
      fetch: [Function (anonymous)],
      normalizeUrlFn: [Function: normalizeUrl]
    }
  },
  sequenceURL: 'sequence/0f424150-5f01-420a-85d0-54ebf4701fc3'
}
InstanceClient {
  host: HostClient {
    apiBase: 'http://127.0.0.1:8000/api/v1',
    client: ClientUtils {
      apiBase: 'http://127.0.0.1:8000/api/v1',
      fetch: [Function (anonymous)],
      normalizeUrlFn: [Function: normalizeUrl]
    }
  },
  _id: '907ed318-7260-47ce-9b83-6bd95da60429',
  instanceURL: 'instance/907ed318-7260-47ce-9b83-6bd95da60429'
}

# print out the session config again to check if the values have been assigned
$ si config session

{
  lastPackagePath: '',
  lastInstanceId: '907ed318-7260-47ce-9b83-6bd95da60429',
  lastSequenceId: '0f424150-5f01-420a-85d0-54ebf4701fc3',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '4125483'
}

# start the sequence again using alias `-`
$ si seq start -
InstanceClient {
  host: HostClient {
    apiBase: 'http://127.0.0.1:8000/api/v1',
    client: ClientUtils {
      apiBase: 'http://127.0.0.1:8000/api/v1',
      fetch: [Function (anonymous)],
      normalizeUrlFn: [Function: normalizeUrl]
    }
  },
  _id: '75fdb61a-e473-4af6-a0b1-59e2b6c1486b',
  instanceURL: 'instance/75fdb61a-e473-4af6-a0b1-59e2b6c1486b'
}

# check session config, after starting the sequence again, lastInstanceId is set to the new value
$ si config session

{
  lastPackagePath: '',
  lastInstanceId: '75fdb61a-e473-4af6-a0b1-59e2b6c1486b',
  lastSequenceId: '0f424150-5f01-420a-85d0-54ebf4701fc3',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '4125483'
}

# change lastInstanceId to another instance id
$ si inst use 907ed318-7260-47ce-9b83-6bd95da60429

# print out the session config again to check if the lastInstanceId has been changed
$ si config session

{
  lastPackagePath: '',
  lastInstanceId: '907ed318-7260-47ce-9b83-6bd95da60429',
  lastSequenceId: '0f424150-5f01-420a-85d0-54ebf4701fc3',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '4125483'
}
```

Configuration file `session-config.json` creation can be also initialized while [setting up the environment for Scramjet Cloud Platform](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/platform/quick-start), for example:

```bash
$ si config session
{
  lastPackagePath: '',
  lastInstanceId: '',
  lastSequenceId: '',
  lastSpaceId: '',
  lastHubId: '',
  sessionId: '340908'
}

$ si config set json '{"middlewareApiUrl": "https://api.beta.scramjet.cloud/api/v1", "env": "production", "token": "generatedToken"}'

$ si config session

Defaults set to: Space: org-a10d5cb5-4ca53c2e2a05-manager, Hub: sth-0
{
  lastPackagePath: '',
  lastInstanceId: '',
  lastSequenceId: '',
  lastSpaceId: 'org-a10d5cb5-4ca53c2e2a05-manager',
  lastHubId: 'sth-0',
  sessionId: '340908'
}
# Properties 'lastSpaceId and 'lastHubId' has been set automatically to some values.

```

Properties `lastSpaceId` and `lastHubId` can be also set manually with commands:

- `si space use <spaceId>`
- `si hub use <hubId>`

### Config Commands

`si config [command]`

```bash
   print|p                       # Print out the current configuration
   set                           # Add properties to the global config
   reset                         # Reset configuration value to default
   profile|pr                    # Select and work with user profiles
```

`si config print`

```bash
$ si c p
Current profile: default

{
  configVersion: 1,
  apiUrl: 'http://127.0.0.1:8000/api/v1',
  middlewareApiUrl: '',
  env: 'development',
  scope: '',
  token: '',
  log: { debug: false, format: 'pretty' }
}
```

`si config set [command]`

```bash
  json <json>                    # Set configuration properties from a json object
  apiUrl <url>                   # Specify the Hub API Url
  log [options]                  # Specify log options
  middlewareApiUrl <url>         # Specify middleware API url
  scope <name>                   # Specify default scope that should be used when session starts
  token <jwt>                    # Specify platform authorization token
  env <production|development>   # Specify the environment
```

`si config reset [command]`

```bash
  apiUrl                         # Reset apiUrl
  log                            # Reset logger
  middlewareApiUrl               # Reset middlewareApiUrl
  token                          # Reset token
  env                            # Reset env
  all                            # Reset all configuration
```

`si config profile [command]`

```bash
  list|ls                       # Show available configuration profiles
  use <name>                    # Set configuration profile as default to use
  create <name>                 # Create new configuration profile
  remove <name>                 # Remove existing profile configuration
```







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
Usage: index sequence|seq [command] [options...]

Operations on a Sequence package, consisting of one or more functions executed one after another

Options:
  -h, --help                   display help for command

Commands:
  list|ls                      Lists all available Sequences
  pack [options] <path>        Create archived file (package) with the Sequence for later use
  send [options] <package>     Send the Sequence package to the Hub
  update <query> <package>     Updates sequence with given name
  use|select <id>              Select the Sequence to communicate with by using '-' alias instead
                               of Sequence id
  start [options] <id>         Start the Sequence with or without given arguments
  deploy|run [options] <path>  Pack (if needed), send and start the Sequence
  get <id>                     Obtain a basic information about the Sequence
  delete|rm <id>               Delete the Sequence from the Hub
  prune [options]              Remove all Sequences from the current scope (use with caution)
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

Hub accepts only Sequence package that is compressed into `*tar.gz` format. Command `si seq send <path-to-file>` will pack the directory (if it wasn't packed earlier) and send it to the Hub (STH or SCP Hub).

Now the Sequence can be executed on the Hub. The Sequence Instance will be created and run.

```bash
Usage: si sequence start [options] <id>

Start the Sequence with or without given arguments

Arguments:
  id                                 Sequence id to start or '-' for the last uploaded

Options:
  -f, --config-file <path-to-file>   Path to configuration file in JSON format to be passed to the
                                     Instance context
  -s, --config-string <json-string>  Configuration in JSON format to be passed to the Instance
                                     context
  --output-topic <string>            Topic to which the output stream should be routed
  --input-topic <string>             Topic to which the input stream should be routed
  --args <json-string>               Arguments to be passed to the first function in the Sequence
  --limits <json-string>             Instance limits
  -h, --help                         display help for command
```

All above steps can be done by single command: `si seq deploy`, so Sequence will be packed (if needed), sent and started.

```bash
Usage:
    si sequence deploy|run [options] <path>

Pack (if needed), send and start the Sequence

Options:
  -o, --output <file.tar.gz>         Output path - defaults to dirname
  -f, --config-file <path-to-file>   Path to configuration file in JSON format to be passed to the
                                     Instance context
  -s, --config-string <json-string>  Configuration in JSON format to be passed to the Instance
                                     context
  --args <json-string>               Arguments to be passed to the first function in the Sequence
  -h, --help                         display help for command
```

## Instance operations

Instance (Sequence Instance) is a running Sequence, that can process an enormous amount of data on the fly without losing persistence.

```bash
Usage:
    si inst [command] [options...]

Operations on the running Sequence

Options:
  -h, --help                   display help for command

Commands:
  list|ls                      List the Instances
  use <id>                     Select the Instance to communicate with by using '-' alias instead
                               of Instance id
  health <id>                  Display Instance health status
  info <id>                    Display the info about the Instance
  log <id>                     Pipe the running Instance log to stdout
  kill <id>                    Kill the Instance without waiting for the unfinished task
  stop <id> <timeout>          End the Instance gracefully waiting for the unfinished tasks
  input [options] <id> [file]  Send a file to input, if no file given the data will be read
                               directly from the console input (stdin)
  output <id>                  Pipe the running Instance output to stdout
  stdio|attach <id>            Listen to all stdio - stdin, stdout, stderr of the running Instance
  event                        Show event commands
  stdin <id> [file]            Send a file to stdin, if no file given the data will be read from
                               stdin
  stderr <id>                  Pipe the running Instance stderr stream to stdout
  stdout <id>                  Pipe the running Instance stdout stream to stdout
```

> 💡 <small>Argument id - the instance id or '-' for the last one started or selected.</small>

### Events

```bash
Usage:
    si inst event [command] [options...]

Show event commands

Options:
  -h, --help                              display help for command

Commands:
  emit|invoke <id> <eventName> [payload]  Send event with eventName and a JSON formatted event
                                          payload
  on [options] <id> <eventName>           Get the last event occurrence (will wait for the first
                                          one if not yet retrieved)
```

## Topic operations

Publish/subscribe operations allow to manage data flow.

```bash

Usage:
    si topic [command] [options...]

Manage data flow through topics operations

Options:
  -h, --help                            display help for command

Commands:
  get [options] <topic-name>            Get data from topic
  send [options] <topic-name> [<file>]  Send data on topic from file, directory or directly
                                        through the console
  ls                                    List information about topics
```

## Docs

See the code documentation here: [scramjetorg/transform-hub/docs/cli/modules.md](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/cli/modules.md)

To find out more about Scramjet Interface, please check out our official [documentation website](https://docs.scramjet.org/platform/cli-reference).

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




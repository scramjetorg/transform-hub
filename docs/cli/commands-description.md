## $ si completion

**Description**

Completion operations

**Usage**

`si completion [options] [command]`

**Options**

*  -h, --help  Display help for command

---

## $ si completion install

**Description**

Installs bash completion script

**Usage**

`si completion install [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si completion uninstall

**Description**

Uninstalls bash completion script

**Usage**

`si completion uninstall [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si config | c

**Description**

Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings

**Usage**

`si config [command] `

**Options**

*  -h, --help               Display help for command

---

## $ si config print | p

**Description**

Print out the current profile configuration

**Usage**

`si config print [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config session | s

**Description**

Print out the current session configuration

**Usage**

`si config session [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config set

**Description**

Set property value in the current profile config

**Usage**

`si config set [options] [command]`

**Options**

*  -h, --help                    Display help for command

---

## $ si config set json

**Description**

Set configuration properties from a json object

**Usage**

`si config set json [options] <json>`

**Options**

*  -h, --help               Display help for command

---

## $ si config set apiUrl

**Description**

Specify the Hub API Url

**Usage**

`si config set apiUrl [options] <url>`

**Options**

*  -h, --help               Display help for command

---

## $ si config set log

**Description**

Specify log options

**Usage**

`si config set log [options]`

**Options**

*  --debug <boolean>        Specify log to show extended view
*  --format <format>        Specify format between "pretty" or "json"
*  -h, --help               Display help for command

---

## $ si config set middlewareApiUrl

**Description**

Specify middleware API url

**Usage**

`si config set middlewareApiUrl [options] <url>`

**Options**

*  -h, --help               Display help for command

---

## $ si config set scope

**Description**

Specify default scope that should be used when session start

**Usage**

`si config set scope [options] <name>`

**Options**

*  -h, --help               Display help for command

---

## $ si config set token

**Description**

Specify platform authorization token

**Usage**

`si config set token [options] <jwt>`

**Options**

*  -h, --help               Display help for command

---

## $ si config set env

**Description**

Specify the environment

**Usage**

`si config set env [options] <production|development>`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset

**Description**

Reset property value to default in the current profile config

**Usage**

`si config reset [options] [command]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset apiUrl

**Description**

Reset apiUrl

**Usage**

`si config reset apiUrl [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset log

**Description**

Reset logger

**Usage**

`si config reset log [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset middlewareApiUrl

**Description**

Reset middlewareApiUrl

**Usage**

`si config reset middlewareApiUrl [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset token

**Description**

Reset token

**Usage**

`si config reset token [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset env

**Description**

Reset env

**Usage**

`si config reset env [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config reset all

**Description**

Reset all configuration

**Usage**

`si config reset all [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config profile | pr

**Description**

Select and work with user profiles

**Usage**

`si config profile [options] [command]`

**Options**

*  -h, --help               Display help for command

---

## $ si config profile list | ls

**Description**

Show available configuration profiles

**Usage**

`si config profile list [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si config profile use

**Description**

Set configuration profile as default to use

**Usage**

`si config profile use [options] <name>`

**Options**

*  -h, --help               Display help for command

---

## $ si config profile create

**Description**

Create new configuration profile

**Usage**

`si config profile create [options] <name>`

**Options**

*  -h, --help               Display help for command

---

## $ si config profile remove

**Description**

Remove existing profile configuration

**Usage**

`si config profile remove [options] <name>`

**Options**

*  -h, --help               Display help for command

---

## $ si scope | s

**Description**

/This functionality is under development./ Manage scopes that store pairs of spaces and Hubs used when working

**Usage**

`si scope [command] [options...]`

**Options**

*  -h, --help     Display help for command

---

## $ si scope list | ls

**Description**

List all created scopes

**Usage**

`si scope list [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si scope print

**Description**

See json file under the scope

**Usage**

`si scope print [options] <name>`

**Options**

*  -h, --help  Display help for command

---

## $ si scope use

**Description**

Work on the selected scope

**Usage**

`si scope use [options] <name>`

**Options**

*  -h, --help  Display help for command

---

## $ si scope delete

**Description**

Delete specific scope

**Usage**

`si scope delete [options] <name>`

**Options**

*  -h, --help  Display help for command

---

## $ si space | spc

**Description**

Operations on grouped and separated runtime environments that allow sharing the data within them

**Usage**

`si space [command] [options...]`

**Options**

*  -c, --stdout                Output to stdout (ignores -o)
*  -o, --output <file.tar.gz>  Output path - defaults to dirname
*  -h, --help                  Display help for command

---

## $ si space info

**Description**

Display info about the default space

**Usage**

`si space info [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si space list | ls

**Description**

List all existing spaces

**Usage**

`si space list [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si space use

**Description**

Use the space

**Usage**

`si space use [options] <name>`

**Options**

*  -h, --help  Display help for command

---

## $ si space audit

**Description**

Fetch all audit messages from spaces

**Usage**

`si space audit [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si space logs

**Description**

Fetch all logs from space

**Usage**

`si space logs [options] [<space_name>]`

**Arguments**

*  <space_name>  The name of the space (defaults to current space)

**Options**

*  -h, --help    Display help for command

---

## $ si space version

**Description**

Display space version

**Usage**

`si space version [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si space access

**Description**

Manages Access Keys for active Space

**Usage**

`si space access [options] [command]`

**Options**

*  -h, --help            Display help for command

---

## $ si space access create

**Description**

Create Access key for adding Hubs to active Space, i.e "Army of Darkness"

**Usage**

`si space access create [options] <description>`

**Arguments**

*  description  Key description

**Options**

*  -h, --help   Display help for command

---

## $ si space access list | ls

**Description**

List Access Keys metadata in active Space

**Usage**

`si space access list [options]`

**Options**

*  -h, --help  Display help for command

---

## $ si space access revoke

**Description**

Revokes Access Key in active Space

**Usage**

`si space access revoke [options]`

**Options**

*  --id <id>   revoke specified key
*  --all       Removes all access keys and disconnects all self-hosted Hubs connected to Space
*  -h, --help  Display help for command

---

## $ si hub

**Description**

Allows to run programs in different data centers, computers or devices in local network

**Usage**

`si hub [command] [options...]`

**Options**

*  -h, --help                         Display help for command

---

## $ si hub use

**Description**

Specify the default Hub you want to work with, all subsequent requests will be sent to this Hub

**Usage**

`si hub use [options] <name|id>`

**Options**

*  -h, --help               Display help for command

---

## $ si hub list | ls

**Description**

List all the Hubs in the default space

**Usage**

`si hub list [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si hub info

**Description**

Display info about the default Hub

**Usage**

`si hub info [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si hub disconnect

**Description**

Disconnect self hosted Hubs from space

**Usage**

`si hub disconnect [options] <space_name>`

**Arguments**

*  space_name               The name of the Space

**Options**

*  --id <id>                Hub Id
*  --all                    Disconnects all self-hosted Hubs connected to Space (default: false)
*  -h, --help               Display help for command

---

## $ si hub delete | rm

**Description**

Delete self hosted Hub from space

**Usage**

`si hub delete [options] <id>`

**Arguments**

*  id                       Hub Id

**Options**

*  -f, --force              Enable deleting Hubs that are not disconnected (default: false)
*  -h, --help               Display help for command

---

## $ si hub logs

**Description**

Pipe running Hub log to stdout

**Usage**

`si hub logs [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si hub audit

**Description**

Pipe running Hub audit information to stdout

**Usage**

`si hub audit [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si hub load

**Description**

Monitor CPU, memory and disk usage on the Hub

**Usage**

`si hub load [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si hub version

**Description**

Display version of the default Hub

**Usage**

`si hub version [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si sequence | seq

**Description**

Operations on a Sequence package, consisting of one or more functions executed one after another

**Usage**

`si sequence [command] [options...]`

**Options**

*  -h, --help                   Display help for command

---

## $ si sequence list | ls

**Description**

List all Sequences available on Hub

**Usage**

`si sequence list [options]`

**Options**

*  -n, --name <sequence-name>  list id's of sequences with a given name
*  -h, --help                  Display help for command

---

## $ si sequence use | select

**Description**

Select the Sequence to communicate with by using '-' alias instead of Sequence id

**Usage**

`si sequence use [options] <id>`

**Arguments**

*  id                       Sequence id

**Options**

*  -h, --help               Display help for command

---

## $ si sequence info

**Description**

Display a basic information about the Sequence

**Usage**

`si sequence info [options] <id>`

**Arguments**

*  id                       Sequence id to start or '-' for the last uploaded

**Options**

*  -h, --help               Display help for command

---

## $ si sequence pack

**Description**

Create archived file (package) with the Sequence for later use

**Usage**

`si sequence pack [options] <path>`

**Options**

*  -c, --stdout                Output to stdout (ignores -o)
*  -o, --output <file.tar.gz>  Output path - defaults to dirname
*  -h, --help                  Display help for command

---

## $ si sequence send

**Description**

Send the Sequence package to the Hub

**Usage**

`si sequence send [options] <package>`

**Arguments**

*  package                  The file or directory to upload or '-' to use the last packed. If directory, it will be packed and sent.

**Options**

*  -h, --help               Display help for command

---

## $ si sequence update

**Description**

Update Sequence with given name

**Usage**

`si sequence update [options] <query> <package>`

**Arguments**

*  query                    Sequence id to be overwritten
*  package                  The file to upload

**Options**

*  -h, --help               Display help for command

---

## $ si sequence start

**Description**

Start the Sequence with or without given arguments

**Usage**

`si sequence start [options] <id>`

**Arguments**

*  id                                 Sequence id to start or '-' for the last uploaded

**Options**

*  -f, --config-file <path-to-file>   Path to configuration file in JSON or YAML format to be passed to the Instance context
*  -s, --config-string <json-string>  Configuration in JSON format to be passed to the Instance context
*  --inst-id <string>                 Start Sequence with a custom Instance Id. Should consist of 36 characters
*  --output-topic <string>            Topic to which the output stream should be routed
*  --input-topic <string>             Topic to which the input stream should be routed
*  --args <json-string>               Arguments to be passed to the first function in the Sequence
*  --startup-config <path-to-config>  Path to startup config (JSON or YAML)
*  --limits <json-string>             Instance limits
*  -h, --help                         Display help for command

---

## $ si sequence deploy | run

**Description**

Pack (if needed), send and start the Sequence

**Usage**

`si sequence deploy [options] <path>`

**Options**

*  -o, --output <file.tar.gz>         Output path - defaults to dirname
*  -f, --config-file <path-to-file>   Path to configuration file in JSON or YAML format to be passed to the Instance context
*  -s, --config-string <json-string>  Configuration in JSON format to be passed to the Instance context
*  --inst-id <string>                 Start Sequence with a custom Instance Id. Should consist of 36 characters
*  --output-topic <string>            Topic to which the output stream should be routed
*  --input-topic <string>             Topic to which the input stream should be routed
*  --args <json-string>               Arguments to be passed to the first function in the Sequence
*  --startup-config <path-to-config>  Path to startup config (JSON or YAML)
*  --limits <json-string>             Instance limits
*  -h, --help                         Display help for command

---

## $ si sequence delete | rm

**Description**

Removes the Sequence from the Hub

**Usage**

`si sequence delete [options] <id>`

**Arguments**

*  id                       The Sequence id to remove or '-' for the last uploaded

**Options**

*  -f, --force              Forcefully removes The Sequence by killing its Instances
*  -h, --help               Display help for command

---

## $ si sequence prune

**Description**

Remove all Sequences from the Hub (use with caution)

**Usage**

`si sequence prune [options]`

**Options**

*  -f,--force               Removes also active Sequences (with its running Instances)
*  -h, --help               Display help for command

---

## $ si instance | inst

**Description**

Operations on the running Sequence

**Usage**

`si instance [command] [options...]`

**Options**

*  -h, --help                   Display help for command

---

## $ si instance list | ls

**Description**

List all Instances

**Usage**

`si instance list [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si instance use

**Description**

Select the Instance to communicate with by using '-' alias instead of Instance id

**Usage**

`si instance use [options] <id>`

**Arguments**

*  id                       Instance id

**Options**

*  -h, --help               Display help for command

---

## $ si instance info

**Description**

Display a basic information about the Instance

**Usage**

`si instance info [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance health

**Description**

Display Instance health status

**Usage**

`si instance health [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started

**Options**

*  -h, --help               Display help for command

---

## $ si instance log

**Description**

Pipe the running Instance log to stdout

**Usage**

`si instance log [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance kill

**Description**

Kill the Instance without waiting for the unfinished task

**Usage**

`si instance kill [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started

**Options**

*  --removeImmediately      Remove instance from all flows right after kill
*  -h, --help               Display help for command

---

## $ si instance stop

**Description**

End the Instance gracefully waiting for the unfinished tasks

**Usage**

`si instance stop [options] <id> <timeout>`

**Arguments**

*  id                       Instance id or '-' for the last one started
*  timeout                  Timeout in milliseconds

**Options**

*  -h, --help               Display help for command

---

## $ si instance restart

**Description**

Kills the instance and start the new one from root sequence

**Usage**

`si instance restart [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance input

**Description**

Send a file to input, if no file given the data will be read directly from the console input (stdin)

**Usage**

`si instance input [options] <id> [file]`

**Arguments**

*  id                          Instance id or '-' for the last one started or selected
*  file                        File with data

**Options**

*  -t, --content-type <value>  Content-Type (default: "text/plain")
*  -e, --end                   Close the input stream of the Instance when this stream ends, "x-end-stream" header (default: false)
*  -h, --help                  Display help for command

---

## $ si instance inout

**Description**

See input and output

**Usage**

`si instance inout [options] <id> [file]`

**Arguments**

*  id                                Instance id or '-' for the last one started or selected
*  file                              File with data

**Options**

*  -t,--content-type <content-type>  Content-Type (choices: "text/plain", "application/octet-stream", "application/x-ndjson")
*  -e, --end                         Close the input stream of the Instance when this stream ends, "x-end-stream" header (default:
*                                    false)
*  -h, --help                        Display help for command

---

## $ si instance output

**Description**

Pipe the running Instance output to stdout

**Usage**

`si instance output [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance stdio | attach

**Description**

Listen to all stdio - stdin, stdout, stderr of the running Instance

**Usage**

`si instance stdio [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance event

**Description**

Show event commands

**Usage**

`si instance event [options] [command]`

**Options**

*  -h, --help                              Display help for command

---

## $ si instance event emit | invoke

**Description**

Send event with eventName and a JSON formatted event payload

**Usage**

`si instance event emit [options] <id> <eventName> [payload]`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected
*  eventName                The event name
*  payload                  Pass a JSON data to the Instance

**Options**

*  -h, --help               Display help for command

---

## $ si instance event on

**Description**

Get the last event occurrence (will wait for the first one if not yet retrieved)

**Usage**

`si instance event on [options] <id> <eventName>`

**Arguments**

*  id                       The instance id or '-' for the last one started or selected
*  eventName                The event name

**Options**

*  -n, --next               Wait for the next event occurrence
*  -s, --stream             Stream the events (the stream will start with last event)
*  -h, --help               Display help for command

---

## $ si instance stdin

**Description**

Send a file to stdin, if no file given the data will be read from stdin

**Usage**

`si instance stdin [options] <id> [file]`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected
*  file                     The input file (stdin if not given default)

**Options**

*  -h, --help               Display help for command

---

## $ si instance stderr

**Description**

Pipe the running Instance stderr stream to stdout

**Usage**

`si instance stderr [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si instance stdout

**Description**

Pipe the running Instance stdout stream to stdout

**Usage**

`si instance stdout [options] <id>`

**Arguments**

*  id                       Instance id or '-' for the last one started or selected

**Options**

*  -h, --help               Display help for command

---

## $ si topic

**Description**

Manage data flow through topics operations

**Usage**

`si topic [command] [options...]`

**Options**

*  -h, --help                          Display help for command

---

## $ si topic create

**Description**

Create topic

**Usage**

`si topic create [options] <topic-name>`

**Options**

*  -t, --content-type [content-type]  Specifies type of data in topic (choices: "text/x-ndjson", "application/x-ndjson",
*                                     "text/plain", "application/octet-stream", default: "application/x-ndjson")
*  -h, --help                         Display help for command

---

## $ si topic delete | rm

**Description**

Delete topic

**Usage**

`si topic delete [options] <topic-name>`

**Options**

*  -h, --help               Display help for command

---

## $ si topic get

**Description**

Get data from topic

**Usage**

`si topic get [options] <topic-name>`

**Options**

*  -t, --content-type [content-type]  Specifies type of data in topic (choices: "text/x-ndjson", "application/x-ndjson",
*                                     "text/plain", "application/octet-stream", default: "application/x-ndjson")
*  -h, --help                         Display help for command

---

## $ si topic send

**Description**

Send data on topic from file, directory or directly through the console

**Usage**

`si topic send [options] <topic-name> [file]`

**Options**

*  -t, --content-type [content-type]  Specifies type of data in topic (choices: "text/x-ndjson", "application/x-ndjson",
*                                     "text/plain", "application/octet-stream", default: "application/x-ndjson")
*  -h, --help                         Display help for command

---

## $ si topic ls

**Description**

List information about topics

**Usage**

`si topic ls [options]`

**Options**

*  -h, --help               Display help for command

---

## $ si util | u

**Description**

Various utilities

**Usage**

`si util [options] [command]`

**Options**

*  -h, --help               Display help for command

---

## $ si util log-format | lf

**Description**

Colorizes and prints out nice colorful log files

**Usage**

`si util log-format [options]`

**Options**

*  --no-color  Do not colorize the values
*  -h, --help  Display help for command

---


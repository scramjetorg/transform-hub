[Back](README.md)

Stream protocol and API usage <!-- omit in toc -->
===

## Table of Contents <!-- omit in toc -->

- [Introduction](#introduction)
- [Communication channels](#communication-channels)
- [Type of streams](#type-of-streams)
  - [Upstream Streams](#upstream-streams)
  - [Downstream Streams](#downstream-streams)
- [Control Messages](#control-messages)
  - [Send event](#send-event)
  - [Monitoring rate](#monitoring-rate)
  - [Start sequence](#start-sequence)
  - [Stop sequence](#stop-sequence)
  - [Kill sequence](#kill-sequence)
- [Monitor Messages](#monitor-messages)
  - [Monitoring health check](#monitoring-health-check)
  - [Status](#status)
  - [Event](#event)
- [Host Log](#host-log)

## Introduction

**Stream protocol** is used to communicate and push data through Cloud Server Instance (STH). Streams are piped to proper communication channel, which are grouped (multiplexed) as interleaved data packets to travel from Host to Runner. All the communication takes place thanks to `CommunicationHandler` class.

**Cloud Server Host** on initialization of a new Sequence and a Sequence Instance based on passed parameters, like: `package stream`, `application config` (package.json) and `sequence arguments`, creates `downstream` and `upstream`. Both arrays of streams are hooked (hookUpstreamStreams, hookDownstreamStreams, hookLogStream) to proper communication channel.

Next it pipes monitor stream from host and from runner so that both can talk to each other. Communication starts from a handshake. Runner sends ping to say 'Hello there', a host sends back pong saying 'Hi, I'm ready to talk'.

At the end of its initiation CSH creates `Net Server` and `Api Server`.

Links to the description in model modules:

- [CommunicationHandler](../model/classes/communicationhandler.md)
- [downstreams](../model/classes/communicationhandler.md#downstreams)
- [upstreams](../model/classes/communicationhandler.md#upstreams)
- [Net Server](..)
- [Api Server](..)

## Communication channels

List of channels:

- [0] `STDIN`,
- [1] `STDOUT`,
- [2] `STDERR`,
- [3] `CONTROL`,
- [4] `MONITORING`,
- [5] `PACKAGE`,
- [6] `TO_SEQ`,
- [7] `FROM_SEQ`,
- [8] `LOG`

## Type of streams

| STREAM  | DESCRIPTION                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| stdin   | process.stdin                                                                                                                        |
| stdout  | process.stdout                                                                                                                       |
| stderr  | process.stderr                                                                                                                       |
| control | Used for sending events like: kill, stop, etc. and info about sequence configuration.                                                |
| monitor | Contains all information about a sequence like description, status, feedback from all performed operations, etc.                     |
| pkg     | Contains sequence stream with a config file which is sent to the runner.                                                             |
| input   | An optional input stream transporting data for processing to the Sequence.                                                           |
| output  | An optional output stream transporting data processed by the Sequence, piped to runner - if none passed, `this.stdout` will be used. |
| log     | Log channel is for all kinds of log messages not only for development purposes but also for messages defined in sequence.            |

[Read more about node processes =>](https://nodejs.org/api/process.html#process_process_stdin)

Streams can be managed by user via cURL. Example:

```bash
curl -H "Content-Type: application/type_xx" localhost:8000/api/v1/xxx/
```

CMD options that good to know:

- -H (`--header`): `<header/@file>` pass custom header(s) to server
- -d (`--data`): `<data>` HTTP POST data
- -X POST (`--request`): `<POST>` specify POST when there is no data provided `-d`
- -X GET (`--request`): `<GET>` specify GET, if no data provided `-d` GET is default
- -v (`--verbose`): make the operation more talkative
- `jq` - JSON formatting to read data by human.

```bash
sudo apt-get install jq
```

[Check out more about ./jq](https://stedolan.github.io/jq/manual/)

To send a package use below command (stream pkg).

```bash
curl -H "Content-Type: application/octet-stream" --data-binary "@home/user/package.tar.gz" http://localhost:8000/api/v1/sequence -v
```

or

```bash
SEQ_ID=$( \
    curl -H 'content-type: application/octet-stream' \
    --data-binary '@packages/samples/hello-alice-out.tar.gz' \
    "http://localhost:8000/api/v1/sequence" | jq ".id" -r \
)
```

As a response the `sequence_id` will be received. Copy it and use to start the sequence via command:

```bash
curl -X POST -H "Content-Type: application/json"  http://localhost:8000/api/v1/sequence/:id/start -v
```

or in the other way with params (no need to copy):

```bash
INSTANCE_ID=$(curl -H "Content-Type: application/json" \
--data-raw '{"appConfig": {},"args": ["/package/data.json"]}' \
http://localhost:8000/api/v1/sequence/$SEQ_ID/start | jq ".id" -r)
```

To check all uploaded sequences run in CMD:

```bash
curl -H "Content-Type: application/json" localhost:8000/api/v1/sequences/ -v
```

In a response JSON object will be displayed. Response example:

```json
{
  "va+RikUw+2u23ZtPH2fPenB1mSoxSOrl": {
    "id": "va+RikUw+2u23ZtPH2fPenB1mSoxSOrl",
    "config": {
      "image": "scramjetorg/runner:0.10.0",
      "version": "",
      "engines": {
        "node": ">=10",
        "scramjet": ">=0.9"
      },
      "sequencePath": "index",
      "packageVolumeId": "d33cf047628a03d403318f58462ac25a537aeaa94a49ec7505324b352d7ab80a"
    }
  }
}
```

You can also check all running instances. In a response JSON object will be displayed.

```bash
curl -H "Content-Type: application/json" localhost:8000/api/v1/instances/ -v
```

Send additional input:

```bash
curl -H "Content-Type: application/octet-stream" --data-binary "@home/user/test.txt" http://localhost:8000/api/v1/stream/input -v
```

Check the output:

```bash
curl -X GET -H "Content-Type: application/octet-stream" "http://localhost:8000/api/v1/instance/$INSTANCE_ID/stdout" \
```

### Upstream Streams

Streams that are coming from Host to Runner.

- **stdin**: `Readable`
- **stdout**: `Writable`
- **stderr**: `Writable`
- **control**: `ReadableStream`
- **monitor**: `WritableStream`
- **pkg**: `Readable`
- **input**: `ReadableStream`
- **output**: `WritableStream`
- **log**: `WritableStream`

### Downstream Streams

Streams that are coming from Runner to Host.

- **stdin**: `Writable`
- **stdout**: `Readable`
- **stderr**: `Readable`
- **control**: `WritableStream`
- **monitor**: `ReadableStream`
- **pkg**: `Readable`
- **input**: `WritableStream`
- **output**: `ReadableStream`
- **log**: `ReadableStream`

## Control Messages

Control the sequence and send data to it via messages described below.

| CODE                | DESCRIPTION                                                                                          | TO     |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| FORCE_CONFIRM_ALIVE | Confirm that sequence is alive when it is not responding.                                            | Runner |
| KILL                | Send kill running sequence signal.                                                                   | Runner |
| MONITORING_RATE     | Used to change the sequence monitoring rate.                                                         | Runner |
| STOP                | Send stop the running sequence signal.                                                               | Runner |
| EVENT               | Send event name and any object, array, function to the sequence.                                     | Runner |
| PONG                | Acknowledge message from CSH to Runner. The message includes the Sequence configuration information. | Runner |

### Send event

Event contains `<eventName>`, `<handler>` with optional `<message>` of *any type*: `string`, `num`, `json` `obj`, `array`, etc..

```bash
curl -H "Content-Type: application/json" -d "[5001, { 'eventName', function(message) }]" http://localhost:8000/api/v1/sequence/_event
```

### Monitoring rate

Pass as a message `<rate_number>` in milliseconds.

```bash
curl -H "Content-Type: application/json" -d "[3001, { 2000 }]" http://localhost:8000/api/v1/sequence/_monitoring_rate
```

### Start sequence

Not implemented.

```bash
curl -H "Content-Type: application/json" -d "[]" http://localhost:8000/api/v1/sequence/_start
```

### Stop sequence

No message needed, pass proper code with empty object.

```bash
curl -H "Content-Type: application/json" -d "[4001, {}]" http://localhost:8000/api/v1/sequence/_stop
```

### Kill sequence

No message needed, pass proper code with empty object.

```bash
curl -H "Content-Type: application/json" -d "[4002, {}]" http://localhost:8000/api/v1/sequence/_kill
```

## Monitor Messages

| CODE              | DESCRIPTION                                                                                                                                    | TO           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| ACKNOWLEDGE       | Indicating whether the command with message (e.g. stop or kill) was received.                                                                  | Host         |
| DESCRIBE_SEQUENCE | Includes info of stream mode, name, description and scalability of each subsequence.                                                           | Runner       |
| STATUS            | Includes info of host address, instance_id, sequence modifications, health checks, data time flow, etc.                                        | Host         |
| ALIVE             | Information on how much longer the Sequence will be active (in milliseconds).                                                                  | Host         |
| ERROR             | All errors that occur.                                                                                                                         | Runner, Host |
| MONITORING        | Contains messages about sequence health and information about instance resource usage like: cpu, memory, memory usage, net i/o, and disk size. | Host         |
| EVENT             | Execute defined event in sequence with additional message as a parameter.                                                                      | Runner       |
| PING              | Check if a runner is ready to communicate with.                                                                                                | Runner       |
| SNAPSHOT_RESPONSE | Status about snapshot communicates if snapshot is done created without error.                                                                  | Host         |
| SEQUENCE_STOPPED  | Status about sequence communicates if it is running or not.                                                                                    | Host         |

### Monitoring health check

Information about the Sequence overall health (including information about functions).

```bash
cat test.txt | curl -H "Content-Type: application/json" -d "[5001, {2000}]" http://localhost:8000/api/v1/sequence/health
```

```json
{
    "healthy": true,
    "sequences": [{
        "throughput": 0.1,
        "buffer": 0,
        "processing": 3,
        "pressure": 30
    }]
}
```

1. **Throughput**: The number of bits per second that are physically delivered. Measure items per second.
2. **Buffer**: Performed the reading and writing operations of the stream. Measure input and output.
3. **Processing**: The collection and manipulation of items, data to produce meaningful information.
4. **Pressure**: How effectively the data in buffers is being allocated and consumed. Measure stream in all socket tcp.

### Status

```bash
curl -H "Content-Type: application/json" -d "{}" http://localhost:8000/api/v1/sequence/status
```

### Event

Event contains `<eventName>` with optional `<message>`.

```bash
curl -H "Content-Type: application/json" -d "{'event_name', message}" http://localhost:8000/api/v1/sequence/event
```

---

Links to description in model modules:

- [ACKNOWLEDGE](../model/modules.md#acknowledgemessage)
- [DESCRIBE_SEQUENCE](../model/modules.md#describesequencemessage)
- [STATUS](../model/modules.md#statusmessage)
- [ALIVE](../model/modules.md#keepalivemessage)
- [ERROR](../model/modules.md)
- [MONITORING](../model/modules.md)
- [EVENT](../model/modules.md)
- [PING](../model/modules.md)
- [SNAPSHOT_RESPONSE](../model/modules.md)
- [SEQUENCE_STOPPED](../model/modules.md)

## Host Log

Not implemented.

```bash
curl -H "Content-Type: application/json" -d "{}" http://localhost:8000/api/v1/stream/logs
```

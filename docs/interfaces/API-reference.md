<!--

---
slug: "/docs/api-reference"
title: Scramjet Transform Hub API
description: Scramjet Transform Hub API
type: "docs"
---

-->

<!-- markdownlint-disable-file MD033 -->

# Scramjet Transform Hub API <!-- omit in toc -->

- [Sequence operations](#sequence-operations)
- [Instance basic operations](#instance-basic-operations)
- [Instance advanced operation](#instance-advanced-operation)
- [Service Discovery: Topics](#service-discovery-topics)
- [Host operations](#host-operations)

## Sequence operations

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/sequence</code> <small>- add new sequence</small>
</summary>

<br><strong>**Parameters**</strong>

| Name      | Description                         | Type   | Required |
| --------- | ----------------------------------- | ------ | -------- |
| file      | compressed package in tar.gz format | binary | yes      |
| appConfig | additional package.json config file | json   | no       |

<strong>Responses</strong>

<small>Status: 202 Accepted</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0" // sequence id
}
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/sequences</code> <small>- show list of sequences</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "instances": [
      "742d2713-7ab6-4cde-82f3-a7beabdd4e98"       // list of sequence instances
    ],
    "id": "bdef63db-d3a0-45c8-85db-e94ebb96097f",  // sequence id
    "config": {
      "container": {
        "image": "scramjetorg/runner:0.12.2",
        "maxMem": 512
      },
      "name": "@scramjet/transform-hub",
      "version": "0.12.2",
      "engines": {},
      "config": {},
      "sequencePath": "index.js",
      "packageVolumeId": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
    }
  }
]
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/sequence/:id/start</code> <small>- start chosen sequence</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name      | Description                                           | Type | Required |
| --------- | ----------------------------------------------------- | ---- | -------- |
| appConfig | additional package.json config file                   | json | no       |
| args      | additional arguments that instance should starts with | json | no       |

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
  "id": "681c856e-dfa4-46a1-951d-47b27345552e"
}
```

</details>

<details open>
<summary>
    <strong>[ DELETE ]</strong> <code>/api/v1/sequence/:id</code> <small>- delete a sequence by id</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 200 Success</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0"
}
```

<small>*Status*: 409 Conflict - the instance is still running</small>

```json
{
  "error": "Can't remove sequence in use."
}
```

</details>

## Instance basic operations

<details open>
<summary>
    <strong>[ GET ]</strong> <code>/api/v1/instances</code> <small>- list all instances</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "id": "742d2713-7ab6-4cde-82f3-a7beabdd4e98",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  },
  {
    "id": "681c856e-dfa4-46a1-951d-47b27345552e",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  },
  {
    "id": "21f787ed-6b9e-4e9f-828e-afe428d84833",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  }
]
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong> <code>/api/v1/instance/:id</code> <small>- show data of chosen instance</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 200 Accepted</small>

```json
{
  "created": "2021-10-29T16:08:36.524Z",
  "started": "2021-10-29T16:08:38.701Z",
  "sequenceId": "b0c02fdc-b05f-4f26-9d68-43a702eb7b44"
}
```

<small>*Status*: 500 (?)</small>

```json
{
 // Bug: a query is hanging, when the instance was stopped or the program execution ended
}
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/instance/:id/_stop</code> <small>- end instance gracefully and prolong operations or not for task completion​</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name             | Description                                                                     | Type    | Required |
| ---------------- | ------------------------------------------------------------------------------- | ------- | -------- |
| timeout          | The number of milliseconds before the Instance will be killed. Default: 7000ms. | number  | no       |
| canCallKeepalive | If set to true, the instance will prolong the running. Default: false.          | boolean | no       |

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
   "code": 0,
   "type": "string",
   "message": "string"
}
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong>  <code>api/v1/instance/:id/_kill</code> <small>- end instance gracefully waiting for unfinished tasks</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 202 Accepted</small>

```text
No body returned
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/health</code> <small>- check status about instance health</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
  "cpuTotalUsage": 529325247,
  "healthy": true,
  "limit": 536870912,
  "memoryMaxUsage": 16117760,
  "memoryUsage": 14155776,
  "networkRx": 1086,
  "networkTx": 0,
  "containerId": "1c993c4ff774fac06185aa9554cf40c23b03e1479a7e0d14827708161b08ae51"
}
```

</details>

## Instance advanced operation

STH allows you to interact ( communicate ) with an instance by sending events with or without any information defined in the object​. As well as providing and receiving stream with all kinds of data files.

Event contains <eventName>, <handler> with optional <message> of any type: string, num, json obj, array, etc..

<details>
<summary>
    <strong>[ POST ]</strong>  <code>/api/v1/instance/:id/event</code> <small>- send event</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name        | Type     | Description                  | Required |
| :---------- | :------- | ---------------------------- | -------- |
| `eventName` | `string` | Name of an event             | true     |
| `message`   | `string` | JSON formatted event payload | false    |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/event</code> <small>- get data stream with events till the instance stop running</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/once</code> <small>- get last event</small>
</summary>
<!-- ToDo: think about the name -->
<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ POST ]</strong>  <code>/api/v1/instance/:id/stdin​</code> <small>- process.stdin</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/stdout</code> <small>- process.stdout</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/stderr</code> <small>- process.stderr</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/log</code> <small>- stream all instance logs</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

<small>Successful operation code: **200**</small>

```
2021-11-19T16:12:22.948Z log (Sequence) 42
2021-11-19T16:12:23.949Z log (Sequence) 41
2021-11-19T16:12:24.950Z log (Sequence) 40
2021-11-19T16:12:25.951Z log (Sequence) 39
2021-11-19T16:12:26.952Z log (Sequence) 38
2021-11-19T16:12:27.952Z log (Sequence) 37
2021-11-19T16:12:28.953Z log (Sequence) 36
2021-11-19T16:12:29.953Z log (Sequence) 35
```

</details>

## Service Discovery: Topics

<details>
<summary>
    <strong>[ POST ]</strong>  <code>/api/v1/topics/:name​</code> <small>- sends data to the topic</small>
</summary>

<small>If a given topic does not exist, Transform-Hub creates it and stores the sent data in the newly created topic. The data is stored in the topic until the data is not consumed (either by the Topic API or by the Instances subscribing to this topic).​</small>
<br> <strong>**Parameters**</strong>

No parameters

<strong>Request Headers</strong>

<small>"x-end-stream"</small> <small>- close topic stream [optional, boolean]. If x-end-stream header value is true, the topic stream is closed after processing this request. The default value is false. </small>

<small>"content-type"</small> <small>-specify stream content type [optional, boolean]. The content-type header specifies data type of this topic.
The recognized values are: text/x-ndjson, application/x-ndjson, application/x-ndjson, text/plain, application/octet-stream. The default value is application/x-ndjson.​ </small>

<strong>Responses</strong>

<small>Successful operation code: **200**</small> <small>- when data to topic is sent with the header indicating the end of data</small>
<br> <small>Successful operation code: **202**</small> <small>- when data to topic is sent without the header indicating the end of data (default)</small>

</details>


<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/topics/:name​</code> <small>- get data from the topic</small>
</summary>

<small>If a given topic does not exist, Transform-Hub creates it and returns a new stream. When the data are sent to the topic they are written to the returned stream.</small>
<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Topic data stream.</small>

<small>Successful operation code: **200**</small>

```json
{
  "source": "Twitter",
  "id": "850006245121695778",
  "content": "Natural wetlands make up ~30% of global total CH4 emissions",
  "user": {
    "id": 1234994945,
    "name": "Climate Change Conference",
    "screen_name": "Climate Change",
  }
}
```

</details>

## Host operations

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/version</code> <small>- show the Host version</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{ "version" : "0.12.2" }
```

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/sequences</code> <small>- show all Sequences saved on the Host</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "instances": [], // a list of all running Instances of this Sequence
    "id": "eea8bc33-440f-4a17-8931-eb22a17d5d56", // Sequence ID
    "config": {
      "container": {
        "image": "scramjetorg/runner:0.12.2",
        "maxMem": 512,
        "exposePortsRange": [
          30000,
          32767
        ],
        "hostIp": "0.0.0.0"
      },
      "name": "@scramjet/hello-alice-out",
      "version": "0.12.2",
      "engines": {
        "node": ">=10"
      },
      "config": {},
      "sequencePath": "index", // a path to file with a main function
      "packageVolumeId": "eea8bc33-440f-4a17-8931-eb22a17d5d56"
    }
  },
  {
    "instances": [
      "02381acf-cb16-4cff-aa9b-f22f04ada94f"
    ],
    "id": "3ec02b93-4ca9-4d23-baab-048dab5ffda4",
    "config": {
      "container": {
        "image": "scramjetorg/runner:0.12.2",
        "maxMem": 512,
        "exposePortsRange": [
          30000,
          32767
        ],
        "hostIp": "0.0.0.0"
      },
      "name": "@scramjet/checksum-sequence",
      "version": "0.12.2",
      "engines": {},
      "config": {},
      "sequencePath": "index.js",
      "packageVolumeId": "3ec02b93-4ca9-4d23-baab-048dab5ffda4"
    }
  }
]
```

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instances</code> <small>- show all Instances running on the Host</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "id": "02381acf-cb16-4cff-aa9b-f22f04ada94f", // Instance ID
    "sequence": "3ec02b93-4ca9-4d23-baab-048dab5ffda4" // Sequence ID
  },
  {
    "id": "ab0272d8-c9b0-43f7-9e7e-bcac9ec0f21f",
    "sequence": "e4ca555c-ced1-4a13-b531-f43016eaf4ed"
  }
]
```

</details>


<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/load-check</code> <small>- monitor CPU, memory and disk usage metrics on the Host machine</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
  "avgLoad": 0.08,
  "currentLoad": 5.190776257704936,
  "memFree": 4634816512,
  "memUsed": 8050364416,
  "fsSize": [
    {
      "fs": "/dev/sda1",
      "type": "ext4",
      "size": 20838993920,
      "used": 14939455488,
      "available": 5882761216,
      "use": 71.75,
      "mount": "/"
    },
    {
      "fs": "/dev/sda15",
      "type": "vfat",
      "size": 109422592,
      "used": 9621504,
      "available": 99801088,
      "use": 8.79,
      "mount": "/boot/efi"
    }
  ]
}

```

</details>


<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/log</code> <small>- monitor CPU, memory and disk usage metrics on the Host machine</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

<small>Successful operation code: **200**</small>

```
2021-11-19T16:04:47.094Z log (object:Host) Host main called.
2021-11-19T16:04:47.100Z info (object:SocketServer) Server on: /tmp/scramjet-socket-server-path
2021-11-19T16:04:47.104Z info (object:Host) API listening on: 127.0.0.1:8000
2021-11-19T16:05:08.228Z info (object:Host) New sequence incoming...
2021-11-19T16:05:08.229Z log (object:LifecycleDockerAdapterSequence) Docker sequence adapter init.
2021-11-19T16:05:08.229Z log (object:DockerodeDockerHelper) Checking image scramjetorg/pre-runner:0.12.2
2021-11-19T16:05:12.234Z info (object:LifecycleDockerAdapterSequence) Docker sequence adapter done.
2021-11-19T16:05:12.246Z log (object:LifecycleDockerAdapterSequence) Volume created. Id:  c50fe4d3-89cc-4685-a82a-16cbc744733d
2021-11-19T16:05:12.246Z log (object:LifecycleDockerAdapterSequence) Starting PreRunner { image: 'scramjetorg/pre-runner:0.12.2', maxMem: 128 }
2021-11-19T16:05:13.536Z log (object:DockerodeDockerHelper) Checking image scramjetorg/runner:0.12.2
2021-11-19T16:05:16.670Z info (object:SequenceStore) New sequence added: c50fe4d3-89cc-4685-a82a-16cbc744733d
2021-11-19T16:05:16.672Z info (object:Host) Sequence identified: {
  container: {
    image: 'scramjetorg/runner:0.12.2',
    maxMem: 512,
    exposePortsRange: [ 30000, 32767 ],
    hostIp: '0.0.0.0'
  },
  name: '@scramjet/multi-outputs',
  version: '0.12.2',
  engines: {},
  config: {},
  sequencePath: 'index.js',
  packageVolumeId: 'c50fe4d3-89cc-4685-a82a-16cbc744733d'
}
2021-11-19T16:05:16.691Z debug (object:Host) Request date: 2021-11-19T16:05:08.239Z, method: POST, url: /api/v1/sequence, status: 202
```

</details>

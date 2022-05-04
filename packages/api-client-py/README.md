<h1 align="center"><strong>Scramjet Transform Hub API Client</strong></h1>

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

The package provides an API Client for use with Scramjet Transform Hub.

Usage:

```python
import asyncio
from client.host_client import HostClient

host = HostClient(url)
res = asyncio.run(host.get_version())
```

## More reading

In the link below you will find more information about our stream protocol and API usage.

See the code documentation here: [scramjetorg/transform-hub/docs/read-more/stream-and-api.md](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/read-more/stream-and-api.md)

## Scramjet Transform Hub

This package is part of [Scramjet Transform Hub](https://www.npmjs.org/package/@scramjet/sth).

Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program, as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like.

## Use cases

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) or hop on our [Scramjet Discord](https://scr.je/join-community-mg1)!
___

### Host operations

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/version</code> <small>- show the Host version</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

```json
{ "version" : "0.12.2" }
```

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/sequences</code> <small>- show all Sequences saved on the Host</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instances</code> <small>- show all Instances running on the Host</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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
    <strong class="get">[ GET ]</strong>  <code>/api/v1/load-check</code> <small>- monitor CPU, memory and disk usage metrics on the Host machine</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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
    <strong class="get">[ GET ]</strong>  <code>/api/v1/log</code> <small>- monitor CPU, memory and disk usage metrics on the Host machine</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

<small>Successful operation code: `200`</small>

```bash
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

___

### Sequence operations

<details>
<summary>
    <strong class="post">[ POST ]</strong> <code>/api/v1/sequence</code> <small>- add new sequence</small>
</summary>

<br><strong>Parameters</strong>

| Name        | Type     | Description                         | Required |
| ----------- | -------- | ----------------------------------- | -------- |
| `file`      | `binary` | compressed package in tar.gz format | yes      |
| `appConfig` | `json`   | additional package.json config file | no       |

<strong>Responses</strong>

<small>Accepted operation code: `202`</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0" // sequence id
}
```

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/sequences</code> <small>- show list of sequences</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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

<details>
<summary>
    <strong class="post">[ POST ]</strong> <code>/api/v1/sequence/:id/start</code> <small>- start chosen sequence</small>
</summary>

<br> <strong>Parameters</strong>

| Name        | Type   | Description                                           | Required |
| ----------- | ------ | ----------------------------------------------------- | -------- |
| `appConfig` | `json` | additional package.json config file                   | no       |
| `args`      | `json` | additional arguments that instance should starts with | no       |

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

```json
{
  "id": "681c856e-dfa4-46a1-951d-47b27345552e"
}
```

</details>

<details>
<summary>
    <strong class="delete">[ DELETE ]</strong> <code>/api/v1/sequence/:id</code> <small>- delete a sequence by id</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0"
}
```

<small>Conflict operation code: `409` - the instance is still running</small>

```json
{
  "error": "Can't remove sequence in use."
}
```

</details>

___

### Instance basic operations

<details>
<summary>
    <strong class="get">[ GET ]</strong> <code>/api/v1/instances</code> <small>- list all instances</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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

<details>
<summary>
    <strong class="get">[ GET ]</strong> <code>/api/v1/instance/:id</code> <small>- show data of chosen instance</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

| Name                 | Code  | Description                                 |
| :------------------- | :---- | :------------------------------------------ |
| Successful operation | `200` | Returns JSON data                           |
| Not Found operation  | `404` | For example if instance was already stopped |

```json
{
  "created": "2021-10-29T16:08:36.524Z",
  "started": "2021-10-29T16:08:38.701Z",
  "sequenceId": "b0c02fdc-b05f-4f26-9d68-43a702eb7b44"
}
```

</details>

<details>
<summary>
    <strong class="post">[ POST ]</strong> <code>/api/v1/instance/:id/_stop</code> <small>- end instance gracefully and prolong operations or not for task completion​</small>
</summary>

<br> <strong>Parameters</strong>

| Name               | Type      | Description                                                                     | Required |
| ------------------ | --------- | ------------------------------------------------------------------------------- | -------- |
| `timeout`          | `number`  | The number of milliseconds before the Instance will be killed. Default: 7000ms. | no       |
| `canCallKeepalive` | `boolean` | If set to true, the instance will prolong the running. Default: false.          | no       |

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

```json
{
   "code": 0,
   "type": "string",
   "message": "string"
}
```

</details>

<details>
<summary>
    <strong class="post">[ POST ]</strong>  <code>api/v1/instance/:id/_kill</code> <small>- end instance gracefully waiting for unfinished tasks</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Accepted operation code: `202`</small>

```text
No body returned
```

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/health</code> <small>- check status about instance health</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

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

___

### Instance advanced operation

<details>
<summary>
    <strong class="post">[ POST ]</strong>  <code>/api/v1/instance/:id/_event</code> <small>- send event to the Instance</small>
</summary>

<br> <strong>Parameters</strong>

| Name        | Type     | Description                  | Required |
| :---------- | :------- | ---------------------------- | -------- |
| `eventName` | `string` | Name of an event             | true     |
| `message`   | `string` | JSON formatted event payload | false    |

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/event</code> <small>- get the data stream with the events from the Instance</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/once</code> <small>- get the last event sent by the Instance</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="post">[ POST ]</strong>  <code>/api/v1/instance/:id/input</code> <small>- send data to the input stream of the Instance to consume it</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

| Name                     | Code  | Description                                                  |
| :----------------------- | :---- | :----------------------------------------------------------- |
| Successful operation     | `200` | -                                                            |
| Not Acceptable operation | `406` | Instance expects the input to be provided from the Topic API |

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/output</code> <small>- get stream data from an instance and consume it through the endpoint</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="post">[ POST ]</strong>  <code>/api/v1/instance/:id/stdin​</code> <small>- process.stdin</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Successful operation code: `200`</small>

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/stdout</code> <small>- process.stdout</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/stderr</code> <small>- process.stderr</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/instance/:id/log</code> <small>- stream all instance logs</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Content-type: `application/octet-stream`</small>

<small>Successful operation code: `200`</small>

```bash
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

___

### Service Discovery: Topics

If a given topic does not exist, Transform-Hub creates it and stores the sent data in the newly created topic. The data is stored in the topic until the data is not consumed (either by the Topic API or by the Instances subscribing to this topic). When the data are sent to the topic they are written to the returned stream.

<details>
<summary>
    <strong class="post">[ POST ]</strong>  <code>/api/v1/topics/:name​</code> <small>- sends data to the topic</small>
</summary>

<br> <strong>Parameters</strong>

<small><small>No parameters</small></small>

<strong>Request Headers</strong>

| Header         | Type                  | Description                                                             | Default                | Required |
| -------------- | --------------------- | ----------------------------------------------------------------------- | ---------------------- | -------- |
| `x-end-stream` | `boolean`             | If set to `true`, then close topic stream after processing the request. | false                  | no       |
| `content-type` | `text`, `application` | Specifies data type of this topic                                       | `application/x-ndjson` | no       |

<small> Supported types: `text/x-ndjson`, `application/x-ndjson`, `application/x-ndjson`, `text/plain`, `application/octet-stream`</small>

<strong>Responses</strong>

| Name                 | Code  | Description                                                           |
| :------------------- | :---- | :-------------------------------------------------------------------- |
| Successful operation | `200` | data was sent with the header indicating the end of data              |
| Successful operation | `202` | data was sent without the header indicating the end of data (default) |

</details>

<details>
<summary>
    <strong class="get">[ GET ]</strong>  <code>/api/v1/topics/:name​</code> <small>- get data from the topic</small>
</summary>

<br> <strong>Parameters</strong>

<small>No parameters</small>

<strong>Responses</strong>

<small>Topic data stream.</small>

<small>Successful operation code: `200`</small>

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

___

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




# Transform Hub on HashiCorp Nomad

## Prerequisites

 - [nomad](https://www.nomadproject.io/docs/install)
 - [consul](https://www.consul.io/downloads)
 - [docker](https://docs.docker.com/engine/install/)

   Tested on:
   - Nomad v1.0.1 (c9c68aa55a7275f22d2338f2df53e67ebfcb9238)
   - Consul v1.9.0 Revision a417fe510


## Start Nomad


```bash
sudo nomad agent -dev -bind 0.0.0.0 -log-level DEBUG -config config.hcl 
```


## Check Nomad status

```bash
$ nomad status

No running jobs
```

## Run transform-hub job

```bash
$ nomad run transformhub.nomad

==> Monitoring evaluation "38fc0e35"
    Evaluation triggered by job "transform-hub"
    Allocation "63894ad6" created: node "7aeeee2d", group "sth"
==> Monitoring evaluation "38fc0e35"
    Evaluation within deployment: "e23cba69"
    Evaluation status changed: "pending" -> "complete"
==> Evaluation "38fc0e35" finished with status "complete"

```

Now we can check nomad status again:

```bash
$ nomad status transform-hub

ID            = transform-hub
Name          = transform-hub
Submit Date   = 2022-05-20T14:17:03+02:00
Type          = service
Priority      = 50
Datacenters   = dc1
Namespace     = default
Status        = running
Periodic      = false
Parameterized = false

Summary
Task Group  Queued  Starting  Running  Failed  Complete  Lost
sth         0       0         1        0       0         0

Latest Deployment
ID          = e23cba69
Status      = successful
Description = Deployment completed successfully

Deployed
Task Group  Desired  Placed  Healthy  Unhealthy  Progress Deadline
sth         1        1       1        0          2022-05-20T14:27:18+02:00

Allocations
ID        Node ID   Task Group  Version  Desired  Status   Created  Modified
63894ad6  7aeeee2d  sth         0        run      running  20s ago  5s ago

```

To access Nomad Web UI:

```bash
http://127.0.0.1:4646/ui/jobs
```

Check transform-hub version:

```bash
$ curl http://127.0.0.1:8000/api/v1/version -s |jq
{
  "service": "@scramjet/host",
  "apiVersion": "v1",
  "version": "0.22.0",
  "build": "dae66dc"
}
```

## Run sequence:

Install Scramjet CLI

```bash
npm install -g @scramjet/cli
```

Download one of [reference-apps](https://github.com/scramjetorg/reference-apps/releases/tag/v0.22.0)

Download e.g `hello-alice-out.tar.gz`

```bash
wget https://github.com/scramjetorg/reference-apps/releases/download/v0.22.0/hello-alice-out.tar.gz
```


Send Sequence to transform-hub

```bash
$ si seq send hello-alice-out.tar.gz

SequenceClient {
  _id: '59df5ec0-161a-4c62-9817-31aa6db9ac5f',
  host: HostClient {
    apiBase: 'http://127.0.0.1:8000/api/v1',
    client: ClientUtils {
      apiBase: 'http://127.0.0.1:8000/api/v1',
      fetch: [Function (anonymous)],
      normalizeUrlFn: [Function: normalizeUrl]
    }
  },
  sequenceURL: 'sequence/59df5ec0-161a-4c62-9817-31aa6db9ac5f'
}

```

Start sequence:

```bash
$ si seq start 59df5ec0-161a-4c62-9817-31aa6db9ac5f

InstanceClient {
  host: HostClient {
    apiBase: 'http://127.0.0.1:8000/api/v1',
    client: ClientUtils {
      apiBase: 'http://127.0.0.1:8000/api/v1',
      fetch: [Function (anonymous)],
      normalizeUrlFn: [Function: normalizeUrl]
    }
  },
  _id: 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5',
  instanceURL: 'instance/c4a730cc-3a40-4bbd-8968-d83a3cf299b5'
}
```


Check transform-hub logs:

```bash
$ nomad alloc logs 63894ad6-5806-ee16-9c51-0f84ddd6ab97

2022-05-20T12:17:09.466Z INFO  Host Log Level [ 'trace' ]
2022-05-20T12:17:09.470Z TRACE Host Host main called [ { version: '0.22.0' } ]
2022-05-20T12:17:09.470Z TRACE Host Setting up Docker networking 
2022-05-20T12:17:09.655Z INFO  SocketServer SocketServer on [ { address: '::', family: 'IPv6', port: 8001 } ]
2022-05-20T12:17:09.665Z INFO  Host API on [ '0.0.0.0:8000' ]
2022-05-20T12:17:09.666Z INFO  Host Run Sequences in our cloud. [
  {
    'Check it': 'out as a beta tester',
    here: 'https://scr.je/join-beta-sth'
  }
]
2022-05-20T12:17:28.756Z DEBUG Host Request [
  'date: 2022-05-20T12:17:28.755Z, method: GET, url: /api/v1/version, status: 200'
]
2022-05-20T12:17:42.013Z INFO  Host New Sequence incoming 
2022-05-20T12:17:42.014Z DEBUG Host Using DockerSequenceAdapter as sequence adapter 
2022-05-20T12:17:42.015Z TRACE DockerSequenceAdapter Initializing 
2022-05-20T12:17:42.015Z TRACE DockerodeDockerHelper Checking image [ 'scramjetorg/pre-runner:0.22.0' ]
2022-05-20T12:17:43.042Z TRACE DockerodeDockerHelper Image found in local registry 
2022-05-20T12:17:43.043Z TRACE DockerSequenceAdapter Initialization done 
2022-05-20T12:17:43.048Z INFO  DockerSequenceAdapter Volume created in 0.005s [ '59df5ec0-161a-4c62-9817-31aa6db9ac5f' ]
2022-05-20T12:17:43.048Z DEBUG DockerSequenceAdapter Starting PreRunner [
  {
    logLevel: 'trace',
    logColors: true,
    cpmUrl: '',
    cpmId: '',
    docker: { prerunner: [Object], runner: [Object], runnerImages: [Object] },
    identifyExisting: false,
    host: {
      hostname: '0.0.0.0',
      port: 8000,
      apiBase: '/api/v1',
      instancesServerPort: 8001,
      infoFilePath: '/tmp/sth-id.json',
      id: 'sth-0'
    },
    instanceRequirements: { freeMem: 256, cpuLoad: 10, freeSpace: 128 },
    safeOperationLimit: 512,
    instanceAdapterExitDelay: 9000,
    runtimeAdapter: 'docker',
    sequencesRoot: '/root/.scramjet_sequences',
    kubernetes: {
      namespace: 'default',
      authConfigPath: undefined,
      sthPodHost: undefined,
      runnerImages: [Object],
      sequencesRoot: '/root/.scramjet_k8s_sequences',
      timeout: '0'
    },
    startupConfig: '',
    exitWithLastInstance: false,
    heartBeatInterval: 10000
  }
]
2022-05-20T12:17:43.586Z DEBUG DockerSequenceAdapter PreRunner response [
  {
    name: '@scramjet/hello-alice-out',
    author: 'Scramjet <open-source@scramjet.org>',
    version: '0.22.0',
    keywords: null,
    description: null,
    main: 'index',
    engines: { node: '>=10' },
    scramjet: { image: 'node' }
  }
]
2022-05-20T12:17:43.587Z TRACE DockerodeDockerHelper Checking image [ 'scramjetorg/runner:0.22.0' ]
2022-05-20T12:17:44.708Z TRACE DockerodeDockerHelper Image found in local registry 
2022-05-20T12:17:44.709Z INFO  Host Sequence identified [
  {
    type: 'docker',
    container: {
      image: 'scramjetorg/runner:0.22.0',
      maxMem: 512,
      exposePortsRange: [Array],
      hostIp: '0.0.0.0'
    },
    name: '@scramjet/hello-alice-out',
    version: '0.22.0',
    engines: { node: '>=10' },
    config: {},
    entrypointPath: 'index',
    id: '59df5ec0-161a-4c62-9817-31aa6db9ac5f'
  }
]
2022-05-20T12:17:44.710Z INFO  Auditor Sequence state [ '59df5ec0-161a-4c62-9817-31aa6db9ac5f', 0 ]
2022-05-20T12:17:44.711Z DEBUG Host Request [
  'date: 2022-05-20T12:17:42.016Z, method: POST, url: /api/v1/sequence, status: 200'
]
2022-05-20T12:17:51.035Z INFO  Host Start sequence [ '59df5ec0-161a-4c62-9817-31aa6db9ac5f', '@scramjet/hello-alice-out' ]
2022-05-20T12:17:51.047Z TRACE Host CSIController created [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.043Z TRACE CommunicationHandler CommunicationHandler created 
2022-05-20T12:17:51.047Z DEBUG CSIController Constructor executed 
2022-05-20T12:17:51.054Z TRACE CSIController Streams hooked and routed 
2022-05-20T12:17:51.055Z TRACE CSIController Sequence initialized 
2022-05-20T12:17:51.054Z INFO  DockerInstanceAdapter Instance preparation done 
2022-05-20T12:17:51.054Z DEBUG DockerInstanceAdapter Development mode on 
2022-05-20T12:17:51.059Z DEBUG DockerInstanceAdapter Runner will connect to STH container with hostname [ '2ceee6715273' ]
2022-05-20T12:17:51.059Z DEBUG DockerInstanceAdapter Runner will start with envs [
  [
    'SEQUENCE_PATH=/package/index',
    'DEVELOPMENT=1',
    'PRODUCTION=',
    'INSTANCES_SERVER_PORT=8001',
    'INSTANCES_SERVER_HOST=2ceee6715273',
    'INSTANCE_ID=c4a730cc-3a40-4bbd-8968-d83a3cf299b5'
  ]
]
2022-05-20T12:17:51.535Z TRACE DockerInstanceAdapter Container is running [ 'c71f392b34d5a0d826c8e1d19dca9e2764fd8b281a65344a2ea63970bf565f17' ]
2022-05-20T12:17:51.613Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.613Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.614Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.614Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.614Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.615Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.615Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.615Z INFO  SocketServer New incoming Runner connection to SocketServer 
2022-05-20T12:17:51.615Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.616Z INFO  SocketServer Connection on channel [ 0 ]
2022-05-20T12:17:51.616Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.617Z INFO  SocketServer Connection on channel [ 1 ]
2022-05-20T12:17:51.618Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.618Z INFO  SocketServer Connection on channel [ 2 ]
2022-05-20T12:17:51.618Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.618Z INFO  SocketServer Connection on channel [ 3 ]
2022-05-20T12:17:51.619Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.619Z INFO  SocketServer Connection on channel [ 4 ]
2022-05-20T12:17:51.619Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.619Z INFO  SocketServer Connection on channel [ 5 ]
2022-05-20T12:17:51.620Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.620Z INFO  SocketServer Connection on channel [ 6 ]
2022-05-20T12:17:51.620Z INFO  SocketServer Connection from Instance [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.621Z DEBUG Host Instance connected [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.620Z INFO  SocketServer Connection on channel [ 7 ]
2022-05-20T12:17:51.621Z TRACE CSIController Hookup streams 
2022-05-20T12:17:51.627Z DEBUG CSIController PING received [ [ 3000, {} ] ]
2022-05-20T12:17:51.627Z TRACE CSIController Received a PING message but didn't receive ports config 
2022-05-20T12:17:51.627Z INFO  CSIController Instance started [
  {
    created: 2022-05-20T12:17:51.047Z,
    ports: undefined,
    started: 2022-05-20T12:17:51.627Z
  }
]
2022-05-20T12:17:51.616Z DEBUG Runner Streams initialized 
2022-05-20T12:17:51.617Z TRACE Runner Handshake sent 
2022-05-20T12:17:51.615Z DEBUG HostClient Connected to host 
2022-05-20T12:17:51.629Z DEBUG Runner Control message received [ 4000, { appConfig: {}, args: [] } ]
2022-05-20T12:17:51.641Z TRACE Host PANG received [ { requires: '' } ]
2022-05-20T12:17:51.641Z TRACE CSIController Instance started 
2022-05-20T12:17:51.642Z TRACE Host CSIController started [ 'c4a730cc-3a40-4bbd-8968-d83a3cf299b5' ]
2022-05-20T12:17:51.642Z INFO  Auditor Instance state [ '59df5ec0-161a-4c62-9817-31aa6db9ac5f', 0 ]
2022-05-20T12:17:51.643Z DEBUG Host Request [
  'date: 2022-05-20T12:17:50.977Z, method: POST, url: /api/v1/sequence/59df5ec0-161a-4c62-9817-31aa6db9ac5f/start, status: 200'
]
2022-05-20T12:17:51.646Z TRACE Host PANG received [ { provides: '', contentType: '' } ]
2022-05-20T12:17:51.629Z DEBUG Runner Handshake received 
2022-05-20T12:17:51.641Z DEBUG Runner Sequence [ [ null ] ]
2022-05-20T12:17:51.641Z INFO  Runner Sequence loaded, functions count [ 1 ]
2022-05-20T12:17:51.641Z DEBUG Runner Processing function on index [ 0 ]
2022-05-20T12:17:51.645Z DEBUG Runner Function called [ 0 ]
2022-05-20T12:17:51.645Z INFO  Runner All Sequences processed. 
2022-05-20T12:17:51.646Z DEBUG Runner Stream type is [ 'object' ]
2022-05-20T12:17:51.646Z TRACE Runner Piping Sequence output [ 'object' ]
2022-05-20T12:17:51.641Z INFO  Sequence Sequence started 
2022-05-20T12:17:51.650Z INFO  Sequence File read end 
Hello Alice!

Hello Ada!

Hello Aga!

Hello Basia!

Hello Natalia!

Hello Wojtek!

Hello Michał!

Hello Patryk!

Hello Rafał!

2022-05-20T12:17:56.173Z TRACE CSIController Got message: SEQUENCE_COMPLETED. 
2022-05-20T12:17:56.170Z DEBUG Runner Sequence stream ended 
2022-05-20T12:17:56.172Z TRACE Runner Sequence completed. Waiting 10000ms with exit. 
```

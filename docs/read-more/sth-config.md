# STH Configuration File

Starting a self-hosted Transform Hub with `--config` argument will allow you to pass the full configuration file.

The contents of such file can be `yml` or `json` with the following default values:

```yaml
# Logging level
# Acceptable values: "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "TRACE"
logLevel: INFO

# Enable colors in logging.
logColors: boolean,

# Host configuration.
host:
    # Hostname.
    hostname: "0.0.0.0"

    # Custom host identifier - default random
    id:

    # API port.
    port: 8000

    # API URL.
    apiBase: "/api/v1"

    # Port number for connecting Instances.
    instancesServerPort: 8001

    # Host information filepath.
    infoFilePath: "/tmp/sth-id.json"


# Minimum requirements to start new Instance.
instanceRequirements:

    # Free memory required to start Instance. In megabytes.
    freeMem: 256


    # Required free CPU. In percentage.
    cpuLoad: 10


    # Free disk space required to start Instance. In megabytes.
    freeSpace: 128

# The amount of memory that must remain free. In megabytes.
safeOperationLimit: 512

# Should we identify existing sequences.
identifyExisting: false

# Which sequence and instance adapters should STH use.
# One of 'docker', 'process', 'kubernetes'
runtimeAdapter: docker

# Docker adapter configuration
docker:

    # PreRunner container configuration.
    # defaults to the image released with packages
    prerunner:
        image:
        maxMem: 128M

    # Runner container configuration.
    runner:
        maxMem: 512M

    # Runner images to use for specific languages
    # defaults to the image released with released packages
    runnerImages:
        python3: ""
        node: ""

# Kubernetes adapter configuration
kubernetes:

    # The Kubernetes namespace to use for running sequences
    namespace: "default"

    # Authentication configuration path
    authConfigPath:

    # The host where to start STH Pods
    sthPodHost:

    # Runner images to use
    # defaults to the image released with packages
    runnerImages:
        python3:
        node:

    # Path to store sequences
    sequencesRoot: ${HOME}/.scramjet_k8s_sequences

# Where should ProcessSequenceAdapter save new Sequences
sequencesRoot:

# Provides the location of a config file with the
# list of sequences to be started along with the host
startupConfig:

# Should the hub exit when the last instance ends
exitWithLastInstance: false

# Various timeout and interval configurations
timings:

    # Heartbeat interval in miliseconds
    heartBeatInterval: 10000


    # Time to wait after Runner container exit.
    # In this additional time Instance API is still available.
    instanceAdapterExitDelay: 180000


    # Time to wait before CSIController emits `end` event.
    instanceLifetimeExtensionDelay: 9000
```

## Config options and command line table


| Config name | CMD Parameter | Default | Description | Example |
|-|-|-|-|-|-|
| N/A | `-c, --config <path>` | `null` | Specifies path to config
| `logLevel` | `-L, --log-level <level>` | `trace` | Specify log level
| `host.id` | `-I, --id <id>` | Random | The id assigned to this server
| `host.hostname` | `-H, --hostname <IP>` | `0.0.0.0` | API IP
| `host.port` | `-P, --port <port>` | `8000` | API port
| `host.instancesServerPort` | `--isp,--instances-server-port <port>` | `8001` | Port on which server that instances connect to should run.
| `identifyExisting` | `-E, --identify-existing` | `false` | Index existing volumes as sequences
| `runtimeAdapter` | `--runtime-adapter <adapter>` | `process` | Determines adapters used for loading and starting sequence. One of 'docker', 'process', 'kubernetes'
| `safeOperationLimit` | `--safe-operation-limit <mb>` | `512` | Number of MB reserved by the host for safe operation
| `exitWithLastInstance` | `-X, --exit-with-last-instance` | `false` | Exits host when no more instances exist.
| `startupConfig` | `-S, --startup-config <path>` | `null` | Only works with process adapter. The configuration of startup sequences.
| `sequencesRoot` | `-D, --sequences-root <path>` | `~/.scramjet_sequences` | Only works with `--runtime-adapter='process'` option. Where should ProcessSequenceAdapter save new sequences
| `timings.instanceLifetimeExtensionDelay` | `--instance-lifetime-extension-delay <ms>` | 180000 | Instance lifetime extension delay in ms
| `docker.runnerImages.node` | `--runner-image <image name>` | auto resolved | Image used by docker runner for Node.js
| `docker.runnerImages.python3` | `--runner-py-image <image>` | auto resolved | Image used by docker runner for Python
| `docker.runner.maxMem` | `--runner-max-mem <mb>` | 512M | Maximum mem used by runner
| `docker.prerunner.image` | `--prerunner-image <image name>` | auto resolved | Image used by prerunner
| `docker.prerunner.maxMem` | `--prerunner-max-mem <mb>` | 128M | Maximum mem used by prerunner
| `kubernetes.namespace` | `--k8s-namespace <namespace>` | `default` | Kubernetes namespace used in Sequence and Instance adapters.
|  `kubernetes.authConfigPath` | `--k8s-auth-config-path <path>` |  | Kubernetes authorization config path. If not supplied the mounted service account will be used.
|  `kubernetes.sthPodHost` | `--k8s-sth-pod-host <host>`|  | Runner needs to connect to STH. This is the host (IP or hostname) that it will try to connect to.
|  `kubernetes.runnerImages.node` | `--k8s-runner-image <image>` | auto resolved | Runner image spawned in NodeJs Pod.
|  `kubernetes.runnerImages.python3` | `--k8s-runner-py-image <image>` | auto resolved | Runner image spawned in Python Pod.
|  `kubernetes.sequencesRoot` | `--k8s-sequences-root <path>` | `~/.scramjet_k8s_sequences` | Kubernetes Process Adapter will store sequences here.

## Example configs

Here are some full configs for reference:

### Kubernetes

This is a complete kubernetes config

```yaml
logLevel: info
logColors: true
host:
  hostname: 0.0.0.0
  port: 9078
  apiBase: "/api/v1"
  instancesServerPort: 8001
  infoFilePath: "/tmp/sth-id.json"
  id: polololo-kube
instanceRequirements:
  freeMem: 128
  cpuLoad: 10
  freeSpace: 128
safeOperationLimit: 64
runtimeAdapter: kubernetes
timings:
  heartBeatInterval: 10000
  instanceLifetimeExtensionDelay: 180000
  instanceAdapterExitDelay: 9000
kubernetes:
  namespace: default
  sthPodHost: sth-runner
  runnerImages:
    python3: scramjetorg/runner-py:0.26.0
    node: scramjetorg/runner:0.26.0
  timeout: 0
  runnerResourcesRequestsCpu: 0.01
  runnerResourcesRequestsMemory: 8M
  runnerResourcesLimitsCpu: 0.565
  runnerResourcesLimitsMemory: 1024MB
```

And the JSON structure:

```json
{
  "logLevel": "info",
  "logColors": true,
  "identifyExisting": false,
  "host": {
    "hostname": "0.0.0.0",
    "port": 9078,
    "apiBase": "/api/v1",
    "instancesServerPort": 8001,
    "infoFilePath": "/tmp/sth-id.json",
    "id": "scramjet-sth"
  },
  "instanceRequirements": {
    "freeMem": 256,
    "cpuLoad": 10,
    "freeSpace": 128
  },
  "safeOperationLimit": 512,
  "runtimeAdapter": "kubernetes",
  "kubernetes": {
    "namespace": "default",
    "sthPodHost": "sth-runner",
    "runnerImages": {
      "python3": "scramjetorg/runner-py:0.26.0",
      "node": "scramjetorg/runner:0.26.0"
    },
    "timeout": 0,
    "runnerResourcesRequestsCpu": 0.01,
    "runnerResourcesRequestsMemory": "8M",
    "runnerResourcesLimitsCpu": 0.565,
    "runnerResourcesLimitsMemory": "1024MB"
  }
}
```

### Docker config

This is a complete docker based config:

```yaml
logLevel: info
logColors: true
identifyExisting: true
host:
  hostname: 0.0.0.0
  port: 9078
  apiBase: "/api/v1"
  instancesServerPort: 8001
  infoFilePath: "/tmp/sth-id.json"
  id: scramjet-sth
instanceRequirements:
  freeMem: 256
  cpuLoad: 10
  freeSpace: 128
safeOperationLimit: 512
runtimeAdapter: docker
timings:
  heartBeatInterval: 10000
  instanceLifetimeExtensionDelay: 180000
  instanceAdapterExitDelay: 9000
docker:
  prerunner:
    image: scramjetorg/pre-runner:0.26.0
    maxMem: 128
  runner:
    image: ''
    maxMem: 512
    exposePortsRange:
    - 30000
    - 32767
    hostIp: 0.0.0.0
  runnerImages:
    python3: scramjetorg/runner-py:0.26.0
    node: scramjetorg/runner:0.26.0
```

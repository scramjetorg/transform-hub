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


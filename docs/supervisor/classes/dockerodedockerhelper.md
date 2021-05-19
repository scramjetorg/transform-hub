[@scramjet/supervisor](../README.md) / DockerodeDockerHelper

# Class: DockerodeDockerHelper

Communicates with Docker using Dockerode library.

## Hierarchy

* **DockerodeDockerHelper**

## Implements

* *IDockerHelper*

## Table of contents

### Constructors

- [constructor](dockerodedockerhelper.md#constructor)

### Properties

- [dockerode](dockerodedockerhelper.md#dockerode)

### Methods

- [attach](dockerodedockerhelper.md#attach)
- [createContainer](dockerodedockerhelper.md#createcontainer)
- [createVolume](dockerodedockerhelper.md#createvolume)
- [removeContainer](dockerodedockerhelper.md#removecontainer)
- [removeVolume](dockerodedockerhelper.md#removevolume)
- [run](dockerodedockerhelper.md#run)
- [startContainer](dockerodedockerhelper.md#startcontainer)
- [stats](dockerodedockerhelper.md#stats)
- [stopContainer](dockerodedockerhelper.md#stopcontainer)
- [translateVolumesConfig](dockerodedockerhelper.md#translatevolumesconfig)
- [wait](dockerodedockerhelper.md#wait)

## Constructors

### constructor

\+ **new DockerodeDockerHelper**(): [*DockerodeDockerHelper*](dockerodedockerhelper.md)

**Returns:** [*DockerodeDockerHelper*](dockerodedockerhelper.md)

## Properties

### dockerode

• **dockerode**: *Dockerode*

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L41)

## Methods

### attach

▸ **attach**(`container`: *string*, `opts`: *any*): *Promise*<*any*\>

Attaches to container streams.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`container` | *string* | Container id.   |
`opts` | *any* | Attach options.   |

**Returns:** *Promise*<*any*\>

Object with container's standard I/O streams.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:179](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L179)

___

### createContainer

▸ **createContainer**(`dockerImage`: *string*, `volumes?`: DockerAdapterVolumeConfig[], `binds?`: *string*[], `envs?`: *string*[], `autoRemove?`: *boolean*, `maxMem?`: *number*): *Promise*<*string*\>

Creates container based on provided parameters.

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`dockerImage` | *string* | - | Image to start container from.   |
`volumes` | DockerAdapterVolumeConfig[] | ... | Configuration of volumes to be mounted in container.   |
`binds` | *string*[] | ... | Configuration for mounting directories.   |
`envs` | *string*[] | ... | Environmen variables to be set in container.   |
`autoRemove` | *boolean* | false | Indicates that container should be auto-removed on exit.   |
`maxMem` | *number* | ... | Memory available for container (bytes).   |

**Returns:** *Promise*<*string*\>

Created container id.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:80](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L80)

___

### createVolume

▸ **createVolume**(`name?`: *string*): *Promise*<*string*\>

Creates docker volume.

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`name` | *string* | "" | Volume name. Optional. If not provided, volume will be named with unique name.   |

**Returns:** *Promise*<*string*\>

Volume name.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:154](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L154)

___

### removeContainer

▸ **removeContainer**(`containerId`: *string*): *Promise*<*void*\>

Forcefully removes container with provided id.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`containerId` | *string* | Container id.   |

**Returns:** *Promise*<*void*\>

Promise which resolves when container has been removed.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:134](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L134)

___

### removeVolume

▸ **removeVolume**(`volumeName`: *string*): *Promise*<*void*\>

Removes volume with specific name.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`volumeName` | *string* | Volume name.   |

**Returns:** *Promise*<*void*\>

Promise which resolves when volume has been removed.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:168](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L168)

___

### run

▸ **run**(`config`: DockerAdapterRunConfig): *Promise*<DockerAdapterRunResponse\>

Starts container.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`config` | DockerAdapterRunConfig | Container configuration.   |

**Returns:** *Promise*<DockerAdapterRunResponse\>

@see {DockerAdapterRunResponse}

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:189](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L189)

___

### startContainer

▸ **startContainer**(`containerId`: *string*): *Promise*<*void*\>

Start continer with provided id.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`containerId` | *string* | Container id.   |

**Returns:** *Promise*<*void*\>

Promise resolving when container has been started.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:114](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L114)

___

### stats

▸ **stats**(`containerId`: *string*): *Promise*<ContainerStats\>

Gets statistics from container with provided id.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`containerId` | *string* | Container id.   |

**Returns:** *Promise*<ContainerStats\>

Promise which resolves with container statistics.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:144](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L144)

___

### stopContainer

▸ **stopContainer**(`containerId`: *string*): *Promise*<*void*\>

Stops container with provided id.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`containerId` | *string* | Container id.   |

**Returns:** *Promise*<*void*\>

Promise which resolves when the container has been stopped.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:124](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L124)

___

### translateVolumesConfig

▸ **translateVolumesConfig**(`volumeConfigs`: DockerAdapterVolumeConfig[]): DockerodeVolumeMountConfig[]

Translates DockerAdapterVolumeConfig to volumes configuration that Docker API can understand.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`volumeConfigs` | DockerAdapterVolumeConfig[] | Volumes configuration,   |

**Returns:** DockerodeVolumeMountConfig[]

Translated volumes configuration.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L49)

___

### wait

▸ **wait**(`container`: *string*, `options`: DockerAdapterWaitOptions): *Promise*<ExitData\>

Waits for container status change.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`container` | *string* | Container id.   |
`options` | DockerAdapterWaitOptions | Condition to be fullfilled. @see {DockerAdapterWaitOptions}   |

**Returns:** *Promise*<ExitData\>

Container exit code.

Defined in: [lib/adapters/docker/dockerode-docker-helper.ts:238](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/dockerode-docker-helper.ts#L238)

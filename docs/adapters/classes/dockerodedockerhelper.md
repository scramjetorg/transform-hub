[@scramjet/adapters](../README.md) / DockerodeDockerHelper

# Class: DockerodeDockerHelper

Communicates with Docker using Dockerode library.

## Implements

- [*IDockerHelper*](../interfaces/idockerhelper.md)

## Table of contents

### Constructors

- [constructor](dockerodedockerhelper.md#constructor)

### Properties

- [dockerode](dockerodedockerhelper.md#dockerode)
- [logger](dockerodedockerhelper.md#logger)

### Methods

- [attach](dockerodedockerhelper.md#attach)
- [createContainer](dockerodedockerhelper.md#createcontainer)
- [createVolume](dockerodedockerhelper.md#createvolume)
- [listVolumes](dockerodedockerhelper.md#listvolumes)
- [pullImage](dockerodedockerhelper.md#pullimage)
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

Defined in: [dockerode-docker-helper.ts:44](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L44)

___

### logger

• **logger**: Console

Defined in: [dockerode-docker-helper.ts:45](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L45)

## Methods

### attach

▸ **attach**(`container`: *string*, `opts`: *any*): *Promise*<any\>

Attaches to container streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | *string* | Container id. |
| `opts` | *any* | Attach options. |

**Returns:** *Promise*<any\>

Object with container's standard I/O streams.

Defined in: [dockerode-docker-helper.ts:216](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L216)

___

### createContainer

▸ **createContainer**(`containerCfg`: { `autoRemove`: *boolean* ; `binds`: *string*[] ; `command?`: *string*[] ; `dockerImage`: *string* ; `envs`: *string*[] ; `maxMem`: *number* ; `ports`: *any* ; `volumes`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]  }): *Promise*<string\>

Creates container based on provided parameters.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerCfg` | *object* | Image to start container from. |
| `containerCfg.autoRemove` | *boolean* | - |
| `containerCfg.binds` | *string*[] | - |
| `containerCfg.command?` | *string*[] | - |
| `containerCfg.dockerImage` | *string* | - |
| `containerCfg.envs` | *string*[] | - |
| `containerCfg.maxMem` | *number* | - |
| `containerCfg.ports` | *any* | - |
| `containerCfg.volumes` | [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[] | - |

**Returns:** *Promise*<string\>

Created container id.

Implementation of: IDockerHelper.createContainer

Defined in: [dockerode-docker-helper.ts:80](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L80)

___

### createVolume

▸ **createVolume**(`name?`: *string*): *Promise*<string\>

Creates docker volume.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | *string* | "" | Volume name. Optional. If not provided, volume will be named with unique name. |

**Returns:** *Promise*<string\>

Volume name.

Implementation of: IDockerHelper.createVolume

Defined in: [dockerode-docker-helper.ts:180](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L180)

___

### listVolumes

▸ **listVolumes**(): *Promise*<string[]\>

Lists exisiting volumes

**Returns:** *Promise*<string[]\>

Implementation of: IDockerHelper.listVolumes

Defined in: [dockerode-docker-helper.ts:201](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L201)

___

### pullImage

▸ **pullImage**(`name`: *string*, `ifNeeded`: *boolean*): *Promise*<void\>

Fetches the image from repo

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | *string* |
| `ifNeeded` | *boolean* |

**Returns:** *Promise*<void\>

Implementation of: [IDockerHelper](../interfaces/idockerhelper.md)

Defined in: [dockerode-docker-helper.ts:160](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L160)

___

### removeContainer

▸ **removeContainer**(`containerId`: *string*): *Promise*<void\>

Forcefully removes container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | *string* | Container id. |

**Returns:** *Promise*<void\>

Promise which resolves when container has been removed.

Implementation of: IDockerHelper.removeContainer

Defined in: [dockerode-docker-helper.ts:146](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L146)

___

### removeVolume

▸ **removeVolume**(`volumeName`: *string*): *Promise*<void\>

Removes volume with specific name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volumeName` | *string* | Volume name. |

**Returns:** *Promise*<void\>

Promise which resolves when volume has been removed.

Implementation of: IDockerHelper.removeVolume

Defined in: [dockerode-docker-helper.ts:197](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L197)

___

### run

▸ **run**(`config`: [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig)): *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

Starts container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig) | Container configuration. |

**Returns:** *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

@see {DockerAdapterRunResponse}

Implementation of: IDockerHelper.run

Defined in: [dockerode-docker-helper.ts:226](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L226)

___

### startContainer

▸ **startContainer**(`containerId`: *string*): *Promise*<void\>

Start continer with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | *string* | Container id. |

**Returns:** *Promise*<void\>

Promise resolving when container has been started.

Implementation of: IDockerHelper.startContainer

Defined in: [dockerode-docker-helper.ts:126](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L126)

___

### stats

▸ **stats**(`containerId`: *string*): *Promise*<ContainerStats\>

Gets statistics from container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | *string* | Container id. |

**Returns:** *Promise*<ContainerStats\>

Promise which resolves with container statistics.

Implementation of: IDockerHelper.stats

Defined in: [dockerode-docker-helper.ts:156](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L156)

___

### stopContainer

▸ **stopContainer**(`containerId`: *string*): *Promise*<void\>

Stops container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | *string* | Container id. |

**Returns:** *Promise*<void\>

Promise which resolves when the container has been stopped.

Implementation of: IDockerHelper.stopContainer

Defined in: [dockerode-docker-helper.ts:136](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L136)

___

### translateVolumesConfig

▸ **translateVolumesConfig**(`volumeConfigs`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]): DockerodeVolumeMountConfig[]

Translates DockerAdapterVolumeConfig to volumes configuration that Docker API can understand.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volumeConfigs` | [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[] | Volumes configuration, |

**Returns:** DockerodeVolumeMountConfig[]

Translated volumes configuration.

Implementation of: IDockerHelper.translateVolumesConfig

Defined in: [dockerode-docker-helper.ts:54](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L54)

___

### wait

▸ **wait**(`container`: *string*, `options`: [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions)): *Promise*<[*ExitData*](../README.md#exitdata)\>

Waits for container status change.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | *string* | Container id. |
| `options` | [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions) | Condition to be fullfilled. @see {DockerAdapterWaitOptions} |

**Returns:** *Promise*<[*ExitData*](../README.md#exitdata)\>

Container exit code.

Implementation of: [IDockerHelper](../interfaces/idockerhelper.md)

Defined in: [dockerode-docker-helper.ts:280](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/dockerode-docker-helper.ts#L280)

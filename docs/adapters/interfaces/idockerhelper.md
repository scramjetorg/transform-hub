[@scramjet/adapters](../README.md) / IDockerHelper

# Interface: IDockerHelper

## Implemented by

- [*DockerodeDockerHelper*](../classes/dockerodedockerhelper.md)

## Table of contents

### Properties

- [createContainer](idockerhelper.md#createcontainer)
- [createVolume](idockerhelper.md#createvolume)
- [listVolumes](idockerhelper.md#listvolumes)
- [removeContainer](idockerhelper.md#removecontainer)
- [removeVolume](idockerhelper.md#removevolume)
- [run](idockerhelper.md#run)
- [startContainer](idockerhelper.md#startcontainer)
- [stats](idockerhelper.md#stats)
- [stopContainer](idockerhelper.md#stopcontainer)
- [translateVolumesConfig](idockerhelper.md#translatevolumesconfig)

### Methods

- [pullImage](idockerhelper.md#pullimage)
- [wait](idockerhelper.md#wait)

## Properties

### createContainer

• **createContainer**: (`containerCfg`: { `autoRemove`: *boolean* ; `binds`: *string*[] ; `dockerImage`: *string* ; `envs`: *string*[] ; `maxMem`: *number* ; `ports`: *any* ; `volumes`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]  }) => *Promise*<string\>

Creates Docker container from provided image with attached volumes and local directories.

**`param`** Docker image name.

**`param`** Volumes to be mounted to container.

**`param`** Directories to be mounted.

**`param`** Environment variables.

**`param`** If true, container will be removed when finished.

**`returns`** Created container.

#### Type declaration

▸ (`containerCfg`: { `autoRemove`: *boolean* ; `binds`: *string*[] ; `dockerImage`: *string* ; `envs`: *string*[] ; `maxMem`: *number* ; `ports`: *any* ; `volumes`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]  }): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerCfg` | *object* |
| `containerCfg.autoRemove` | *boolean* |
| `containerCfg.binds` | *string*[] |
| `containerCfg.dockerImage` | *string* |
| `containerCfg.envs` | *string*[] |
| `containerCfg.maxMem` | *number* |
| `containerCfg.ports` | *any* |
| `containerCfg.volumes` | [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[] |

**Returns:** *Promise*<string\>

Defined in: [types.ts:174](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L174)

___

### createVolume

• **createVolume**: (`name?`: *string*) => *Promise*<string\>

Creates volume.

**`param`** Volume name.

**`returns`** Created volume.

#### Type declaration

▸ (`name?`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name?` | *string* |

**Returns:** *Promise*<string\>

Defined in: [types.ts:227](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L227)

___

### listVolumes

• **listVolumes**: () => *Promise*<string[]\>

Lists exisiting volumes

**`returns`** List of existing volumes

#### Type declaration

▸ (): *Promise*<string[]\>

**Returns:** *Promise*<string[]\>

Defined in: [types.ts:218](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L218)

___

### removeContainer

• **removeContainer**: (`containerId`: *string*) => *Promise*<void\>

Removes container.

**`param`** Container id.

**`returns`**

#### Type declaration

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:211](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L211)

___

### removeVolume

• **removeVolume**: (`volumeId`: *string*) => *Promise*<void\>

Removes volume.

**`param`**

**`returns`**

#### Type declaration

▸ (`volumeId`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `volumeId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:236](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L236)

___

### run

• **run**: (`config`: [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig)) => *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

Executes command in container.

**`param`** Execution configuration.

**`returns`**

#### Type declaration

▸ (`config`: [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig)): *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig) |

**Returns:** *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

Defined in: [types.ts:245](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L245)

___

### startContainer

• **startContainer**: (`containerId`: *string*) => *Promise*<void\>

Starts container.

**`param`** Container to be started.

**`returns`**

#### Type declaration

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:192](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L192)

___

### stats

• **stats**: (`containerId`: *string*) => *Promise*<ContainerStats\>

#### Type declaration

▸ (`containerId`: *string*): *Promise*<ContainerStats\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | *string* |

**Returns:** *Promise*<ContainerStats\>

Defined in: [types.ts:203](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L203)

___

### stopContainer

• **stopContainer**: (`containerId`: *string*) => *Promise*<void\>

Stops container.

**`param`** Container id to be stopped.

**`returns`**

#### Type declaration

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:201](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L201)

___

### translateVolumesConfig

• **translateVolumesConfig**: (`volumeConfigs`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]) => *any*

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

**`param`** Volume configuration objects.

**`returns`** DockerHelper volume configuration.

#### Type declaration

▸ (`volumeConfigs`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]): *any*

#### Parameters

| Name | Type |
| :------ | :------ |
| `volumeConfigs` | [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[] |

**Returns:** *any*

Defined in: [types.ts:161](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L161)

## Methods

### pullImage

▸ **pullImage**(`name`: *string*, `ifNeeded`: *boolean*): *Promise*<void\>

Fetches the image from repo

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | *string* | the name of the image, eg. ubuntu:latest |
| `ifNeeded` | *boolean* | fetch only if not exists (defaults to true) |

**Returns:** *Promise*<void\>

Defined in: [types.ts:262](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L262)

___

### wait

▸ **wait**(`container`: *string*, `options?`: [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions)): *Promise*<[*ExitData*](../README.md#exitdata)\>

Waits until containter exits

#### Parameters

| Name | Type |
| :------ | :------ |
| `container` | *string* |
| `options?` | [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions) |

**Returns:** *Promise*<[*ExitData*](../README.md#exitdata)\>

Defined in: [types.ts:254](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/types.ts#L254)

[@scramjet/adapters](../README.md) / IDockerHelper

# Interface: IDockerHelper

## Hierarchy

* **IDockerHelper**

## Implemented by

* [*DockerodeDockerHelper*](../classes/dockerodedockerhelper.md)

## Table of contents

### Properties

- [createContainer](idockerhelper.md#createcontainer)
- [createVolume](idockerhelper.md#createvolume)
- [removeContainer](idockerhelper.md#removecontainer)
- [removeVolume](idockerhelper.md#removevolume)
- [run](idockerhelper.md#run)
- [startContainer](idockerhelper.md#startcontainer)
- [stats](idockerhelper.md#stats)
- [stopContainer](idockerhelper.md#stopcontainer)
- [translateVolumesConfig](idockerhelper.md#translatevolumesconfig)

### Methods

- [wait](idockerhelper.md#wait)

## Properties

### createContainer

• **createContainer**: (`dockerImage`: *string*, `volumes`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[], `binds`: *string*[], `envs`: *string*[], `autoRemove`: *boolean*, `maxMem`: *number*) => *Promise*<*string*\>

Creates Docker container from provided image with attached volumes and local directories.

**`param`** Docker image name.

**`param`** Volumes to be mounted to container.

**`param`** Directories to be mounted.

**`param`** Environment variables.

**`param`** If true, container will be removed when finished.

**`returns`** Created container.

Defined in: [types.ts:163](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L163)

___

### createVolume

• **createVolume**: (`name?`: *string*) => *Promise*<*string*\>

Creates volume.

**`param`** Volume name.

**`returns`** Created volume.

Defined in: [types.ts:206](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L206)

___

### removeContainer

• **removeContainer**: (`containerId`: *string*) => *Promise*<*void*\>

Removes container.

**`param`** Container id.

**`returns`** 

Defined in: [types.ts:197](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L197)

___

### removeVolume

• **removeVolume**: (`volumeId`: *string*) => *Promise*<*void*\>

Removes volume.

**`param`** 

**`returns`** 

Defined in: [types.ts:215](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L215)

___

### run

• **run**: (`config`: [*DockerAdapterRunConfig*](../README.md#dockeradapterrunconfig)) => *Promise*<[*DockerAdapterRunResponse*](../README.md#dockeradapterrunresponse)\>

Executes command in container.

**`param`** Execution configuration.

**`returns`** 

Defined in: [types.ts:224](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L224)

___

### startContainer

• **startContainer**: (`containerId`: *string*) => *Promise*<*void*\>

Starts container.

**`param`** Container to be started.

**`returns`** 

Defined in: [types.ts:178](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L178)

___

### stats

• **stats**: (`containerId`: *string*) => *Promise*<ContainerStats\>

Defined in: [types.ts:189](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L189)

___

### stopContainer

• **stopContainer**: (`containerId`: *string*) => *Promise*<*void*\>

Stops container.

**`param`** Container id to be stopped.

**`returns`** 

Defined in: [types.ts:187](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L187)

___

### translateVolumesConfig

• **translateVolumesConfig**: (`volumeConfigs`: [*DockerAdapterVolumeConfig*](../README.md#dockeradaptervolumeconfig)[]) => *any*

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

**`param`** Volume configuration objects.

**`returns`** DockerHelper volume configuration.

Defined in: [types.ts:150](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L150)

## Methods

### wait

▸ **wait**(`container`: *string*, `options?`: [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions)): *Promise*<[*ExitData*](../README.md#exitdata)\>

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`container` | *string* |     |
`options?` | [*DockerAdapterWaitOptions*](../README.md#dockeradapterwaitoptions) | - |

**Returns:** *Promise*<[*ExitData*](../README.md#exitdata)\>

Defined in: [types.ts:232](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/types.ts#L232)

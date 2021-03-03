[@scramjet/supervisor](../README.md) / [Exports](../modules.md) / DockerHelper

# Interface: DockerHelper

## Table of contents

### Properties

- [createContainer](dockerhelper.md#createcontainer)
- [createVolume](dockerhelper.md#createvolume)
- [execCommand](dockerhelper.md#execcommand)
- [removeContainer](dockerhelper.md#removecontainer)
- [removeVolume](dockerhelper.md#removevolume)
- [run](dockerhelper.md#run)
- [startContainer](dockerhelper.md#startcontainer)
- [stopContainer](dockerhelper.md#stopcontainer)
- [translateVolumesConfig](dockerhelper.md#translatevolumesconfig)

## Properties

### createContainer

• **createContainer**: (`dockerImage`: *string*, `volumes`: [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[], `binds`: *string*[]) => *Promise*<string\>

Creates Docker container from provided image with attached volumes and local directories.

**`param`** Docker image name.

**`param`** Volumes to be mounted to container.

**`param`** Directories to be mounted.

**`returns`** Created container.

#### Type declaration:

▸ (`dockerImage`: *string*, `volumes`: [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[], `binds`: *string*[]): *Promise*<string\>

#### Parameters:

Name | Type |
:------ | :------ |
`dockerImage` | *string* |
`volumes` | [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[] |
`binds` | *string*[] |

**Returns:** *Promise*<string\>

Defined in: [types.ts:124](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L124)

Defined in: [types.ts:124](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L124)

___

### createVolume

• **createVolume**: (`name?`: *string*) => *Promise*<string\>

Creates volume.

**`param`** Volume name.

**`returns`** Created volume.

#### Type declaration:

▸ (`name?`: *string*): *Promise*<string\>

#### Parameters:

Name | Type |
:------ | :------ |
`name?` | *string* |

**Returns:** *Promise*<string\>

Defined in: [types.ts:173](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L173)

Defined in: [types.ts:173](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L173)

___

### execCommand

• **execCommand**: (`containerId`: *string*, `command`: *string*[]) => *Promise*<[*DockerAdapterStreams*](../modules.md#dockeradapterstreams)\>

Executes command in container.

**`param`** Container.

**`param`** Command with optional parameters.

**`returns`** Container standard streams.

#### Type declaration:

▸ (`containerId`: *string*, `command`: *string*[]): *Promise*<[*DockerAdapterStreams*](../modules.md#dockeradapterstreams)\>

#### Parameters:

Name | Type |
:------ | :------ |
`containerId` | *string* |
`command` | *string*[] |

**Returns:** *Promise*<[*DockerAdapterStreams*](../modules.md#dockeradapterstreams)\>

Defined in: [types.ts:164](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L164)

Defined in: [types.ts:164](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L164)

___

### removeContainer

• **removeContainer**: (`containerId`: *string*) => *Promise*<void\>

Removes container.

**`param`** Container id.

**`returns`** 

#### Type declaration:

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:154](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L154)

Defined in: [types.ts:154](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L154)

___

### removeVolume

• **removeVolume**: (`volumeId`: *string*) => *Promise*<void\>

Removes volume.

**`param`** 

**`returns`** 

#### Type declaration:

▸ (`volumeId`: *string*): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`volumeId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:182](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L182)

Defined in: [types.ts:182](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L182)

___

### run

• **run**: (`config`: [*DockerAdapterRunConfig*](../modules.md#dockeradapterrunconfig)) => *Promise*<[*DockerAdapterRunResponse*](../modules.md#dockeradapterrunresponse)\>

Executes command in container.

**`param`** Execution configuration.

**`returns`** 

#### Type declaration:

▸ (`config`: [*DockerAdapterRunConfig*](../modules.md#dockeradapterrunconfig)): *Promise*<[*DockerAdapterRunResponse*](../modules.md#dockeradapterrunresponse)\>

#### Parameters:

Name | Type |
:------ | :------ |
`config` | [*DockerAdapterRunConfig*](../modules.md#dockeradapterrunconfig) |

**Returns:** *Promise*<[*DockerAdapterRunResponse*](../modules.md#dockeradapterrunresponse)\>

Defined in: [types.ts:191](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L191)

Defined in: [types.ts:191](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L191)

___

### startContainer

• **startContainer**: (`containerId`: *string*) => *Promise*<void\>

Starts container.

**`param`** Container to be started.

**`returns`** 

#### Type declaration:

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:136](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L136)

Defined in: [types.ts:136](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L136)

___

### stopContainer

• **stopContainer**: (`containerId`: *string*) => *Promise*<void\>

Stops container.

**`param`** Container id to be stopped.

**`returns`** 

#### Type declaration:

▸ (`containerId`: *string*): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`containerId` | *string* |

**Returns:** *Promise*<void\>

Defined in: [types.ts:145](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L145)

Defined in: [types.ts:145](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L145)

___

### translateVolumesConfig

• **translateVolumesConfig**: (`volumeConfigs`: [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[]) => *any*

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

**`param`** Volume configuration objects.

**`returns`** DockerHelper volume configuration.

#### Type declaration:

▸ (`volumeConfigs`: [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[]): *any*

#### Parameters:

Name | Type |
:------ | :------ |
`volumeConfigs` | [*DockerAdapterVolumeConfig*](../modules.md#dockeradaptervolumeconfig)[] |

**Returns:** *any*

Defined in: [types.ts:113](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L113)

Defined in: [types.ts:113](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L113)

[@scramjet/adapters](../README.md) / IDockerHelper

# Interface: IDockerHelper

## Implemented by

- [`DockerodeDockerHelper`](../classes/dockerodedockerhelper.md)

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

• **createContainer**: (`containerCfg`: { `autoRemove`: `boolean` ; `binds`: `string`[] ; `dockerImage`: `string` ; `envs`: `string`[] ; `labels`: { [key: string]: `string`;  } ; `maxMem`: `number` ; `ports`: `any` ; `publishAllPorts`: `boolean` ; `volumes`: [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[]  }) => `Promise`<`string`\>

#### Type declaration

▸ (`containerCfg`): `Promise`<`string`\>

Creates Docker container from provided image with attached volumes and local directories.

##### Parameters

| Name | Type |
| :------ | :------ |
| `containerCfg` | `Object` |
| `containerCfg.autoRemove` | `boolean` |
| `containerCfg.binds` | `string`[] |
| `containerCfg.dockerImage` | `string` |
| `containerCfg.envs` | `string`[] |
| `containerCfg.labels` | `Object` |
| `containerCfg.maxMem` | `number` |
| `containerCfg.ports` | `any` |
| `containerCfg.publishAllPorts` | `boolean` |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[] |

##### Returns

`Promise`<`string`\>

Created container.

#### Defined in

[types.ts:180](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L180)

___

### createVolume

• **createVolume**: (`name?`: `string`) => `Promise`<`string`\>

#### Type declaration

▸ (`name?`): `Promise`<`string`\>

Creates volume.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name?` | `string` | Volume name. |

##### Returns

`Promise`<`string`\>

Created volume.

#### Defined in

[types.ts:238](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L238)

___

### listVolumes

• **listVolumes**: () => `Promise`<`string`[]\>

#### Type declaration

▸ (): `Promise`<`string`[]\>

Lists exisiting volumes

##### Returns

`Promise`<`string`[]\>

List of existing volumes

#### Defined in

[types.ts:229](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L229)

___

### removeContainer

• **removeContainer**: (`containerId`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`containerId`): `Promise`<`void`\>

Removes container.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

##### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:222](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L222)

___

### removeVolume

• **removeVolume**: (`volumeId`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`volumeId`): `Promise`<`void`\>

Removes volume.

##### Parameters

| Name | Type |
| :------ | :------ |
| `volumeId` | `string` |

##### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:247](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L247)

___

### run

• **run**: (`config`: [`DockerAdapterRunConfig`](../README.md#dockeradapterrunconfig)) => `Promise`<[`DockerAdapterRunResponse`](../README.md#dockeradapterrunresponse)\>

#### Type declaration

▸ (`config`): `Promise`<[`DockerAdapterRunResponse`](../README.md#dockeradapterrunresponse)\>

Executes command in container.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../README.md#dockeradapterrunconfig) | Execution configuration. |

##### Returns

`Promise`<[`DockerAdapterRunResponse`](../README.md#dockeradapterrunresponse)\>

#### Defined in

[types.ts:256](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L256)

___

### startContainer

• **startContainer**: (`containerId`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`containerId`): `Promise`<`void`\>

Starts container.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container to be started. |

##### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:203](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L203)

___

### stats

• **stats**: (`containerId`: `string`) => `Promise`<`ContainerStats`\>

#### Type declaration

▸ (`containerId`): `Promise`<`ContainerStats`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | `string` |

##### Returns

`Promise`<`ContainerStats`\>

#### Defined in

[types.ts:214](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L214)

___

### stopContainer

• **stopContainer**: (`containerId`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`containerId`): `Promise`<`void`\>

Stops container.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id to be stopped. |

##### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:212](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L212)

___

### translateVolumesConfig

• **translateVolumesConfig**: (`volumeConfigs`: [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[]) => `any`

#### Type declaration

▸ (`volumeConfigs`): `any`

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

##### Parameters

| Name | Type |
| :------ | :------ |
| `volumeConfigs` | [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[] |

##### Returns

`any`

DockerHelper volume configuration.

#### Defined in

[types.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L167)

## Methods

### pullImage

▸ **pullImage**(`name`, `fetchOnlyIfNotExists?`): `Promise`<`void`\>

Fetches the image from repo

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the image, eg. ubuntu:latest |
| `fetchOnlyIfNotExists?` | `boolean` | fetch only if not exists (defaults to true) |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:273](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L273)

___

### wait

▸ **wait**(`container`, `options?`): `Promise`<[`ExitData`](../README.md#exitdata)\>

Waits until containter exits

#### Parameters

| Name | Type |
| :------ | :------ |
| `container` | `string` |
| `options?` | [`DockerAdapterWaitOptions`](../README.md#dockeradapterwaitoptions) |

#### Returns

`Promise`<[`ExitData`](../README.md#exitdata)\>

#### Defined in

[types.ts:265](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L265)

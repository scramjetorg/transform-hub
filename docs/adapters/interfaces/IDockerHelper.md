[@scramjet/adapters](../README.md) / [Exports](../modules.md) / IDockerHelper

# Interface: IDockerHelper

## Implemented by

- [`DockerodeDockerHelper`](../classes/DockerodeDockerHelper.md)

## Table of contents

### Methods

- [connectToNetwork](IDockerHelper.md#connecttonetwork)
- [createContainer](IDockerHelper.md#createcontainer)
- [createNetwork](IDockerHelper.md#createnetwork)
- [createVolume](IDockerHelper.md#createvolume)
- [inspectNetwork](IDockerHelper.md#inspectnetwork)
- [listNetworks](IDockerHelper.md#listnetworks)
- [listVolumes](IDockerHelper.md#listvolumes)
- [pullImage](IDockerHelper.md#pullimage)
- [removeContainer](IDockerHelper.md#removecontainer)
- [removeVolume](IDockerHelper.md#removevolume)
- [run](IDockerHelper.md#run)
- [startContainer](IDockerHelper.md#startcontainer)
- [stats](IDockerHelper.md#stats)
- [stopContainer](IDockerHelper.md#stopcontainer)
- [translateVolumesConfig](IDockerHelper.md#translatevolumesconfig)
- [wait](IDockerHelper.md#wait)

### Properties

- [logger](IDockerHelper.md#logger)

## Methods

### connectToNetwork

▸ **connectToNetwork**(`networkid`, `container`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `networkid` | `string` |
| `container` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:301](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L301)

___

### createContainer

▸ **createContainer**(`containerCfg`): `Promise`<`string`\>

Creates Docker container from provided image with attached volumes and local directories.

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerCfg` | `Object` |
| `containerCfg.autoRemove` | `boolean` |
| `containerCfg.binds` | `string`[] |
| `containerCfg.dockerImage` | `string` |
| `containerCfg.envs` | `string`[] |
| `containerCfg.labels` | `Object` |
| `containerCfg.maxMem` | `number` |
| `containerCfg.networkMode?` | `string` |
| `containerCfg.ports` | `any` |
| `containerCfg.publishAllPorts` | `boolean` |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] |

#### Returns

`Promise`<`string`\>

Created container.

#### Defined in

[types.ts:201](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L201)

___

### createNetwork

▸ **createNetwork**(`config`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`DockerCreateNetworkConfig`](../modules.md#dockercreatenetworkconfig) |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:303](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L303)

___

### createVolume

▸ **createVolume**(`name?`): `Promise`<`string`\>

Creates volume.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name?` | `string` | Volume name. |

#### Returns

`Promise`<`string`\>

Created volume.

#### Defined in

[types.ts:260](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L260)

___

### inspectNetwork

▸ **inspectNetwork**(`id`): `Promise`<[`DockerNetwork`](../modules.md#dockernetwork)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<[`DockerNetwork`](../modules.md#dockernetwork)\>

#### Defined in

[types.ts:299](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L299)

___

### listNetworks

▸ **listNetworks**(): `Promise`<`NetworkInspectInfo`[]\>

#### Returns

`Promise`<`NetworkInspectInfo`[]\>

#### Defined in

[types.ts:297](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L297)

___

### listVolumes

▸ **listVolumes**(): `Promise`<`string`[]\>

Lists existing volumes

#### Returns

`Promise`<`string`[]\>

List of existing volumes

#### Defined in

[types.ts:251](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L251)

___

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

[types.ts:295](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L295)

___

### removeContainer

▸ **removeContainer**(`containerId`): `Promise`<`void`\>

Removes container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:244](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L244)

___

### removeVolume

▸ **removeVolume**(`volumeId`): `Promise`<`void`\>

Removes volume.

#### Parameters

| Name | Type |
| :------ | :------ |
| `volumeId` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:269](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L269)

___

### run

▸ **run**(`config`): `Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

Executes command in container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../modules.md#dockeradapterrunconfig) | Execution configuration. |

#### Returns

`Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

#### Defined in

[types.ts:278](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L278)

___

### startContainer

▸ **startContainer**(`containerId`): `Promise`<`void`\>

Starts container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container to be started. |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:225](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L225)

___

### stats

▸ **stats**(`containerId`): `Promise`<`ContainerStats`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `containerId` | `string` |

#### Returns

`Promise`<`ContainerStats`\>

#### Defined in

[types.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L236)

___

### stopContainer

▸ **stopContainer**(`containerId`): `Promise`<`void`\>

Stops container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id to be stopped. |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:234](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L234)

___

### translateVolumesConfig

▸ **translateVolumesConfig**(`volumeConfigs`): `any`

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

#### Parameters

| Name | Type |
| :------ | :------ |
| `volumeConfigs` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] |

#### Returns

`any`

DockerHelper volume configuration.

#### Defined in

[types.ts:188](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L188)

___

### wait

▸ **wait**(`container`, `options?`): `Promise`<[`ExitData`](../modules.md#exitdata)\>

Waits until container exits

#### Parameters

| Name | Type |
| :------ | :------ |
| `container` | `string` |
| `options?` | [`DockerAdapterWaitOptions`](../modules.md#dockeradapterwaitoptions) |

#### Returns

`Promise`<[`ExitData`](../modules.md#exitdata)\>

#### Defined in

[types.ts:287](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L287)

## Properties

### logger

• **logger**: `IObjectLogger`

#### Defined in

[types.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L179)

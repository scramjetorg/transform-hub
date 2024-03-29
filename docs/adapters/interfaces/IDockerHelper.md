[@scramjet/adapters](../README.md) / [Exports](../modules.md) / IDockerHelper

# Interface: IDockerHelper

## Implemented by

- [`DockerodeDockerHelper`](../classes/DockerodeDockerHelper.md)

## Table of contents

### Methods

- [connectToNetwork](IDockerHelper.md#connecttonetwork)
- [createNetwork](IDockerHelper.md#createnetwork)
- [getContainerIdByLabel](IDockerHelper.md#getcontaineridbylabel)
- [inspectNetwork](IDockerHelper.md#inspectnetwork)
- [listNetworks](IDockerHelper.md#listnetworks)
- [pullImage](IDockerHelper.md#pullimage)
- [wait](IDockerHelper.md#wait)

### Properties

- [createContainer](IDockerHelper.md#createcontainer)
- [createVolume](IDockerHelper.md#createvolume)
- [listVolumes](IDockerHelper.md#listvolumes)
- [logger](IDockerHelper.md#logger)
- [removeContainer](IDockerHelper.md#removecontainer)
- [removeVolume](IDockerHelper.md#removevolume)
- [run](IDockerHelper.md#run)
- [startContainer](IDockerHelper.md#startcontainer)
- [stats](IDockerHelper.md#stats)
- [stopContainer](IDockerHelper.md#stopcontainer)
- [translateVolumesConfig](IDockerHelper.md#translatevolumesconfig)

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

[types.ts:313](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L313)

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

[types.ts:315](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L315)

___

### getContainerIdByLabel

▸ **getContainerIdByLabel**(`label`, `value`): `Promise`<`string`\>

Gets first found container by a given label

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `label` | `string` | the label |
| `value` | `string` | label value. |

#### Returns

`Promise`<`string`\>

#### Defined in

[types.ts:199](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L199)

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

[types.ts:311](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L311)

___

### listNetworks

▸ **listNetworks**(): `Promise`<`NetworkInspectInfo`[]\>

#### Returns

`Promise`<`NetworkInspectInfo`[]\>

#### Defined in

[types.ts:309](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L309)

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

[types.ts:307](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L307)

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

[types.ts:299](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L299)

## Properties

### createContainer

• **createContainer**: (`containerCfg`: { `autoRemove`: `boolean` ; `binds`: `string`[] ; `dockerImage`: `string` ; `envs`: `string`[] ; `gpu`: `boolean` ; `labels`: { `[key: string]`: `string`;  } ; `maxMem`: `number` ; `networkMode?`: `string` ; `ports`: `any` ; `publishAllPorts`: `boolean` ; `volumes`: [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[]  }) => `Promise`<`string`\>

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
| `containerCfg.gpu` | `boolean` |
| `containerCfg.labels` | `Object` |
| `containerCfg.maxMem` | `number` |
| `containerCfg.networkMode?` | `string` |
| `containerCfg.ports` | `any` |
| `containerCfg.publishAllPorts` | `boolean` |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] |

##### Returns

`Promise`<`string`\>

Created container.

#### Defined in

[types.ts:212](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L212)

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

[types.ts:272](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L272)

___

### listVolumes

• **listVolumes**: () => `Promise`<`string`[]\>

#### Type declaration

▸ (): `Promise`<`string`[]\>

Lists existing volumes

##### Returns

`Promise`<`string`[]\>

List of existing volumes

#### Defined in

[types.ts:263](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L263)

___

### logger

• **logger**: `IObjectLogger`

#### Defined in

[types.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L182)

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

[types.ts:256](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L256)

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

[types.ts:281](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L281)

___

### run

• **run**: (`config`: [`DockerAdapterRunConfig`](../modules.md#dockeradapterrunconfig)) => `Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

#### Type declaration

▸ (`config`): `Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

Executes command in container.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../modules.md#dockeradapterrunconfig) | Execution configuration. |

##### Returns

`Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

#### Defined in

[types.ts:290](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L290)

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

[types.ts:237](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L237)

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

[types.ts:248](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L248)

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

[types.ts:246](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L246)

___

### translateVolumesConfig

• **translateVolumesConfig**: (`volumeConfigs`: [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[]) => `any`

#### Type declaration

▸ (`volumeConfigs`): `any`

Converts pairs of mount path and volume name to DockerHelper specific volume configuration.

##### Parameters

| Name | Type |
| :------ | :------ |
| `volumeConfigs` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] |

##### Returns

`any`

DockerHelper volume configuration.

#### Defined in

[types.ts:191](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L191)

[@scramjet/adapters](../README.md) / [Exports](../modules.md) / IDockerHelper

# Interface: IDockerHelper

## Implemented by

- [`DockerodeDockerHelper`](../classes/dockerodedockerhelper.md)

## Table of contents

### Methods

- [connectToNetwork](idockerhelper.md#connecttonetwork)
- [createNetwork](idockerhelper.md#createnetwork)
- [inspectNetwork](idockerhelper.md#inspectnetwork)
- [listNetworks](idockerhelper.md#listnetworks)
- [pullImage](idockerhelper.md#pullimage)
- [wait](idockerhelper.md#wait)

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

[types.ts:286](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L286)

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

[types.ts:288](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L288)

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

[types.ts:284](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L284)

___

### listNetworks

▸ **listNetworks**(): `Promise`<`NetworkInspectInfo`[]\>

#### Returns

`Promise`<`NetworkInspectInfo`[]\>

#### Defined in

[types.ts:282](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L282)

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

[types.ts:280](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L280)

___

### wait

▸ **wait**(`container`, `options?`): `Promise`<[`ExitData`](../modules.md#exitdata)\>

Waits until containter exits

#### Parameters

| Name | Type |
| :------ | :------ |
| `container` | `string` |
| `options?` | [`DockerAdapterWaitOptions`](../modules.md#dockeradapterwaitoptions) |

#### Returns

`Promise`<[`ExitData`](../modules.md#exitdata)\>

#### Defined in

[types.ts:272](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L272)

## Properties

### createContainer

• **createContainer**: (`containerCfg`: { `autoRemove`: `boolean` ; `binds`: `string`[] ; `dockerImage`: `string` ; `envs`: `string`[] ; `labels`: { [key: string]: `string`;  } ; `maxMem`: `number` ; `networkMode?`: `string` ; `ports`: `any` ; `publishAllPorts`: `boolean` ; `volumes`: [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[]  }) => `Promise`<`string`\>

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
| `containerCfg.networkMode?` | `string` |
| `containerCfg.ports` | `any` |
| `containerCfg.publishAllPorts` | `boolean` |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] |

##### Returns

`Promise`<`string`\>

Created container.

#### Defined in

[types.ts:186](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L186)

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

[types.ts:245](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L245)

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

[types.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L236)

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

[types.ts:229](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L229)

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

[types.ts:254](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L254)

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

[types.ts:263](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L263)

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

[types.ts:210](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L210)

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

[types.ts:221](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L221)

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

[types.ts:219](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L219)

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

[types.ts:173](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L173)

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

• **createContainer**: (`containerCfg`: { `autoRemove`: `boolean` ; `binds`: `string`[] ; `dockerImage`: `string` ; `envs`: `string`[] ; `maxMem`: `number` ; `ports`: `any` ; `volumes`: [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[]  }) => `Promise`<`string`\>

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
| `containerCfg.maxMem` | `number` |
| `containerCfg.ports` | `any` |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[] |

##### Returns

`Promise`<`string`\>

Created container.

#### Defined in

[types.ts:174](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L174)

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

[types.ts:227](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L227)

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

[types.ts:218](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L218)

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

[types.ts:211](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L211)

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

[types.ts:236](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L236)

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

[types.ts:245](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L245)

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

[types.ts:192](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L192)

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

[types.ts:203](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L203)

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

[types.ts:201](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L201)

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

[types.ts:161](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L161)

## Methods

### pullImage

▸ **pullImage**(`name`, `ifNeeded`): `Promise`<`void`\>

Fetches the image from repo

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the image, eg. ubuntu:latest |
| `ifNeeded` | `boolean` | fetch only if not exists (defaults to true) |

#### Returns

`Promise`<`void`\>

#### Defined in

[types.ts:262](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L262)

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

[types.ts:254](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/types.ts#L254)

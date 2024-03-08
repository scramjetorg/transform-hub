[@scramjet/adapters](../README.md) / [Exports](../modules.md) / DockerodeDockerHelper

# Class: DockerodeDockerHelper

Communicates with Docker using Dockerode library.

## Implements

- [`IDockerHelper`](../interfaces/IDockerHelper.md)

## Table of contents

### Methods

- [attach](DockerodeDockerHelper.md#attach)
- [connectToNetwork](DockerodeDockerHelper.md#connecttonetwork)
- [createContainer](DockerodeDockerHelper.md#createcontainer)
- [createNetwork](DockerodeDockerHelper.md#createnetwork)
- [createVolume](DockerodeDockerHelper.md#createvolume)
- [getContainerIdByLabel](DockerodeDockerHelper.md#getcontaineridbylabel)
- [inspectNetwork](DockerodeDockerHelper.md#inspectnetwork)
- [isDockerConfigured](DockerodeDockerHelper.md#isdockerconfigured)
- [isImageInLocalRegistry](DockerodeDockerHelper.md#isimageinlocalregistry)
- [listNetworks](DockerodeDockerHelper.md#listnetworks)
- [listVolumes](DockerodeDockerHelper.md#listvolumes)
- [pullImage](DockerodeDockerHelper.md#pullimage)
- [removeContainer](DockerodeDockerHelper.md#removecontainer)
- [removeVolume](DockerodeDockerHelper.md#removevolume)
- [run](DockerodeDockerHelper.md#run)
- [startContainer](DockerodeDockerHelper.md#startcontainer)
- [stats](DockerodeDockerHelper.md#stats)
- [stopContainer](DockerodeDockerHelper.md#stopcontainer)
- [translateVolumesConfig](DockerodeDockerHelper.md#translatevolumesconfig)
- [wait](DockerodeDockerHelper.md#wait)

### Constructors

- [constructor](DockerodeDockerHelper.md#constructor)

### Properties

- [dockerode](DockerodeDockerHelper.md#dockerode)
- [logger](DockerodeDockerHelper.md#logger)
- [pulledImages](DockerodeDockerHelper.md#pulledimages)

## Methods

### attach

▸ **attach**(`container`, `opts`): `Promise`<`any`\>

Attaches to container streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | `string` | Container id. |
| `opts` | `any` | Attach options. |

#### Returns

`Promise`<`any`\>

Object with container's standard I/O streams.

#### Defined in

[dockerode-docker-helper.ts:308](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L308)

___

### connectToNetwork

▸ **connectToNetwork**(`networkid`, `container`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `networkid` | `string` |
| `container` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[connectToNetwork](../interfaces/IDockerHelper.md#connecttonetwork)

#### Defined in

[dockerode-docker-helper.ts:401](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L401)

___

### createContainer

▸ **createContainer**(`containerCfg`): `Promise`<`string`\>

Creates container based on provided parameters.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerCfg` | `Object` | Image to start container from. |
| `containerCfg.autoRemove` | `boolean` | - |
| `containerCfg.binds` | `string`[] | - |
| `containerCfg.command?` | `string`[] | - |
| `containerCfg.dockerImage` | `string` | - |
| `containerCfg.envs` | `string`[] | - |
| `containerCfg.gpu?` | `boolean` | - |
| `containerCfg.labels` | `Object` | - |
| `containerCfg.maxMem` | `number` | - |
| `containerCfg.networkMode?` | `string` | - |
| `containerCfg.ports` | `any` | - |
| `containerCfg.publishAllPorts` | `boolean` | - |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] | - |

#### Returns

`Promise`<`string`\>

Promise resolving with created container id.

#### Implementation of

IDockerHelper.createContainer

#### Defined in

[dockerode-docker-helper.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L94)

___

### createNetwork

▸ **createNetwork**(`config`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`DockerCreateNetworkConfig`](../modules.md#dockercreatenetworkconfig) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[createNetwork](../interfaces/IDockerHelper.md#createnetwork)

#### Defined in

[dockerode-docker-helper.ts:405](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L405)

___

### createVolume

▸ **createVolume**(`name?`): `Promise`<`string`\>

Creates docker volume.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | `string` | `""` | Volume name. Optional. If not provided, volume will be named with unique name. |

#### Returns

`Promise`<`string`\>

Volume name.

#### Implementation of

IDockerHelper.createVolume

#### Defined in

[dockerode-docker-helper.ts:272](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L272)

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

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[getContainerIdByLabel](../interfaces/IDockerHelper.md#getcontaineridbylabel)

#### Defined in

[dockerode-docker-helper.ts:153](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L153)

___

### inspectNetwork

▸ **inspectNetwork**(`id`): `Promise`<[`DockerNetwork`](../modules.md#dockernetwork)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<[`DockerNetwork`](../modules.md#dockernetwork)\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[inspectNetwork](../interfaces/IDockerHelper.md#inspectnetwork)

#### Defined in

[dockerode-docker-helper.ts:387](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L387)

___

### isDockerConfigured

▸ `Static` **isDockerConfigured**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[dockerode-docker-helper.ts:413](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L413)

___

### isImageInLocalRegistry

▸ `Private` **isImageInLocalRegistry**(`name`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[dockerode-docker-helper.ts:208](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L208)

___

### listNetworks

▸ **listNetworks**(): `Promise`<`NetworkInspectInfo`[]\>

#### Returns

`Promise`<`NetworkInspectInfo`[]\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[listNetworks](../interfaces/IDockerHelper.md#listnetworks)

#### Defined in

[dockerode-docker-helper.ts:382](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L382)

___

### listVolumes

▸ **listVolumes**(): `Promise`<`string`[]\>

Lists existing volumes

#### Returns

`Promise`<`string`[]\>

List of existing volumes

#### Implementation of

IDockerHelper.listVolumes

#### Defined in

[dockerode-docker-helper.ts:293](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L293)

___

### pullImage

▸ **pullImage**(`name`, `fetchOnlyIfNotExists?`): `Promise`<`undefined` \| `void`\>

Fetches the image from repo

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | `string` | `undefined` | the name of the image, eg. ubuntu:latest |
| `fetchOnlyIfNotExists` | `boolean` | `true` | fetch only if not exists (defaults to true) |

#### Returns

`Promise`<`undefined` \| `void`\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[pullImage](../interfaces/IDockerHelper.md#pullimage)

#### Defined in

[dockerode-docker-helper.ts:214](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L214)

___

### removeContainer

▸ **removeContainer**(`containerId`): `Promise`<`void`\>

Forcefully removes container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

#### Returns

`Promise`<`void`\>

Promise which resolves when container has been removed.

#### Implementation of

IDockerHelper.removeContainer

#### Defined in

[dockerode-docker-helper.ts:194](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L194)

___

### removeVolume

▸ **removeVolume**(`volumeName`): `Promise`<`void`\>

Removes volume with specific name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volumeName` | `string` | Volume name. |

#### Returns

`Promise`<`void`\>

Promise which resolves when volume has been removed.

#### Implementation of

IDockerHelper.removeVolume

#### Defined in

[dockerode-docker-helper.ts:289](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L289)

___

### run

▸ **run**(`config`): `Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

Starts container.

**`See`**

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../modules.md#dockeradapterrunconfig) | Container configuration. |

#### Returns

`Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

#### Implementation of

IDockerHelper.run

#### Defined in

[dockerode-docker-helper.ts:318](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L318)

___

### startContainer

▸ **startContainer**(`containerId`): `Promise`<`void`\>

Start container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

#### Returns

`Promise`<`void`\>

Promise resolving when container has been started.

#### Implementation of

IDockerHelper.startContainer

#### Defined in

[dockerode-docker-helper.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L165)

___

### stats

▸ **stats**(`containerId`): `Promise`<`ContainerStats`\>

Gets statistics from container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

#### Returns

`Promise`<`ContainerStats`\>

Promise which resolves with container statistics.

#### Implementation of

IDockerHelper.stats

#### Defined in

[dockerode-docker-helper.ts:204](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L204)

___

### stopContainer

▸ **stopContainer**(`containerId`): `Promise`<`void`\>

Stops container with provided id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `containerId` | `string` | Container id. |

#### Returns

`Promise`<`void`\>

Promise which resolves when the container has been stopped.

#### Implementation of

IDockerHelper.stopContainer

#### Defined in

[dockerode-docker-helper.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L175)

___

### translateVolumesConfig

▸ **translateVolumesConfig**(`volumeConfigs`): `DockerodeVolumeMountConfig`[]

Translates DockerAdapterVolumeConfig to volumes configuration that Docker API can understand.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volumeConfigs` | [`DockerAdapterVolumeConfig`](../modules.md#dockeradaptervolumeconfig)[] | Volumes configuration. |

#### Returns

`DockerodeVolumeMountConfig`[]

Translated volumes configuration.

#### Implementation of

IDockerHelper.translateVolumesConfig

#### Defined in

[dockerode-docker-helper.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L68)

___

### wait

▸ **wait**(`container`, `options?`): `Promise`<[`ExitData`](../modules.md#exitdata)\>

Waits for container status change.

**`See`**

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | `string` | Container id. |
| `options` | [`DockerAdapterWaitOptions`](../modules.md#dockeradapterwaitoptions) | Condition to be fulfilled. |

#### Returns

`Promise`<[`ExitData`](../modules.md#exitdata)\>

Container exit code.

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[wait](../interfaces/IDockerHelper.md#wait)

#### Defined in

[dockerode-docker-helper.ts:376](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L376)

## Constructors

### constructor

• **new DockerodeDockerHelper**()

## Properties

### dockerode

• **dockerode**: `Dockerode`

#### Defined in

[dockerode-docker-helper.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L58)

___

### logger

• **logger**: `ObjLogger`

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[logger](../interfaces/IDockerHelper.md#logger)

#### Defined in

[dockerode-docker-helper.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L60)

___

### pulledImages

• `Private` **pulledImages**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `Promise`<`void`\> \| `undefined`

#### Defined in

[dockerode-docker-helper.ts:212](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L212)

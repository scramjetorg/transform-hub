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
- [inspectNetwork](DockerodeDockerHelper.md#inspectnetwork)
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

[dockerode-docker-helper.ts:269](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L269)

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

[dockerode-docker-helper.ts:361](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L361)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[createContainer](../interfaces/IDockerHelper.md#createcontainer)

#### Defined in

[dockerode-docker-helper.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L81)

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

[dockerode-docker-helper.ts:365](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L365)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[createVolume](../interfaces/IDockerHelper.md#createvolume)

#### Defined in

[dockerode-docker-helper.ts:233](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L233)

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

[dockerode-docker-helper.ts:347](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L347)

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

[dockerode-docker-helper.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L169)

___

### listNetworks

▸ **listNetworks**(): `Promise`<`NetworkInspectInfo`[]\>

#### Returns

`Promise`<`NetworkInspectInfo`[]\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[listNetworks](../interfaces/IDockerHelper.md#listnetworks)

#### Defined in

[dockerode-docker-helper.ts:342](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L342)

___

### listVolumes

▸ **listVolumes**(): `Promise`<`string`[]\>

Lists existing volumes

#### Returns

`Promise`<`string`[]\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[listVolumes](../interfaces/IDockerHelper.md#listvolumes)

#### Defined in

[dockerode-docker-helper.ts:254](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L254)

___

### pullImage

▸ **pullImage**(`name`, `fetchOnlyIfNotExists?`): `Promise`<`undefined` \| `void`\>

Fetches the image from repo

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `name` | `string` | `undefined` |
| `fetchOnlyIfNotExists` | `boolean` | `true` |

#### Returns

`Promise`<`undefined` \| `void`\>

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[pullImage](../interfaces/IDockerHelper.md#pullimage)

#### Defined in

[dockerode-docker-helper.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L175)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[removeContainer](../interfaces/IDockerHelper.md#removecontainer)

#### Defined in

[dockerode-docker-helper.ts:155](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L155)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[removeVolume](../interfaces/IDockerHelper.md#removevolume)

#### Defined in

[dockerode-docker-helper.ts:250](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L250)

___

### run

▸ **run**(`config`): `Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

Starts container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../modules.md#dockeradapterrunconfig) | Container configuration. |

#### Returns

`Promise`<[`DockerAdapterRunResponse`](../modules.md#dockeradapterrunresponse)\>

@see {DockerAdapterRunResponse}

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[run](../interfaces/IDockerHelper.md#run)

#### Defined in

[dockerode-docker-helper.ts:279](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L279)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[startContainer](../interfaces/IDockerHelper.md#startcontainer)

#### Defined in

[dockerode-docker-helper.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L135)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[stats](../interfaces/IDockerHelper.md#stats)

#### Defined in

[dockerode-docker-helper.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L165)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[stopContainer](../interfaces/IDockerHelper.md#stopcontainer)

#### Defined in

[dockerode-docker-helper.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L145)

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

[IDockerHelper](../interfaces/IDockerHelper.md).[translateVolumesConfig](../interfaces/IDockerHelper.md#translatevolumesconfig)

#### Defined in

[dockerode-docker-helper.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L55)

___

### wait

▸ **wait**(`container`, `options?`): `Promise`<[`ExitData`](../modules.md#exitdata)\>

Waits for container status change.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | `string` | Container id. |
| `options` | [`DockerAdapterWaitOptions`](../modules.md#dockeradapterwaitoptions) | Condition to be fulfilled. @see {DockerAdapterWaitOptions} |

#### Returns

`Promise`<[`ExitData`](../modules.md#exitdata)\>

Container exit code.

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[wait](../interfaces/IDockerHelper.md#wait)

#### Defined in

[dockerode-docker-helper.ts:336](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L336)

## Constructors

### constructor

• **new DockerodeDockerHelper**()

## Properties

### dockerode

• **dockerode**: `Dockerode`

#### Defined in

[dockerode-docker-helper.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L45)

___

### logger

• **logger**: `ObjLogger`

#### Implementation of

[IDockerHelper](../interfaces/IDockerHelper.md).[logger](../interfaces/IDockerHelper.md#logger)

#### Defined in

[dockerode-docker-helper.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L47)

___

### pulledImages

• `Private` **pulledImages**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `Promise`<`void`\> \| `undefined`

#### Defined in

[dockerode-docker-helper.ts:173](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L173)

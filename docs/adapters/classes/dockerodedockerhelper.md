[@scramjet/adapters](../README.md) / DockerodeDockerHelper

# Class: DockerodeDockerHelper

Communicates with Docker using Dockerode library.

## Implements

- [`IDockerHelper`](../interfaces/idockerhelper.md)

## Table of contents

### Constructors

- [constructor](dockerodedockerhelper.md#constructor)

### Properties

- [dockerode](dockerodedockerhelper.md#dockerode)
- [logger](dockerodedockerhelper.md#logger)
- [pulledImages](dockerodedockerhelper.md#pulledimages)

### Methods

- [attach](dockerodedockerhelper.md#attach)
- [createContainer](dockerodedockerhelper.md#createcontainer)
- [createVolume](dockerodedockerhelper.md#createvolume)
- [isImageInLocalRegistry](dockerodedockerhelper.md#isimageinlocalregistry)
- [listVolumes](dockerodedockerhelper.md#listvolumes)
- [pullImage](dockerodedockerhelper.md#pullimage)
- [removeContainer](dockerodedockerhelper.md#removecontainer)
- [removeVolume](dockerodedockerhelper.md#removevolume)
- [run](dockerodedockerhelper.md#run)
- [startContainer](dockerodedockerhelper.md#startcontainer)
- [stats](dockerodedockerhelper.md#stats)
- [stopContainer](dockerodedockerhelper.md#stopcontainer)
- [translateVolumesConfig](dockerodedockerhelper.md#translatevolumesconfig)
- [wait](dockerodedockerhelper.md#wait)

## Constructors

### constructor

• **new DockerodeDockerHelper**()

## Properties

### dockerode

• **dockerode**: `Dockerode`

#### Defined in

[dockerode-docker-helper.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L44)

___

### logger

• **logger**: `Console`

#### Defined in

[dockerode-docker-helper.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L45)

___

### pulledImages

• `Private` **pulledImages**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `Promise`<`void`\> \| `undefined`

#### Defined in

[dockerode-docker-helper.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L169)

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

[dockerode-docker-helper.ts:239](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L239)

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
| `containerCfg.ports` | `any` | - |
| `containerCfg.publishAllPorts` | `boolean` | - |
| `containerCfg.volumes` | [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[] | - |

#### Returns

`Promise`<`string`\>

Created container id.

#### Implementation of

IDockerHelper.createContainer

#### Defined in

[dockerode-docker-helper.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L79)

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

[dockerode-docker-helper.ts:203](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L203)

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

[dockerode-docker-helper.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L165)

___

### listVolumes

▸ **listVolumes**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

IDockerHelper.listVolumes

#### Defined in

[dockerode-docker-helper.ts:224](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L224)

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

[IDockerHelper](../interfaces/idockerhelper.md).[pullImage](../interfaces/idockerhelper.md#pullimage)

#### Defined in

[dockerode-docker-helper.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L171)

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

[dockerode-docker-helper.ts:151](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L151)

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

[dockerode-docker-helper.ts:220](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L220)

___

### run

▸ **run**(`config`): `Promise`<[`DockerAdapterRunResponse`](../README.md#dockeradapterrunresponse)\>

Starts container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`DockerAdapterRunConfig`](../README.md#dockeradapterrunconfig) | Container configuration. |

#### Returns

`Promise`<[`DockerAdapterRunResponse`](../README.md#dockeradapterrunresponse)\>

@see {DockerAdapterRunResponse}

#### Implementation of

IDockerHelper.run

#### Defined in

[dockerode-docker-helper.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L249)

___

### startContainer

▸ **startContainer**(`containerId`): `Promise`<`void`\>

Start continer with provided id.

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

[dockerode-docker-helper.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L131)

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

[dockerode-docker-helper.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L161)

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

[dockerode-docker-helper.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L141)

___

### translateVolumesConfig

▸ **translateVolumesConfig**(`volumeConfigs`): `DockerodeVolumeMountConfig`[]

Translates DockerAdapterVolumeConfig to volumes configuration that Docker API can understand.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `volumeConfigs` | [`DockerAdapterVolumeConfig`](../README.md#dockeradaptervolumeconfig)[] | Volumes configuration, |

#### Returns

`DockerodeVolumeMountConfig`[]

Translated volumes configuration.

#### Implementation of

IDockerHelper.translateVolumesConfig

#### Defined in

[dockerode-docker-helper.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L53)

___

### wait

▸ **wait**(`container`, `options`): `Promise`<[`ExitData`](../README.md#exitdata)\>

Waits for container status change.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `container` | `string` | Container id. |
| `options` | [`DockerAdapterWaitOptions`](../README.md#dockeradapterwaitoptions) | Condition to be fullfilled. @see {DockerAdapterWaitOptions} |

#### Returns

`Promise`<[`ExitData`](../README.md#exitdata)\>

Container exit code.

#### Implementation of

[IDockerHelper](../interfaces/idockerhelper.md).[wait](../interfaces/idockerhelper.md#wait)

#### Defined in

[dockerode-docker-helper.ts:305](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L305)

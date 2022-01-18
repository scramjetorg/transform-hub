[@scramjet/adapters](README.md) / Exports

# @scramjet/adapters

## Table of contents

### Type aliases

- [DockerAdapterResources](modules.md#dockeradapterresources)
- [DockerAdapterRunConfig](modules.md#dockeradapterrunconfig)
- [DockerAdapterRunPortsConfig](modules.md#dockeradapterrunportsconfig)
- [DockerAdapterRunResponse](modules.md#dockeradapterrunresponse)
- [DockerAdapterStreams](modules.md#dockeradapterstreams)
- [DockerAdapterVolumeConfig](modules.md#dockeradaptervolumeconfig)
- [DockerAdapterWaitOptions](modules.md#dockeradapterwaitoptions)
- [DockerContainer](modules.md#dockercontainer)
- [DockerImage](modules.md#dockerimage)
- [DockerVolume](modules.md#dockervolume)
- [ExitData](modules.md#exitdata)
- [InstanceAdapterOptions](modules.md#instanceadapteroptions)

### Classes

- [DockerInstanceAdapter](classes/dockerinstanceadapter.md)
- [DockerSequenceAdapter](classes/dockersequenceadapter.md)
- [DockerodeDockerHelper](classes/dockerodedockerhelper.md)

### Interfaces

- [IDockerHelper](interfaces/idockerhelper.md)

### Functions

- [getInstanceAdapter](modules.md#getinstanceadapter)
- [getSequenceAdapter](modules.md#getsequenceadapter)

## Type aliases

### DockerAdapterResources

Ƭ **DockerAdapterResources**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId?` | [`DockerContainer`](modules.md#dockercontainer) |
| `fifosDir?` | `PathLike` |
| `ports?` | [`DockerAdapterRunPortsConfig`](modules.md#dockeradapterrunportsconfig) |
| `volumeId?` | [`DockerVolume`](modules.md#dockervolume) |

#### Defined in

[types.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L130)

___

### DockerAdapterRunConfig

Ƭ **DockerAdapterRunConfig**: `Object`

Configuration used to run command in container.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `autoRemove?` | `boolean` | **`property`** {boolean} autoRemove If true container will be removed after container's process exit. |
| `binds?` | `string`[] | **`property`** {string[]} binds Directories mount configuration. |
| `command?` | `string`[] | Command with optional parameters.  **`property`** {string[]} command Command to be executed. |
| `envs?` | `string`[] | **`property`** {string[]} envs A list of environment variables to set inside the container in the form ```["VAR=value", ...]``` |
| `imageName` | `string` | **`property`** {string} imageName Image name. |
| `labels?` | `Object` | - |
| `maxMem?` | `number` | **`property`** {number} maxMem Container memory limit (bytes). |
| `networkMode?` | `string` | - |
| `ports?` | [`DockerAdapterRunPortsConfig`](modules.md#dockeradapterrunportsconfig) | **`property`** {DockerAdapterRunPortsConfig} ports Docker ports configuration |
| `publishAllPorts?` | `boolean` | - |
| `volumes?` | [`DockerAdapterVolumeConfig`](modules.md#dockeradaptervolumeconfig)[] | **`property`** {DockerAdapterVolumeConfig[]} volumes Volumes configuration. |

#### Defined in

[types.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L53)

___

### DockerAdapterRunPortsConfig

Ƭ **DockerAdapterRunPortsConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ExposedPorts` | `any` |
| `PortBindings` | `any` |

#### Defined in

[types.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L43)

___

### DockerAdapterRunResponse

Ƭ **DockerAdapterRunResponse**: `Object`

Result of running command in container.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId` | [`DockerContainer`](modules.md#dockercontainer) |
| `streams` | [`DockerAdapterStreams`](modules.md#dockeradapterstreams) |
| `wait` | `Function` |

#### Defined in

[types.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L144)

___

### DockerAdapterStreams

Ƭ **DockerAdapterStreams**: `Object`

Standard streams connected with container.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `stderr` | `Stream` |
| `stdin` | `Writable` |
| `stdout` | `Stream` |

#### Defined in

[types.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L109)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: { `mountPoint`: `string`  } & { `volume`: [`DockerVolume`](modules.md#dockervolume)  } \| { `bind`: `string`  }

Volume mounting configuration.

#### Defined in

[types.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L32)

___

### DockerAdapterWaitOptions

Ƭ **DockerAdapterWaitOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `condition?` | ``"not-running"`` \| ``"next-exit"`` \| ``"removed"`` |

#### Defined in

[types.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L137)

___

### DockerContainer

Ƭ **DockerContainer**: `string`

Docker container.

#### Defined in

[types.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L18)

___

### DockerImage

Ƭ **DockerImage**: `string`

Docker image.

#### Defined in

[types.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L11)

___

### DockerVolume

Ƭ **DockerVolume**: `string`

Docker volume.

#### Defined in

[types.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L25)

___

### ExitData

Ƭ **ExitData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `statusCode` | `ExitCode` |

#### Defined in

[types.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L126)

___

### InstanceAdapterOptions

Ƭ **InstanceAdapterOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitDelay` | `number` |

#### Defined in

[types.ts:279](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L279)

## Functions

### getInstanceAdapter

▸ **getInstanceAdapter**(`runWithoutDocker`): `ILifeCycleAdapterMain` & `ILifeCycleAdapterRun`

Provides Instance adapter.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `runWithoutDocker` | `boolean` | Defines which instance adapter to use. If true - ProcessInstanceAdapter will be used. |

#### Returns

`ILifeCycleAdapterMain` & `ILifeCycleAdapterRun`

Instance adapter.

#### Defined in

[get-instance-adapter.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-instance-adapter.ts#L12)

___

### getSequenceAdapter

▸ **getSequenceAdapter**(`config`): `ISequenceAdapter`

Provides Sequence adapter basing on Host configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `STHConfiguration` | Host configuration. |

#### Returns

`ISequenceAdapter`

Sequence adapter.

#### Defined in

[get-sequence-adapter.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-sequence-adapter.ts#L11)

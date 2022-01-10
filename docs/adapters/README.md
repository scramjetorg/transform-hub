@scramjet/adapters

# @scramjet/adapters

## Table of contents

### Classes

- [DockerInstanceAdapter](classes/dockerinstanceadapter.md)
- [DockerSequenceAdapter](classes/dockersequenceadapter.md)
- [DockerodeDockerHelper](classes/dockerodedockerhelper.md)

### Interfaces

- [IDockerHelper](interfaces/idockerhelper.md)

### Type aliases

- [DockerAdapterResources](README.md#dockeradapterresources)
- [DockerAdapterRunConfig](README.md#dockeradapterrunconfig)
- [DockerAdapterRunPortsConfig](README.md#dockeradapterrunportsconfig)
- [DockerAdapterRunResponse](README.md#dockeradapterrunresponse)
- [DockerAdapterStreams](README.md#dockeradapterstreams)
- [DockerAdapterVolumeConfig](README.md#dockeradaptervolumeconfig)
- [DockerAdapterWaitOptions](README.md#dockeradapterwaitoptions)
- [DockerContainer](README.md#dockercontainer)
- [DockerImage](README.md#dockerimage)
- [DockerVolume](README.md#dockervolume)
- [ExitData](README.md#exitdata)
- [InstanceAdapterOptions](README.md#instanceadapteroptions)

### Functions

- [getInstanceAdapter](README.md#getinstanceadapter)
- [getSequenceAdapter](README.md#getsequenceadapter)

## Type aliases

### DockerAdapterResources

Ƭ **DockerAdapterResources**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId?` | [`DockerContainer`](README.md#dockercontainer) |
| `fifosDir?` | `PathLike` |
| `ports?` | [`DockerAdapterRunPortsConfig`](README.md#dockeradapterrunportsconfig) |
| `volumeId?` | [`DockerVolume`](README.md#dockervolume) |

#### Defined in

[types.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L128)

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
| `ports?` | [`DockerAdapterRunPortsConfig`](README.md#dockeradapterrunportsconfig) | **`property`** {DockerAdapterRunPortsConfig} ports Docker ports configuration |
| `publishAllPorts?` | `boolean` | - |
| `volumes?` | [`DockerAdapterVolumeConfig`](README.md#dockeradaptervolumeconfig)[] | **`property`** {DockerAdapterVolumeConfig[]} volumes Volumes configuration. |

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
| `containerId` | [`DockerContainer`](README.md#dockercontainer) |
| `streams` | [`DockerAdapterStreams`](README.md#dockeradapterstreams) |
| `wait` | `Function` |

#### Defined in

[types.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L142)

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

[types.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L107)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: { `mountPoint`: `string`  } & { `volume`: [`DockerVolume`](README.md#dockervolume)  } \| { `bind`: `string`  }

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

[types.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L135)

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

[types.ts:124](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L124)

___

### InstanceAdapterOptions

Ƭ **InstanceAdapterOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitDelay` | `number` |

#### Defined in

[types.ts:276](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L276)

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

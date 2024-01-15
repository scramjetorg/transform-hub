[@scramjet/adapters](README.md) / Exports

# @scramjet/adapters

## Table of contents

### Type Aliases

- [DockerAdapterResources](modules.md#dockeradapterresources)
- [DockerAdapterRunConfig](modules.md#dockeradapterrunconfig)
- [DockerAdapterRunPortsConfig](modules.md#dockeradapterrunportsconfig)
- [DockerAdapterRunResponse](modules.md#dockeradapterrunresponse)
- [DockerAdapterStreams](modules.md#dockeradapterstreams)
- [DockerAdapterVolumeConfig](modules.md#dockeradaptervolumeconfig)
- [DockerAdapterWaitOptions](modules.md#dockeradapterwaitoptions)
- [DockerContainer](modules.md#dockercontainer)
- [DockerCreateNetworkConfig](modules.md#dockercreatenetworkconfig)
- [DockerImage](modules.md#dockerimage)
- [DockerNetwork](modules.md#dockernetwork)
- [DockerVolume](modules.md#dockervolume)
- [ExitData](modules.md#exitdata)
- [InstanceAdapterOptions](modules.md#instanceadapteroptions)
- [RunnerEnvConfig](modules.md#runnerenvconfig)
- [RunnerEnvironmentVariables](modules.md#runnerenvironmentvariables)

### Classes

- [DockerInstanceAdapter](classes/DockerInstanceAdapter.md)
- [DockerSequenceAdapter](classes/DockerSequenceAdapter.md)
- [DockerodeDockerHelper](classes/DockerodeDockerHelper.md)
- [KubernetesInstanceAdapter](classes/KubernetesInstanceAdapter.md)
- [KubernetesSequenceAdapter](classes/KubernetesSequenceAdapter.md)
- [ProcessInstanceAdapter](classes/ProcessInstanceAdapter.md)
- [ProcessSequenceAdapter](classes/ProcessSequenceAdapter.md)

### Interfaces

- [IDockerHelper](interfaces/IDockerHelper.md)

### Variables

- [STH\_DOCKER\_NETWORK](modules.md#sth_docker_network)

### Functions

- [getHostname](modules.md#gethostname)
- [getInstanceAdapter](modules.md#getinstanceadapter)
- [getSequenceAdapter](modules.md#getsequenceadapter)
- [initializeRuntimeAdapters](modules.md#initializeruntimeadapters)
- [isHostSpawnedInDockerContainer](modules.md#ishostspawnedindockercontainer)
- [setupDockerNetworking](modules.md#setupdockernetworking)

## Type Aliases

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

[types.ts:149](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L149)

___

### DockerAdapterRunConfig

Ƭ **DockerAdapterRunConfig**: `Object`

Configuration used to run command in container.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `autoRemove?` | `boolean` | **`Property`**  If true container will be removed after container's process exit. |
| `binds?` | `string`[] | **`Property`**  Directories mount configuration. |
| `command?` | `string`[] | Command with optional parameters.  **`Property`**  Command to be executed. |
| `envs?` | `string`[] | **`Property`**  A list of environment variables to set inside the container in the form ```["VAR=value", ...]``` |
| `gpu?` | `boolean` | - |
| `imageName` | `string` | **`Property`**  Image name. |
| `labels?` | { `[key: string]`: `string`;  } | - |
| `maxMem?` | `number` | **`Property`**  Container memory limit (bytes). |
| `networkMode?` | `string` | - |
| `ports?` | [`DockerAdapterRunPortsConfig`](modules.md#dockeradapterrunportsconfig) | **`Property`**  Docker ports configuration |
| `publishAllPorts?` | `boolean` | - |
| `volumes?` | [`DockerAdapterVolumeConfig`](modules.md#dockeradaptervolumeconfig)[] | **`Property`**  Volumes configuration. |

#### Defined in

[types.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L70)

___

### DockerAdapterRunPortsConfig

Ƭ **DockerAdapterRunPortsConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ExposedPorts` | `any` |
| `PortBindings` | `any` |

#### Defined in

[types.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L56)

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

[types.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L163)

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

[types.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L128)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: { `mountPoint`: `string` ; `writeable`: `boolean`  } & { `volume`: [`DockerVolume`](modules.md#dockervolume)  } \| { `bind`: `string`  }

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

[types.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L156)

___

### DockerContainer

Ƭ **DockerContainer**: `string`

Docker container.

#### Defined in

[types.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L18)

___

### DockerCreateNetworkConfig

Ƭ **DockerCreateNetworkConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `driver` | `string` |
| `name` | `string` |
| `options` | `Record`<`string`, `string`\> |

#### Defined in

[types.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L63)

___

### DockerImage

Ƭ **DockerImage**: `string`

Docker image.

#### Defined in

[types.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L11)

___

### DockerNetwork

Ƭ **DockerNetwork**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containers` | `Record`<`string`, { `name`: `string`  }\> |

#### Defined in

[types.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L61)

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

[types.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L145)

___

### InstanceAdapterOptions

Ƭ **InstanceAdapterOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitDelay` | `number` |

#### Defined in

[types.ts:309](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L309)

___

### RunnerEnvConfig

Ƭ **RunnerEnvConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `instanceId` | `InstanceId` |
| `instancesServerHost` | `string` |
| `instancesServerPort` | `number` |
| `paths?` | ``"posix"`` \| ``"win32"`` |
| `pipesPath` | `string` |
| `sequencePath` | `string` |

#### Defined in

[types.ts:313](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L313)

___

### RunnerEnvironmentVariables

Ƭ **RunnerEnvironmentVariables**: `Partial`<{ `[key: string]`: `string`; `CRASH_LOG`: `string` ; `DEVELOPMENT`: `string` ; `INSTANCES_SERVER_HOST`: `string` ; `INSTANCES_SERVER_PORT`: `string` ; `INSTANCE_ID`: `string` ; `PATH`: `string` ; `PIPES_LOCATION`: `string` ; `PRODUCTION`: `string` ; `SEQUENCE_PATH`: `string`  }\>

#### Defined in

[types.ts:322](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L322)

## Variables

### STH\_DOCKER\_NETWORK

• `Const` **STH\_DOCKER\_NETWORK**: ``"transformhub0"``

#### Defined in

[docker-networking.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L9)

## Functions

### getHostname

▸ **getHostname**(): `string`

#### Returns

`string`

#### Defined in

[docker-networking.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L7)

___

### getInstanceAdapter

▸ **getInstanceAdapter**(`runtimeAdapter`, `config`, `id`): `ILifeCycleAdapterMain` & `ILifeCycleAdapterRun`

Provides Instance adapter.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `runtimeAdapter` | `string` | STH runtime adapter. |
| `config` | `STHConfiguration` | STH config. |
| `id` | `string` | Instance id. |

#### Returns

`ILifeCycleAdapterMain` & `ILifeCycleAdapterRun`

Instance adapter.

#### Defined in

[get-instance-adapter.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-instance-adapter.ts#L26)

___

### getSequenceAdapter

▸ **getSequenceAdapter**(`adapter`, `config`): `ISequenceAdapter`

Provides Sequence adapter basing on Host configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `adapter` | `string` | The adapter name |
| `config` | `STHConfiguration` | Host configuration. |

#### Returns

`ISequenceAdapter`

Sequence adapter.

#### Defined in

[get-sequence-adapter.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-sequence-adapter.ts#L24)

___

### initializeRuntimeAdapters

▸ **initializeRuntimeAdapters**(`config`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Returns

`Promise`<`string`\>

#### Defined in

[initialize-runtime-adapters.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/initialize-runtime-adapters.ts#L5)

___

### isHostSpawnedInDockerContainer

▸ **isHostSpawnedInDockerContainer**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[docker-networking.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L5)

___

### setupDockerNetworking

▸ **setupDockerNetworking**(`dockerHelper`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dockerHelper` | [`IDockerHelper`](interfaces/IDockerHelper.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[docker-networking.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L12)

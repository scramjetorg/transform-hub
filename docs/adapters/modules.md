[@scramjet/adapters](README.md) / Exports

# @scramjet/adapters

## Table of contents

### Type aliases

- [DockerAdapterResources](undefined)
- [DockerAdapterRunConfig](undefined)
- [DockerAdapterRunPortsConfig](undefined)
- [DockerAdapterRunResponse](undefined)
- [DockerAdapterStreams](undefined)
- [DockerAdapterVolumeConfig](undefined)
- [DockerAdapterWaitOptions](undefined)
- [DockerContainer](undefined)
- [DockerCreateNetworkConfig](undefined)
- [DockerImage](undefined)
- [DockerNetwork](undefined)
- [DockerVolume](undefined)
- [ExitData](undefined)
- [InstanceAdapterOptions](undefined)

### Classes

- [DockerInstanceAdapter](undefined)
- [DockerSequenceAdapter](undefined)
- [DockerodeDockerHelper](undefined)
- [KubernetesInstanceAdapter](undefined)
- [KubernetesSequenceAdapter](undefined)

### Interfaces

- [IDockerHelper](undefined)

### Variables

- [STH\_DOCKER\_NETWORK](undefined)

### Functions

- [getHostname](undefined)
- [getInstanceAdapter](undefined)
- [getSequenceAdapter](undefined)
- [isHostSpawnedInDockerContainer](undefined)
- [setupDockerNetworking](undefined)

## Type aliases

### DockerAdapterResources

Ƭ **DockerAdapterResources**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId?` | DockerContainer |
| `fifosDir?` | PathLike |
| `ports?` | DockerAdapterRunPortsConfig |
| `volumeId?` | DockerVolume |

#### Defined in

[types.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L147)

___

### DockerAdapterRunConfig

Ƭ **DockerAdapterRunConfig**: `Object`

Configuration used to run command in container.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `autoRemove?` | boolean | **`property`** {boolean} autoRemove If true container will be removed after container's process exit. |
| `binds?` | string[] | **`property`** {string[]} binds Directories mount configuration. |
| `command?` | string[] | Command with optional parameters.  **`property`** {string[]} command Command to be executed. |
| `envs?` | string[] | **`property`** {string[]} envs A list of environment variables to set inside the container in the form ```["VAR=value", ...]``` |
| `imageName` | string | **`property`** {string} imageName Image name. |
| `labels?` | Object | - |
| `maxMem?` | number | **`property`** {number} maxMem Container memory limit (bytes). |
| `networkMode?` | string | - |
| `ports?` | DockerAdapterRunPortsConfig | **`property`** {DockerAdapterRunPortsConfig} ports Docker ports configuration |
| `publishAllPorts?` | boolean | - |
| `volumes?` | DockerAdapterVolumeConfig[] | **`property`** {DockerAdapterVolumeConfig[]} volumes Volumes configuration. |

#### Defined in

[types.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L70)

___

### DockerAdapterRunPortsConfig

Ƭ **DockerAdapterRunPortsConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ExposedPorts` | any |
| `PortBindings` | any |

#### Defined in

[types.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L56)

___

### DockerAdapterRunResponse

Ƭ **DockerAdapterRunResponse**: `Object`

Result of running command in container.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId` | DockerContainer |
| `streams` | DockerAdapterStreams |
| `wait` | Function |

#### Defined in

[types.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L161)

___

### DockerAdapterStreams

Ƭ **DockerAdapterStreams**: `Object`

Standard streams connected with container.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `stderr` | Stream |
| `stdin` | Writable |
| `stdout` | Stream |

#### Defined in

[types.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L126)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: Object & (Object \| Object)

Volume mounting configuration.

#### Defined in

[types.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L32)

___

### DockerAdapterWaitOptions

Ƭ **DockerAdapterWaitOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `condition?` | "not-running" \| "next-exit" \| "removed" |

#### Defined in

[types.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L154)

___

### DockerContainer

Ƭ **DockerContainer**: string

Docker container.

#### Defined in

[types.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L18)

___

### DockerCreateNetworkConfig

Ƭ **DockerCreateNetworkConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `driver` | string |
| `name` | string |
| `options` | Record<string, string\> |

#### Defined in

[types.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L63)

___

### DockerImage

Ƭ **DockerImage**: string

Docker image.

#### Defined in

[types.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L11)

___

### DockerNetwork

Ƭ **DockerNetwork**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containers` | Record<string, Object\> |

#### Defined in

[types.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L61)

___

### DockerVolume

Ƭ **DockerVolume**: string

Docker volume.

#### Defined in

[types.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L25)

___

### ExitData

Ƭ **ExitData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `statusCode` | ExitCode |

#### Defined in

[types.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L143)

___

### InstanceAdapterOptions

Ƭ **InstanceAdapterOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitDelay` | number |

#### Defined in

[types.ts:306](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L306)

## Classes

### DockerInstanceAdapter

• **DockerInstanceAdapter**: Class DockerInstanceAdapter

Adapter for running Instance by Runner executed in Docker container.

#### Defined in

[docker-instance-adapter.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L25)

___

### DockerSequenceAdapter

• **DockerSequenceAdapter**: Class DockerSequenceAdapter

Adapter for preparing Sequence to be run in Docker container.

#### Defined in

[docker-sequence-adapter.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-sequence-adapter.ts#L19)

___

### DockerodeDockerHelper

• **DockerodeDockerHelper**: Class DockerodeDockerHelper

Communicates with Docker using Dockerode library.

#### Defined in

[dockerode-docker-helper.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/dockerode-docker-helper.ts#L43)

___

### KubernetesInstanceAdapter

• **KubernetesInstanceAdapter**: Class KubernetesInstanceAdapter

Adapter for running Instance by Runner executed in separate process.

#### Defined in

[kubernetes-instance-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L23)

___

### KubernetesSequenceAdapter

• **KubernetesSequenceAdapter**: Class KubernetesSequenceAdapter

Adapter for preparing Sequence to be run in process.

#### Defined in

[kubernetes-sequence-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-sequence-adapter.ts#L48)

## Interfaces

### IDockerHelper

• **IDockerHelper**: Interface IDockerHelper

#### Defined in

[types.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/types.ts#L178)

## Variables

### STH\_DOCKER\_NETWORK

• `Const` **STH\_DOCKER\_NETWORK**: "transformhub0" = `"transformhub0"`

#### Defined in

[docker-networking.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L9)

## Functions

### getHostname

▸ **getHostname**(): string

#### Returns

string

#### Defined in

[docker-networking.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L7)

___

### getInstanceAdapter

▸ **getInstanceAdapter**(`config`): ILifeCycleAdapterMain & ILifeCycleAdapterRun

Provides Instance adapter.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | STHConfiguration | STH config. If true - ProcessInstanceAdapter will be used. |

#### Returns

ILifeCycleAdapterMain & ILifeCycleAdapterRun

Instance adapter.

#### Defined in

[get-instance-adapter.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-instance-adapter.ts#L24)

___

### getSequenceAdapter

▸ **getSequenceAdapter**(`config`): ISequenceAdapter

Provides Sequence adapter basing on Host configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | STHConfiguration | Host configuration. |

#### Returns

ISequenceAdapter

Sequence adapter.

#### Defined in

[get-sequence-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/get-sequence-adapter.ts#L23)

___

### isHostSpawnedInDockerContainer

▸ **isHostSpawnedInDockerContainer**(): Promise<boolean\>

#### Returns

Promise<boolean\>

#### Defined in

[docker-networking.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L5)

___

### setupDockerNetworking

▸ **setupDockerNetworking**(`dockerHelper`): Promise<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dockerHelper` | IDockerHelper |

#### Returns

Promise<void\>

#### Defined in

[docker-networking.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-networking.ts#L12)

[@scramjet/adapters](../README.md) / [Exports](../modules.md) / DockerInstanceAdapter

# Class: DockerInstanceAdapter

Adapter for running Instance by Runner executed in Docker container.

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Properties

- [\_limits](DockerInstanceAdapter.md#_limits)
- [crashLogStreams](DockerInstanceAdapter.md#crashlogstreams)
- [dockerHelper](DockerInstanceAdapter.md#dockerhelper)
- [id](DockerInstanceAdapter.md#id)
- [logger](DockerInstanceAdapter.md#logger)
- [resources](DockerInstanceAdapter.md#resources)
- [sthConfig](DockerInstanceAdapter.md#sthconfig)

### Methods

- [cleanup](DockerInstanceAdapter.md#cleanup)
- [dispatch](DockerInstanceAdapter.md#dispatch)
- [getCrashLog](DockerInstanceAdapter.md#getcrashlog)
- [getNetworkSetup](DockerInstanceAdapter.md#getnetworksetup)
- [getPortsConfig](DockerInstanceAdapter.md#getportsconfig)
- [init](DockerInstanceAdapter.md#init)
- [monitorRate](DockerInstanceAdapter.md#monitorrate)
- [preparePortBindingsConfig](DockerInstanceAdapter.md#prepareportbindingsconfig)
- [remove](DockerInstanceAdapter.md#remove)
- [run](DockerInstanceAdapter.md#run)
- [setRunner](DockerInstanceAdapter.md#setrunner)
- [stats](DockerInstanceAdapter.md#stats)
- [waitUntilExit](DockerInstanceAdapter.md#waituntilexit)

### Constructors

- [constructor](DockerInstanceAdapter.md#constructor)

### Accessors

- [limits](DockerInstanceAdapter.md#limits)

## Properties

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[docker-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L35)

___

### crashLogStreams

• `Optional` **crashLogStreams**: `Promise`<`string`[]\>

#### Defined in

[docker-instance-adapter.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L42)

___

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/IDockerHelper.md)

#### Defined in

[docker-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L34)

___

### id

• **id**: `string` = `""`

#### Implementation of

ILifeCycleAdapterMain.id

#### Defined in

[docker-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L38)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[docker-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L40)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../modules.md#dockeradapterresources) = `{}`

#### Defined in

[docker-instance-adapter.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L36)

___

### sthConfig

• `Private` **sthConfig**: `STHConfiguration`

#### Defined in

[docker-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L37)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Performs cleanup after container close.
Removes volume used by sequence and fifos used to communication with runner.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[docker-instance-adapter.ts:280](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L280)

___

### dispatch

▸ **dispatch**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | `SequenceInfo` |
| `payload` | `RunnerConnectInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.dispatch

#### Defined in

[docker-instance-adapter.ts:188](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L188)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[docker-instance-adapter.ts:309](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L309)

___

### getNetworkSetup

▸ `Private` **getNetworkSetup**(): `Promise`<{ `host`: `string` ; `network`: `string`  }\>

#### Returns

`Promise`<{ `host`: `string` ; `network`: `string`  }\>

#### Defined in

[docker-instance-adapter.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L137)

___

### getPortsConfig

▸ `Private` **getPortsConfig**(`ports`, `containerConfig`): `Promise`<[`DockerAdapterRunPortsConfig`](../modules.md#dockeradapterrunportsconfig)\>

Prepares configuration for expose/bind ports from Docker container.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ports` | `string`[] | Ports requested to be accessible from container. |
| `containerConfig` | `RunnerContainerConfiguration` | Runner container configuration. |

#### Returns

`Promise`<[`DockerAdapterRunPortsConfig`](../modules.md#dockeradapterrunportsconfig)\>

Configuration for exposing and binding ports in Docker container.

#### Defined in

[docker-instance-adapter.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L101)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[docker-instance-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L56)

___

### monitorRate

▸ **monitorRate**(`_rps`): [`DockerInstanceAdapter`](DockerInstanceAdapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_rps` | `number` |

#### Returns

[`DockerInstanceAdapter`](DockerInstanceAdapter.md)

#### Implementation of

ILifeCycleAdapterMain.monitorRate

#### Defined in

[docker-instance-adapter.ts:292](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L292)

___

### preparePortBindingsConfig

▸ `Private` **preparePortBindingsConfig**(`declaredPorts`, `containerConfig`, `exposed?`): `Promise`<{ `[key: string]`: `string`;  }\>

Finds free port for every port requested in Sequence configuration and returns map of assigned ports.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `declaredPorts` | `string`[] | `undefined` | Ports declared in sequence config. |
| `containerConfig` | `ContainerConfiguration` & `ContainerConfigurationWithExposedPorts` | `undefined` | Container configuration extended with configuration for ports exposing. |
| `exposed?` | `boolean` | `false` | Defines configuration output type. Exposed ports when true or port bindings. |

#### Returns

`Promise`<{ `[key: string]`: `string`;  }\>

Promise resolving with map of ports mapping.

#### Defined in

[docker-instance-adapter.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L70)

___

### remove

▸ **remove**(): `Promise`<`void`\>

Forcefully stops Runner container.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[docker-instance-adapter.ts:299](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L299)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | `SequenceInfo` |
| `payload` | `RunnerConnectInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[docker-instance-adapter.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L182)

___

### setRunner

▸ **setRunner**(`system`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `system` | `Record`<`string`, `string`\> |

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterRun.setRunner

#### Defined in

[docker-instance-adapter.ts:174](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L174)

___

### stats

▸ **stats**(`msg`): `Promise`<`MonitoringMessageData`\>

Returns objects with statistics of docker container with running instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | `MonitoringMessageData` | Message to be included in statistics message. |

#### Returns

`Promise`<`MonitoringMessageData`\>

Promise resolved with container statistics.

#### Implementation of

ILifeCycleAdapterMain.stats

#### Defined in

[docker-instance-adapter.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L118)

___

### waitUntilExit

▸ **waitUntilExit**(`config`, `instanceId`, `_sequenceInfo`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instanceId` | `string` |
| `_sequenceInfo` | `SequenceInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterMain.waitUntilExit

#### Defined in

[docker-instance-adapter.ts:248](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L248)

## Constructors

### constructor

• **new DockerInstanceAdapter**(`sthConfig`, `id?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sthConfig` | `STHConfiguration` | `undefined` |
| `id` | `string` | `""` |

#### Defined in

[docker-instance-adapter.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L47)

## Accessors

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[docker-instance-adapter.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L44)

• `set` **limits**(`value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `InstanceLimits` |

#### Returns

`void`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[docker-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L45)

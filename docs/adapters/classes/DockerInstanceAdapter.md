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
- [getCrashLog](DockerInstanceAdapter.md#getcrashlog)
- [getNetworkSetup](DockerInstanceAdapter.md#getnetworksetup)
- [getPortsConfig](DockerInstanceAdapter.md#getportsconfig)
- [init](DockerInstanceAdapter.md#init)
- [monitorRate](DockerInstanceAdapter.md#monitorrate)
- [preparePortBindingsConfig](DockerInstanceAdapter.md#prepareportbindingsconfig)
- [remove](DockerInstanceAdapter.md#remove)
- [run](DockerInstanceAdapter.md#run)
- [stats](DockerInstanceAdapter.md#stats)

### Constructors

- [constructor](DockerInstanceAdapter.md#constructor)

### Accessors

- [limits](DockerInstanceAdapter.md#limits)

## Properties

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[docker-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L33)

___

### crashLogStreams

• `Optional` **crashLogStreams**: `Promise`<`string`[]\>

#### Defined in

[docker-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L40)

___

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/IDockerHelper.md)

#### Defined in

[docker-instance-adapter.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L32)

___

### id

• **id**: `string` = `""`

#### Implementation of

ILifeCycleAdapterMain.id

#### Defined in

[docker-instance-adapter.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L36)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[docker-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L38)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../modules.md#dockeradapterresources) = `{}`

#### Defined in

[docker-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L34)

___

### sthConfig

• `Private` **sthConfig**: `STHConfiguration`

#### Defined in

[docker-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L35)

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

[docker-instance-adapter.ts:254](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L254)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[docker-instance-adapter.ts:283](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L283)

___

### getNetworkSetup

▸ `Private` **getNetworkSetup**(): `Promise`<{ `host`: `string` ; `network`: `string`  }\>

#### Returns

`Promise`<{ `host`: `string` ; `network`: `string`  }\>

#### Defined in

[docker-instance-adapter.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L135)

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

[docker-instance-adapter.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L99)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[docker-instance-adapter.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L54)

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

ILifeCycleAdapterRun.monitorRate

#### Defined in

[docker-instance-adapter.ts:266](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L266)

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

[docker-instance-adapter.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L68)

___

### remove

▸ **remove**(): `Promise`<`void`\>

Forcefully stops Runner container.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[docker-instance-adapter.ts:273](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L273)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[docker-instance-adapter.ts:173](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L173)

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

ILifeCycleAdapterRun.stats

#### Defined in

[docker-instance-adapter.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L116)

## Constructors

### constructor

• **new DockerInstanceAdapter**(`sthConfig`, `id?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sthConfig` | `STHConfiguration` | `undefined` |
| `id` | `string` | `""` |

#### Defined in

[docker-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L45)

## Accessors

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[docker-instance-adapter.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L42)

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

[docker-instance-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L43)

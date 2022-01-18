[@scramjet/adapters](../README.md) / [Exports](../modules.md) / DockerInstanceAdapter

# Class: DockerInstanceAdapter

Adapter for running Instance by Runner executed in Docker container.

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Methods

- [cleanup](dockerinstanceadapter.md#cleanup)
- [getBridgeNetworkInterfaceIp](dockerinstanceadapter.md#getbridgenetworkinterfaceip)
- [getPortsConfig](dockerinstanceadapter.md#getportsconfig)
- [init](dockerinstanceadapter.md#init)
- [monitorRate](dockerinstanceadapter.md#monitorrate)
- [preparePortBindingsConfig](dockerinstanceadapter.md#prepareportbindingsconfig)
- [remove](dockerinstanceadapter.md#remove)
- [run](dockerinstanceadapter.md#run)
- [stats](dockerinstanceadapter.md#stats)

### Constructors

- [constructor](dockerinstanceadapter.md#constructor)

### Properties

- [dockerHelper](dockerinstanceadapter.md#dockerhelper)
- [logger](dockerinstanceadapter.md#logger)
- [resources](dockerinstanceadapter.md#resources)

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

[docker-instance-adapter.ts:224](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L224)

___

### getBridgeNetworkInterfaceIp

▸ `Private` **getBridgeNetworkInterfaceIp**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

[docker-instance-adapter.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L122)

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

[docker-instance-adapter.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L86)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[docker-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L41)

___

### monitorRate

▸ **monitorRate**(`_rps`): [`DockerInstanceAdapter`](dockerinstanceadapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_rps` | `number` |

#### Returns

[`DockerInstanceAdapter`](dockerinstanceadapter.md)

#### Implementation of

ILifeCycleAdapterRun.monitorRate

#### Defined in

[docker-instance-adapter.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L236)

___

### preparePortBindingsConfig

▸ `Private` **preparePortBindingsConfig**(`declaredPorts`, `containerConfig`, `exposed?`): `Promise`<`Object`\>

Finds free port for every port requested in Sequence configuration and returns map of assigned ports.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `declaredPorts` | `string`[] | `undefined` | Ports declared in sequence config. |
| `containerConfig` | `ContainerConfiguration` & `ContainerConfigurationWithExposedPorts` | `undefined` | Container configuration extended with configuration for ports exposing. |
| `exposed` | `boolean` | `false` | - |

#### Returns

`Promise`<`Object`\>

>} Promise resolving with map of ports mapping.

#### Defined in

[docker-instance-adapter.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L55)

___

### remove

▸ **remove**(): `Promise`<`void`\>

Forcefully stops Runner container.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[docker-instance-adapter.ts:243](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L243)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SequenceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[docker-instance-adapter.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L141)

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

[docker-instance-adapter.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L103)

## Constructors

### constructor

• **new DockerInstanceAdapter**()

#### Defined in

[docker-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L33)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[docker-instance-adapter.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L29)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[docker-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L33)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../modules.md#dockeradapterresources) = `{}`

#### Defined in

[docker-instance-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L31)

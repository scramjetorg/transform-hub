[@scramjet/adapters](../README.md) / DockerInstanceAdapter

# Class: DockerInstanceAdapter

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Constructors

- [constructor](dockerinstanceadapter.md#constructor)

### Properties

- [controlFifoPath](dockerinstanceadapter.md#controlfifopath)
- [controlStream](dockerinstanceadapter.md#controlstream)
- [dockerHelper](dockerinstanceadapter.md#dockerhelper)
- [inputFifoPath](dockerinstanceadapter.md#inputfifopath)
- [inputStream](dockerinstanceadapter.md#inputstream)
- [logger](dockerinstanceadapter.md#logger)
- [loggerFifoPath](dockerinstanceadapter.md#loggerfifopath)
- [loggerStream](dockerinstanceadapter.md#loggerstream)
- [monitorFifoPath](dockerinstanceadapter.md#monitorfifopath)
- [monitorStream](dockerinstanceadapter.md#monitorstream)
- [outputFifoPath](dockerinstanceadapter.md#outputfifopath)
- [outputStream](dockerinstanceadapter.md#outputstream)
- [resources](dockerinstanceadapter.md#resources)
- [runnerStderr](dockerinstanceadapter.md#runnerstderr)
- [runnerStdin](dockerinstanceadapter.md#runnerstdin)
- [runnerStdout](dockerinstanceadapter.md#runnerstdout)

### Methods

- [cleanup](dockerinstanceadapter.md#cleanup)
- [createFifo](dockerinstanceadapter.md#createfifo)
- [createFifoStreams](dockerinstanceadapter.md#createfifostreams)
- [getPortsConfig](dockerinstanceadapter.md#getportsconfig)
- [hookCommunicationHandler](dockerinstanceadapter.md#hookcommunicationhandler)
- [init](dockerinstanceadapter.md#init)
- [monitorRate](dockerinstanceadapter.md#monitorrate)
- [preparePortBindingsConfig](dockerinstanceadapter.md#prepareportbindingsconfig)
- [remove](dockerinstanceadapter.md#remove)
- [run](dockerinstanceadapter.md#run)
- [snapshot](dockerinstanceadapter.md#snapshot)
- [stats](dockerinstanceadapter.md#stats)

## Constructors

### constructor

• **new DockerInstanceAdapter**()

#### Defined in

[docker-instance-adapter.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L54)

## Properties

### controlFifoPath

• `Private` `Optional` **controlFifoPath**: `string`

#### Defined in

[docker-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L38)

___

### controlStream

• `Private` **controlStream**: `DelayedStream`

#### Defined in

[docker-instance-adapter.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L47)

___

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[docker-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L35)

___

### inputFifoPath

• `Private` `Optional` **inputFifoPath**: `string`

#### Defined in

[docker-instance-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L39)

___

### inputStream

• `Private` **inputStream**: `DelayedStream`

#### Defined in

[docker-instance-adapter.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L49)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[docker-instance-adapter.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L54)

___

### loggerFifoPath

• `Private` `Optional` **loggerFifoPath**: `string`

#### Defined in

[docker-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L41)

___

### loggerStream

• `Private` **loggerStream**: `DelayedStream`

#### Defined in

[docker-instance-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L48)

___

### monitorFifoPath

• `Private` `Optional` **monitorFifoPath**: `string`

#### Defined in

[docker-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L37)

___

### monitorStream

• `Private` **monitorStream**: `DelayedStream`

#### Defined in

[docker-instance-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L46)

___

### outputFifoPath

• `Private` `Optional` **outputFifoPath**: `string`

#### Defined in

[docker-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L40)

___

### outputStream

• `Private` **outputStream**: `DelayedStream`

#### Defined in

[docker-instance-adapter.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L50)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../README.md#dockeradapterresources) = `{}`

#### Defined in

[docker-instance-adapter.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L52)

___

### runnerStderr

• `Private` **runnerStderr**: `PassThrough`

#### Defined in

[docker-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L45)

___

### runnerStdin

• `Private` **runnerStdin**: `PassThrough`

#### Defined in

[docker-instance-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L43)

___

### runnerStdout

• `Private` **runnerStdout**: `PassThrough`

#### Defined in

[docker-instance-adapter.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L44)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[docker-instance-adapter.ts:316](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L316)

___

### createFifo

▸ `Private` **createFifo**(`dir`, `fifoName`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |
| `fifoName` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[docker-instance-adapter.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L75)

___

### createFifoStreams

▸ `Private` **createFifoStreams**(`controlFifo`, `monitorFifo`, `loggerFifo`, `inputFifo`, `outputFifo`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `controlFifo` | `string` |
| `monitorFifo` | `string` |
| `loggerFifo` | `string` |
| `inputFifo` | `string` |
| `outputFifo` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[docker-instance-adapter.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L93)

___

### getPortsConfig

▸ `Private` **getPortsConfig**(`ports`, `containerConfig`): `Promise`<[`DockerAdapterRunPortsConfig`](../README.md#dockeradapterrunportsconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ports` | `string`[] |
| `containerConfig` | `RunnerContainerConfiguration` |

#### Returns

`Promise`<[`DockerAdapterRunPortsConfig`](../README.md#dockeradapterrunportsconfig)\>

#### Defined in

[docker-instance-adapter.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L147)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `communicationHandler` | `ICommunicationHandler` |

#### Returns

`void`

#### Implementation of

ILifeCycleAdapterRun.hookCommunicationHandler

#### Defined in

[docker-instance-adapter.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L177)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[docker-instance-adapter.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L71)

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

[docker-instance-adapter.ts:340](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L340)

___

### preparePortBindingsConfig

▸ `Private` **preparePortBindingsConfig**(`declaredPorts`, `containerConfig`, `exposed?`): `Promise`<`Object`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `declaredPorts` | `string`[] | `undefined` |
| `containerConfig` | `ContainerConfiguration` & `ContainerConfigurationWithExposedPorts` | `undefined` |
| `exposed` | `boolean` | `false` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[docker-instance-adapter.ts:124](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L124)

___

### remove

▸ **remove**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[docker-instance-adapter.ts:344](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L344)

___

### run

▸ **run**(`config`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SequenceConfig` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[docker-instance-adapter.ts:213](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L213)

___

### snapshot

▸ **snapshot**(): `MaybePromise`<`string`\>

#### Returns

`MaybePromise`<`string`\>

#### Implementation of

ILifeCycleAdapterRun.snapshot

#### Defined in

[docker-instance-adapter.ts:335](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L335)

___

### stats

▸ **stats**(`msg`): `Promise`<`MonitoringMessageData`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `MonitoringMessageData` |

#### Returns

`Promise`<`MonitoringMessageData`\>

#### Implementation of

ILifeCycleAdapterRun.stats

#### Defined in

[docker-instance-adapter.ts:158](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/docker-instance-adapter.ts#L158)

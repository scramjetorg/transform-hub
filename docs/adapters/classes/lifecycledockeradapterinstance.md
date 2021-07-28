[@scramjet/adapters](../README.md) / LifecycleDockerAdapterInstance

# Class: LifecycleDockerAdapterInstance

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Constructors

- [constructor](lifecycledockeradapterinstance.md#constructor)

### Properties

- [controlFifoPath](lifecycledockeradapterinstance.md#controlfifopath)
- [controlStream](lifecycledockeradapterinstance.md#controlstream)
- [dockerHelper](lifecycledockeradapterinstance.md#dockerhelper)
- [inputFifoPath](lifecycledockeradapterinstance.md#inputfifopath)
- [inputStream](lifecycledockeradapterinstance.md#inputstream)
- [logger](lifecycledockeradapterinstance.md#logger)
- [loggerFifoPath](lifecycledockeradapterinstance.md#loggerfifopath)
- [loggerStream](lifecycledockeradapterinstance.md#loggerstream)
- [monitorFifoPath](lifecycledockeradapterinstance.md#monitorfifopath)
- [monitorStream](lifecycledockeradapterinstance.md#monitorstream)
- [outputFifoPath](lifecycledockeradapterinstance.md#outputfifopath)
- [outputStream](lifecycledockeradapterinstance.md#outputstream)
- [resources](lifecycledockeradapterinstance.md#resources)
- [runnerStderr](lifecycledockeradapterinstance.md#runnerstderr)
- [runnerStdin](lifecycledockeradapterinstance.md#runnerstdin)
- [runnerStdout](lifecycledockeradapterinstance.md#runnerstdout)

### Methods

- [cleanup](lifecycledockeradapterinstance.md#cleanup)
- [createFifo](lifecycledockeradapterinstance.md#createfifo)
- [createFifoStreams](lifecycledockeradapterinstance.md#createfifostreams)
- [getPortsConfig](lifecycledockeradapterinstance.md#getportsconfig)
- [hookCommunicationHandler](lifecycledockeradapterinstance.md#hookcommunicationhandler)
- [init](lifecycledockeradapterinstance.md#init)
- [monitorRate](lifecycledockeradapterinstance.md#monitorrate)
- [preparePortBindingsConfig](lifecycledockeradapterinstance.md#prepareportbindingsconfig)
- [remove](lifecycledockeradapterinstance.md#remove)
- [run](lifecycledockeradapterinstance.md#run)
- [snapshot](lifecycledockeradapterinstance.md#snapshot)
- [stats](lifecycledockeradapterinstance.md#stats)

## Constructors

### constructor

• **new LifecycleDockerAdapterInstance**()

#### Defined in

[instance-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L52)

## Properties

### controlFifoPath

• `Private` `Optional` **controlFifoPath**: `string`

#### Defined in

[instance-adapter.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L36)

___

### controlStream

• `Private` **controlStream**: `DelayedStream`

#### Defined in

[instance-adapter.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L45)

___

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[instance-adapter.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L33)

___

### inputFifoPath

• `Private` `Optional` **inputFifoPath**: `string`

#### Defined in

[instance-adapter.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L37)

___

### inputStream

• `Private` **inputStream**: `DelayedStream`

#### Defined in

[instance-adapter.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L47)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[instance-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L52)

___

### loggerFifoPath

• `Private` `Optional` **loggerFifoPath**: `string`

#### Defined in

[instance-adapter.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L39)

___

### loggerStream

• `Private` **loggerStream**: `DelayedStream`

#### Defined in

[instance-adapter.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L46)

___

### monitorFifoPath

• `Private` `Optional` **monitorFifoPath**: `string`

#### Defined in

[instance-adapter.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L35)

___

### monitorStream

• `Private` **monitorStream**: `DelayedStream`

#### Defined in

[instance-adapter.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L44)

___

### outputFifoPath

• `Private` `Optional` **outputFifoPath**: `string`

#### Defined in

[instance-adapter.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L38)

___

### outputStream

• `Private` **outputStream**: `DelayedStream`

#### Defined in

[instance-adapter.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L48)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../README.md#dockeradapterresources) = `{}`

#### Defined in

[instance-adapter.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L50)

___

### runnerStderr

• `Private` **runnerStderr**: `PassThrough`

#### Defined in

[instance-adapter.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L43)

___

### runnerStdin

• `Private` **runnerStdin**: `PassThrough`

#### Defined in

[instance-adapter.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L41)

___

### runnerStdout

• `Private` **runnerStdout**: `PassThrough`

#### Defined in

[instance-adapter.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L42)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[instance-adapter.ts:310](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L310)

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

[instance-adapter.ts:73](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L73)

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

[instance-adapter.ts:90](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L90)

___

### getPortsConfig

▸ **getPortsConfig**(`ports`): `Promise`<[`DockerAdapterRunPortsConfig`](../README.md#dockeradapterrunportsconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ports` | `string`[] |

#### Returns

`Promise`<[`DockerAdapterRunPortsConfig`](../README.md#dockeradapterrunportsconfig)\>

#### Defined in

[instance-adapter.ts:145](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L145)

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

[instance-adapter.ts:175](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L175)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[instance-adapter.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L69)

___

### monitorRate

▸ **monitorRate**(`rps`): [`LifecycleDockerAdapterInstance`](lifecycledockeradapterinstance.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`LifecycleDockerAdapterInstance`](lifecycledockeradapterinstance.md)

#### Implementation of

ILifeCycleAdapterRun.monitorRate

#### Defined in

[instance-adapter.ts:339](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L339)

___

### preparePortBindingsConfig

▸ `Private` **preparePortBindingsConfig**(`declaredPorts`, `exposed?`): `Promise`<`Object`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `declaredPorts` | `string`[] | `undefined` |
| `exposed` | `boolean` | `false` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[instance-adapter.ts:131](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L131)

___

### remove

▸ **remove**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[instance-adapter.ts:344](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L344)

___

### run

▸ **run**(`config`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `RunnerConfig` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[instance-adapter.ts:212](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L212)

___

### snapshot

▸ **snapshot**(): `MaybePromise`<`string`\>

#### Returns

`MaybePromise`<`string`\>

#### Implementation of

ILifeCycleAdapterRun.snapshot

#### Defined in

[instance-adapter.ts:334](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L334)

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

[instance-adapter.ts:154](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/adapters/src/instance-adapter.ts#L154)

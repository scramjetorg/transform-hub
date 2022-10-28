[@scramjet/adapters](../README.md) / [Exports](../modules.md) / ProcessInstanceAdapter

# Class: ProcessInstanceAdapter

Adapter for running Instance by Runner executed in separate process.

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Properties

- [\_limits](ProcessInstanceAdapter.md#_limits)
- [crashLogStreams](ProcessInstanceAdapter.md#crashlogstreams)
- [logger](ProcessInstanceAdapter.md#logger)
- [runnerProcess](ProcessInstanceAdapter.md#runnerprocess)

### Methods

- [cleanup](ProcessInstanceAdapter.md#cleanup)
- [getCrashLog](ProcessInstanceAdapter.md#getcrashlog)
- [getPythonpath](ProcessInstanceAdapter.md#getpythonpath)
- [getRunnerCmd](ProcessInstanceAdapter.md#getrunnercmd)
- [init](ProcessInstanceAdapter.md#init)
- [monitorRate](ProcessInstanceAdapter.md#monitorrate)
- [remove](ProcessInstanceAdapter.md#remove)
- [run](ProcessInstanceAdapter.md#run)
- [stats](ProcessInstanceAdapter.md#stats)

### Constructors

- [constructor](ProcessInstanceAdapter.md#constructor)

### Accessors

- [limits](ProcessInstanceAdapter.md#limits)

## Properties

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[process-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L33)

___

### crashLogStreams

• `Private` `Optional` **crashLogStreams**: `Promise`<`string`[]\>

#### Defined in

[process-instance-adapter.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L32)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[process-instance-adapter.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L29)

___

### runnerProcess

• `Private` `Optional` **runnerProcess**: `ChildProcess`

#### Defined in

[process-instance-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L31)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Performs cleanup after Runner end.
Removes fifos used to communication with runner.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[process-instance-adapter.ts:166](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L166)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[process-instance-adapter.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L182)

___

### getPythonpath

▸ **getPythonpath**(`sequenceDir`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceDir` | `string` |

#### Returns

`string`

#### Defined in

[process-instance-adapter.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L92)

___

### getRunnerCmd

▸ **getRunnerCmd**(`config`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SequenceConfig` |

#### Returns

`string`[]

#### Defined in

[process-instance-adapter.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L63)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[process-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L45)

___

### monitorRate

▸ **monitorRate**(`_rps`): [`ProcessInstanceAdapter`](ProcessInstanceAdapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_rps` | `number` |

#### Returns

[`ProcessInstanceAdapter`](ProcessInstanceAdapter.md)

#### Implementation of

ILifeCycleAdapterRun.monitorRate

#### Defined in

[process-instance-adapter.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L171)

___

### remove

▸ **remove**(): `Promise`<`void`\>

Forcefully stops Runner process.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[process-instance-adapter.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L178)

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

[process-instance-adapter.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L107)

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

[process-instance-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L48)

## Constructors

### constructor

• **new ProcessInstanceAdapter**()

#### Defined in

[process-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L41)

## Accessors

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[process-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L35)

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

[process-instance-adapter.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L36)

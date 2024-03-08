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
- [exitCode](ProcessInstanceAdapter.md#exitcode)
- [id](ProcessInstanceAdapter.md#id)
- [logger](ProcessInstanceAdapter.md#logger)
- [processPID](ProcessInstanceAdapter.md#processpid)
- [runnerProcess](ProcessInstanceAdapter.md#runnerprocess)
- [sthConfig](ProcessInstanceAdapter.md#sthconfig)

### Methods

- [cleanup](ProcessInstanceAdapter.md#cleanup)
- [dispatch](ProcessInstanceAdapter.md#dispatch)
- [getCrashLog](ProcessInstanceAdapter.md#getcrashlog)
- [getPythonpath](ProcessInstanceAdapter.md#getpythonpath)
- [getRunnerCmd](ProcessInstanceAdapter.md#getrunnercmd)
- [getRunnerInfo](ProcessInstanceAdapter.md#getrunnerinfo)
- [init](ProcessInstanceAdapter.md#init)
- [monitorRate](ProcessInstanceAdapter.md#monitorrate)
- [remove](ProcessInstanceAdapter.md#remove)
- [run](ProcessInstanceAdapter.md#run)
- [setRunner](ProcessInstanceAdapter.md#setrunner)
- [stats](ProcessInstanceAdapter.md#stats)
- [waitUntilExit](ProcessInstanceAdapter.md#waituntilexit)

### Constructors

- [constructor](ProcessInstanceAdapter.md#constructor)

### Accessors

- [limits](ProcessInstanceAdapter.md#limits)

## Properties

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[process-instance-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L43)

___

### crashLogStreams

• `Private` `Optional` **crashLogStreams**: `Promise`<`string`[]\>

#### Defined in

[process-instance-adapter.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L42)

___

### exitCode

• **exitCode**: `number` = `-1`

#### Defined in

[process-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L38)

___

### id

• `Optional` **id**: `string`

#### Implementation of

ILifeCycleAdapterMain.id

#### Defined in

[process-instance-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L39)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[process-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L34)

___

### processPID

• **processPID**: `number` = `-1`

#### Defined in

[process-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L37)

___

### runnerProcess

• `Private` `Optional` **runnerProcess**: `ChildProcess`

#### Defined in

[process-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L41)

___

### sthConfig

• **sthConfig**: `STHConfiguration`

#### Defined in

[process-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L35)

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

[process-instance-adapter.ts:271](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L271)

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

[process-instance-adapter.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L141)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[process-instance-adapter.ts:291](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L291)

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

[process-instance-adapter.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L116)

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

[process-instance-adapter.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L78)

___

### getRunnerInfo

▸ **getRunnerInfo**(): `undefined` \| `Record`<`string`, `string`\>

#### Returns

`undefined` \| `Record`<`string`, `string`\>

#### Defined in

[process-instance-adapter.ts:189](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L189)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[process-instance-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L56)

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

ILifeCycleAdapterMain.monitorRate

#### Defined in

[process-instance-adapter.ts:276](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L276)

___

### remove

▸ **remove**(): `Promise`<`void`\>

Forcefully stops Runner process.

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[process-instance-adapter.ts:283](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L283)

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

[process-instance-adapter.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L136)

___

### setRunner

▸ **setRunner**(`system`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `system` | `Record`<`string`, `string`\> |

#### Returns

`void`

#### Implementation of

ILifeCycleAdapterRun.setRunner

#### Defined in

[process-instance-adapter.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L131)

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

ILifeCycleAdapterMain.stats

#### Defined in

[process-instance-adapter.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L60)

___

### waitUntilExit

▸ **waitUntilExit**(`_config`, `_instanceId`, `_sequenceInfo`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `InstanceConfig` |
| `_instanceId` | `string` |
| `_sequenceInfo` | `SequenceInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterMain.waitUntilExit

#### Defined in

[process-instance-adapter.ts:195](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L195)

## Constructors

### constructor

• **new ProcessInstanceAdapter**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Defined in

[process-instance-adapter.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L51)

## Accessors

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[process-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L45)

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

[process-instance-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-instance-adapter.ts#L46)

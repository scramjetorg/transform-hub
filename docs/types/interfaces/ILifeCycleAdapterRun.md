[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [`ILifeCycleAdapterMain`](ILifeCycleAdapterMain.md)

  ↳ **`ILifeCycleAdapterRun`**

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapterRun.md#cleanup)
- [dispatch](ILifeCycleAdapterRun.md#dispatch)
- [getCrashLog](ILifeCycleAdapterRun.md#getcrashlog)
- [init](ILifeCycleAdapterRun.md#init)
- [monitorRate](ILifeCycleAdapterRun.md#monitorrate)
- [remove](ILifeCycleAdapterRun.md#remove)
- [run](ILifeCycleAdapterRun.md#run)
- [setRunner](ILifeCycleAdapterRun.md#setrunner)
- [stats](ILifeCycleAdapterRun.md#stats)
- [waitUntilExit](ILifeCycleAdapterRun.md#waituntilexit)

### Properties

- [id](ILifeCycleAdapterRun.md#id)
- [limits](ILifeCycleAdapterRun.md#limits)
- [logger](ILifeCycleAdapterRun.md#logger)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[cleanup](ILifeCycleAdapterMain.md#cleanup)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L23)

___

### dispatch

▸ **dispatch**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

Initiates runner start without waiting for the result

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConfig`](../modules.md#instanceconfig) |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | [`SequenceInfo`](../modules.md#sequenceinfo) |
| `payload` | [`RunnerConnectInfo`](../modules.md#runnerconnectinfo) |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L49)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[getCrashLog](ILifeCycleAdapterMain.md#getcrashlog)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L32)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[init](ILifeCycleAdapterMain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L18)

___

### monitorRate

▸ **monitorRate**(`rps`): [`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[monitorRate](ILifeCycleAdapterMain.md#monitorrate)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L28)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[remove](ILifeCycleAdapterMain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L26)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

Starts Runner - in essence does `dispatch` and then `waitUntilExit`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConfig`](../modules.md#instanceconfig) |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | [`SequenceInfo`](../modules.md#sequenceinfo) |
| `payload` | [`RunnerConnectInfo`](../modules.md#runnerconnectinfo) |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L57)

___

### setRunner

▸ `Optional` **setRunner**(`system`): `MaybePromise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `system` | `undefined` \| `Record`<`string`, `string`\> |

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L39)

___

### stats

▸ **stats**(`msg`): `Promise`<[`MonitoringMessageData`](../modules.md#monitoringmessagedata)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`MonitoringMessageData`](../modules.md#monitoringmessagedata) |

#### Returns

`Promise`<[`MonitoringMessageData`](../modules.md#monitoringmessagedata)\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[stats](ILifeCycleAdapterMain.md#stats)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L30)

___

### waitUntilExit

▸ **waitUntilExit**(`config`, `instanceId`, `sequenceInfo`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `undefined` \| [`InstanceConfig`](../modules.md#instanceconfig) |
| `instanceId` | `string` |
| `sequenceInfo` | [`SequenceInfo`](../modules.md#sequenceinfo) |

#### Returns

`Promise`<`number`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[waitUntilExit](ILifeCycleAdapterMain.md#waituntilexit)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L34)

## Properties

### id

• `Optional` **id**: `string`

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[id](ILifeCycleAdapterMain.md#id)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L13)

___

### limits

• **limits**: [`InstanceLimits`](../modules.md#instancelimits)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L41)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[logger](ILifeCycleAdapterMain.md#logger)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L12)

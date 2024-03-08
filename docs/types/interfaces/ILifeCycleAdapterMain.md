[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapterMain

# Interface: ILifeCycleAdapterMain

## Hierarchy

- **`ILifeCycleAdapterMain`**

  ↳ [`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapterMain.md#cleanup)
- [getCrashLog](ILifeCycleAdapterMain.md#getcrashlog)
- [init](ILifeCycleAdapterMain.md#init)
- [monitorRate](ILifeCycleAdapterMain.md#monitorrate)
- [remove](ILifeCycleAdapterMain.md#remove)
- [stats](ILifeCycleAdapterMain.md#stats)
- [waitUntilExit](ILifeCycleAdapterMain.md#waituntilexit)

### Properties

- [id](ILifeCycleAdapterMain.md#id)
- [logger](ILifeCycleAdapterMain.md#logger)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L23)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L32)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L18)

___

### monitorRate

▸ **monitorRate**(`rps`): [`ILifeCycleAdapterMain`](ILifeCycleAdapterMain.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapterMain`](ILifeCycleAdapterMain.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L28)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L26)

___

### stats

▸ **stats**(`msg`): `Promise`<[`MonitoringMessageData`](../modules.md#monitoringmessagedata)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`MonitoringMessageData`](../modules.md#monitoringmessagedata) |

#### Returns

`Promise`<[`MonitoringMessageData`](../modules.md#monitoringmessagedata)\>

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

#### Defined in

[packages/types/src/lifecycle-adapters.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L34)

## Properties

### id

• `Optional` **id**: `string`

#### Defined in

[packages/types/src/lifecycle-adapters.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L13)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L12)

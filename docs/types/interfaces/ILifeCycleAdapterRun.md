[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [`ILifeCycleAdapterMain`](ILifeCycleAdapterMain.md)

  ↳ **`ILifeCycleAdapterRun`**

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapterRun.md#cleanup)
- [getCrashLog](ILifeCycleAdapterRun.md#getcrashlog)
- [init](ILifeCycleAdapterRun.md#init)
- [monitorRate](ILifeCycleAdapterRun.md#monitorrate)
- [remove](ILifeCycleAdapterRun.md#remove)
- [run](ILifeCycleAdapterRun.md#run)
- [stats](ILifeCycleAdapterRun.md#stats)

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

[packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L21)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[getCrashLog](ILifeCycleAdapterMain.md#getcrashlog)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L26)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[init](ILifeCycleAdapterMain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L16)

___

### monitorRate

▸ **monitorRate**(`rps`): [`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L41)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[remove](ILifeCycleAdapterMain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L24)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

Starts Runner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConfig`](../modules.md#instanceconfig) |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

Runner exit code.

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

#### Defined in

[packages/types/src/lifecycle-adapters.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L43)

## Properties

### id

• `Optional` **id**: `string`

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[id](ILifeCycleAdapterMain.md#id)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L11)

___

### limits

• **limits**: [`InstanceLimits`](../modules.md#instancelimits)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L31)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[logger](ILifeCycleAdapterMain.md#logger)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L10)

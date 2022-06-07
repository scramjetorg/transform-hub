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

[packages/types/src/lifecycle-adapters.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L20)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[getCrashLog](ILifeCycleAdapterMain.md#getcrashlog)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L25)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[init](ILifeCycleAdapterMain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L15)

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

[packages/types/src/lifecycle-adapters.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L40)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[remove](ILifeCycleAdapterMain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L23)

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

[packages/types/src/lifecycle-adapters.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L38)

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

[packages/types/src/lifecycle-adapters.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L42)

## Properties

### limits

• **limits**: [`InstanceLimits`](../modules.md#instancelimits)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L30)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[logger](ILifeCycleAdapterMain.md#logger)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L10)

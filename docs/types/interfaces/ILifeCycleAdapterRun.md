[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [`ILifeCycleAdapterMain`](ILifeCycleAdapterMain.md)

  ↳ **`ILifeCycleAdapterRun`**

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapterRun.md#cleanup)
- [init](ILifeCycleAdapterRun.md#init)
- [monitorRate](ILifeCycleAdapterRun.md#monitorrate)
- [remove](ILifeCycleAdapterRun.md#remove)
- [run](ILifeCycleAdapterRun.md#run)
- [stats](ILifeCycleAdapterRun.md#stats)

### Properties

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

[packages/types/src/lifecycle-adapters.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L19)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[init](ILifeCycleAdapterMain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L14)

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

[packages/types/src/lifecycle-adapters.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L35)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[remove](ILifeCycleAdapterMain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L22)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

Starts Runner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConifg`](../modules.md#instanceconifg) |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L33)

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

[packages/types/src/lifecycle-adapters.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L37)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Inherited from

[ILifeCycleAdapterMain](ILifeCycleAdapterMain.md).[logger](ILifeCycleAdapterMain.md#logger)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L9)

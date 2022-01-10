[@scramjet/types](../README.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [`ILifeCycleAdapterMain`](ilifecycleadaptermain.md)

  ↳ **`ILifeCycleAdapterRun`**

## Table of contents

### Methods

- [cleanup](ilifecycleadapterrun.md#cleanup)
- [init](ilifecycleadapterrun.md#init)
- [monitorRate](ilifecycleadapterrun.md#monitorrate)
- [remove](ilifecycleadapterrun.md#remove)
- [run](ilifecycleadapterrun.md#run)
- [stats](ilifecycleadapterrun.md#stats)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ilifecycleadaptermain.md).[cleanup](ilifecycleadaptermain.md#cleanup)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L16)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ilifecycleadaptermain.md).[init](ilifecycleadaptermain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L11)

___

### monitorRate

▸ **monitorRate**(`rps`): [`ILifeCycleAdapterRun`](ilifecycleadapterrun.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapterRun`](ilifecycleadapterrun.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L32)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ilifecycleadaptermain.md).[remove](ilifecycleadaptermain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L19)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

Starts Runner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConifg`](../README.md#instanceconifg) |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L30)

___

### stats

▸ **stats**(`msg`): `Promise`<[`MonitoringMessageData`](../README.md#monitoringmessagedata)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`MonitoringMessageData`](../README.md#monitoringmessagedata) |

#### Returns

`Promise`<[`MonitoringMessageData`](../README.md#monitoringmessagedata)\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L34)

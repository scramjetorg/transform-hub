[@scramjet/types](../README.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [`ILifeCycleAdapterMain`](ilifecycleadaptermain.md)

  ↳ **`ILifeCycleAdapterRun`**

## Table of contents

### Methods

- [cleanup](ilifecycleadapterrun.md#cleanup)
- [hookCommunicationHandler](ilifecycleadapterrun.md#hookcommunicationhandler)
- [init](ilifecycleadapterrun.md#init)
- [monitorRate](ilifecycleadapterrun.md#monitorrate)
- [remove](ilifecycleadapterrun.md#remove)
- [run](ilifecycleadapterrun.md#run)
- [snapshot](ilifecycleadapterrun.md#snapshot)
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

[packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L21)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`): `MaybePromise`<`void`\>

Hooks up downstream streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `communicationHandler` | [`ICommunicationHandler`](icommunicationhandler.md) | CommunicationHandler |

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L48)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ilifecycleadaptermain.md).[init](ilifecycleadaptermain.md#init)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L16)

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

[packages/types/src/lifecycle-adapters.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L50)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Inherited from

[ILifeCycleAdapterMain](ilifecycleadaptermain.md).[remove](ilifecycleadaptermain.md#remove)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L24)

___

### run

▸ **run**(`config`): `Promise`<`number`\>

Starts Runner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`InstanceConifg`](../README.md#instanceconifg) |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L34)

___

### snapshot

▸ **snapshot**(): `MaybePromise`<`string`\>

Request snapshot and returns snapshot url.\

#### Returns

`MaybePromise`<`string`\>

snapshot url.

#### Defined in

[packages/types/src/lifecycle-adapters.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L41)

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

[packages/types/src/lifecycle-adapters.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L52)

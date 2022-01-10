[@scramjet/types](../README.md) / ILifeCycleAdapter

# Interface: ILifeCycleAdapter

## Table of contents

### Methods

- [cleanup](ilifecycleadapter.md#cleanup)
- [hookCommunicationHandler](ilifecycleadapter.md#hookcommunicationhandler)
- [identify](ilifecycleadapter.md#identify)
- [init](ilifecycleadapter.md#init)
- [monitorRate](ilifecycleadapter.md#monitorrate)
- [remove](ilifecycleadapter.md#remove)
- [run](ilifecycleadapter.md#run)
- [stats](ilifecycleadapter.md#stats)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L35)

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

[packages/types/src/lifecycle.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L42)

___

### identify

▸ **identify**(`stream`): `MaybePromise`<[`InstanceConifg`](../README.md#instanceconifg)\>

Passes stream to PreRunner and resolves with PreRunner's results.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `Readable` | Stream with package. |

#### Returns

`MaybePromise`<[`InstanceConifg`](../README.md#instanceconifg)\>

#### Defined in

[packages/types/src/lifecycle.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L22)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L14)

___

### monitorRate

▸ **monitorRate**(`rps`): [`ILifeCycleAdapter`](ilifecycleadapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapter`](ilifecycleadapter.md)

#### Defined in

[packages/types/src/lifecycle.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L44)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L47)

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

[packages/types/src/lifecycle.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L30)

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

[packages/types/src/lifecycle.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L49)

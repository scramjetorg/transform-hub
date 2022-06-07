[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapter

# Interface: ILifeCycleAdapter

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapter.md#cleanup)
- [hookCommunicationHandler](ILifeCycleAdapter.md#hookcommunicationhandler)
- [identify](ILifeCycleAdapter.md#identify)
- [init](ILifeCycleAdapter.md#init)
- [monitorRate](ILifeCycleAdapter.md#monitorrate)
- [remove](ILifeCycleAdapter.md#remove)
- [run](ILifeCycleAdapter.md#run)
- [stats](ILifeCycleAdapter.md#stats)

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
| `communicationHandler` | [`ICommunicationHandler`](ICommunicationHandler.md) | CommunicationHandler |

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L42)

___

### identify

▸ **identify**(`stream`): `MaybePromise`<[`InstanceConfig`](../modules.md#instanceconfig)\>

Passes stream to PreRunner and resolves with PreRunner's results.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `Readable` | Stream with package. |

#### Returns

`MaybePromise`<[`InstanceConfig`](../modules.md#instanceconfig)\>

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

▸ **monitorRate**(`rps`): [`ILifeCycleAdapter`](ILifeCycleAdapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | `number` |

#### Returns

[`ILifeCycleAdapter`](ILifeCycleAdapter.md)

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
| `config` | [`InstanceConfig`](../modules.md#instanceconfig) |

#### Returns

`Promise`<`number`\>

Runner exit code.

#### Defined in

[packages/types/src/lifecycle.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L30)

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

[packages/types/src/lifecycle.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L49)

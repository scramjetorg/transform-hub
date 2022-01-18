[@scramjet/api-client](../README.md) / [Exports](../modules.md) / SequenceClient

# Class: SequenceClient

Sequence client.
Provides methods to interact with sequence.

## Table of contents

### Properties

- [\_id](SequenceClient.md#_id)
- [host](SequenceClient.md#host)
- [sequenceURL](SequenceClient.md#sequenceurl)

### Accessors

- [clientUtils](SequenceClient.md#clientutils)
- [id](SequenceClient.md#id)

### Constructors

- [constructor](SequenceClient.md#constructor)

### Methods

- [from](SequenceClient.md#from)
- [getInfo](SequenceClient.md#getinfo)
- [getInstance](SequenceClient.md#getinstance)
- [listInstances](SequenceClient.md#listinstances)
- [overwrite](SequenceClient.md#overwrite)
- [start](SequenceClient.md#start)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[packages/api-client/src/sequence-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L11)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[packages/api-client/src/sequence-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L13)

___

### sequenceURL

• `Private` **sequenceURL**: `string`

#### Defined in

[packages/api-client/src/sequence-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L12)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[packages/api-client/src/sequence-client.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L22)

___

### id

• `get` **id**(): `string`

Sequence id.

#### Returns

`string`

#### Defined in

[packages/api-client/src/sequence-client.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L18)

## Constructors

### constructor

• `Private` **new SequenceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[packages/api-client/src/sequence-client.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L37)

## Methods

### from

▸ `Static` **from**(`id`, `host`): [`SequenceClient`](SequenceClient.md)

Creates SequenceClient instance for sequence with given id and host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Sequence id |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) | Host client |

#### Returns

[`SequenceClient`](SequenceClient.md)

Sequence client

#### Defined in

[packages/api-client/src/sequence-client.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L33)

___

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../modules.md#response)\>

Returns sequence details.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise which resolves with sequence info.

#### Defined in

[packages/api-client/src/sequence-client.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L91)

___

### getInstance

▸ **getInstance**(`id`, `host`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

TODO:

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | TODO: |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) | Host client. |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

Instance client.

#### Defined in

[packages/api-client/src/sequence-client.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L82)

___

### listInstances

▸ **listInstances**(): `Promise`<[`Response`](../modules.md#response)\>

Returns list of all instances creteated from sequnece.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

List of instances

#### Defined in

[packages/api-client/src/sequence-client.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L71)

___

### overwrite

▸ **overwrite**(): `Promise`<`void`\>

TODO: comment.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/api-client/src/sequence-client.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L98)

___

### start

▸ **start**(`appConfig`, `args`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

Starts sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `appConfig` | `any` | Configuration to be passed to Instance context. |
| `args` | `any` | Arguments to be passed to first function in Sequence. |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

Promise which resolves with instance client.

#### Defined in

[packages/api-client/src/sequence-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L54)

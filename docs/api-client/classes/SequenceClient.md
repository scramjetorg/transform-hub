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

[sequence-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L13)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[sequence-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L15)

___

### sequenceURL

• `Private` **sequenceURL**: `string`

#### Defined in

[sequence-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L14)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[sequence-client.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L24)

___

### id

• `get` **id**(): `string`

Sequence id.

#### Returns

`string`

#### Defined in

[sequence-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L20)

## Constructors

### constructor

• `Private` **new SequenceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[sequence-client.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L39)

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

[sequence-client.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L35)

___

### getInfo

▸ **getInfo**(): `Promise`<`GetSequenceResponse`\>

Returns sequence details.

#### Returns

`Promise`<`GetSequenceResponse`\>

Promise resolving to Sequence info.

#### Defined in

[sequence-client.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L96)

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

[sequence-client.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L87)

___

### listInstances

▸ **listInstances**(): `Promise`<`string`[]\>

Returns list of all instances creteated from sequnece.

#### Returns

`Promise`<`string`[]\>

Promise resolving to list of Instances.

#### Defined in

[sequence-client.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L76)

___

### overwrite

▸ **overwrite**(): `Promise`<`void`\>

Not implemented.

#### Returns

`Promise`<`void`\>

#### Defined in

[sequence-client.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L103)

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

Promise resolving to Instance Client.

#### Defined in

[sequence-client.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L56)

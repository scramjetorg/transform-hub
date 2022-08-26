[@scramjet/api-client](../README.md) / [Exports](../modules.md) / SequenceClient

# Class: SequenceClient

Sequence client.
Provides methods to interact with Sequence.

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

[api-client/src/sequence-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L12)

___

### host

• `Private` **host**: `ClientProvider`

#### Defined in

[api-client/src/sequence-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L14)

___

### sequenceURL

• `Private` **sequenceURL**: `string`

#### Defined in

[api-client/src/sequence-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L13)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): `HttpClientNode`

#### Returns

`HttpClientNode`

#### Defined in

[api-client/src/sequence-client.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L23)

___

### id

• `get` **id**(): `string`

Sequence id.

#### Returns

`string`

#### Defined in

[api-client/src/sequence-client.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L19)

## Constructors

### constructor

• `Private` **new SequenceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | `ClientProvider` |

#### Defined in

[api-client/src/sequence-client.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L38)

## Methods

### from

▸ `Static` **from**(`id`, `host`): [`SequenceClient`](SequenceClient.md)

Creates SequenceClient instance for Sequence with given id and host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Sequence id |
| `host` | `ClientProvider` | Host client |

#### Returns

[`SequenceClient`](SequenceClient.md)

Sequence client

#### Defined in

[api-client/src/sequence-client.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L34)

___

### getInfo

▸ **getInfo**(): `Promise`<`GetSequenceResponse`\>

Returns Sequence details.

#### Returns

`Promise`<`GetSequenceResponse`\>

Promise resolving to Sequence info.

#### Defined in

[api-client/src/sequence-client.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L94)

___

### getInstance

▸ **getInstance**(`id`, `host`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

Return Instance Client for given Instance id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance id. |
| `host` | `ClientProvider` | Host client. |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

Instance client.

#### Defined in

[api-client/src/sequence-client.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L85)

___

### listInstances

▸ **listInstances**(): `Promise`<`string`[]\>

Returns list of all Instances created from Sequence.

#### Returns

`Promise`<`string`[]\>

Promise resolving to list of Instances.

#### Defined in

[api-client/src/sequence-client.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L74)

___

### overwrite

▸ **overwrite**(`stream`): `Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |

#### Returns

`Promise`<[`SequenceClient`](SequenceClient.md)\>

#### Defined in

[api-client/src/sequence-client.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L98)

___

### start

▸ **start**(`payload`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

Starts Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `StartSequencePayload` | App start configuration. |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

Promise resolving to Instance Client.

#### Defined in

[api-client/src/sequence-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L54)

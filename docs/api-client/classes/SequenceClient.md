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

[api-client/src/sequence-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L11)

___

### host

• `Private` **host**: `ClientProvider`

#### Defined in

[api-client/src/sequence-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L13)

___

### sequenceURL

• `Private` **sequenceURL**: `string`

#### Defined in

[api-client/src/sequence-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L12)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): `HttpClientNode`

#### Returns

`HttpClientNode`

#### Defined in

[api-client/src/sequence-client.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L22)

___

### id

• `get` **id**(): `string`

Sequence id.

#### Returns

`string`

#### Defined in

[api-client/src/sequence-client.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L18)

## Constructors

### constructor

• `Private` **new SequenceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | `ClientProvider` |

#### Defined in

[api-client/src/sequence-client.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L37)

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

[api-client/src/sequence-client.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L33)

___

### getInfo

▸ **getInfo**(): `Promise`<`GetSequenceResponse`\>

Returns Sequence details.

#### Returns

`Promise`<`GetSequenceResponse`\>

Promise resolving to Sequence info.

#### Defined in

[api-client/src/sequence-client.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L93)

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

[api-client/src/sequence-client.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L84)

___

### listInstances

▸ **listInstances**(): `Promise`<`string`[]\>

Returns list of all Instances created from Sequence.

#### Returns

`Promise`<`string`[]\>

Promise resolving to list of Instances.

#### Defined in

[api-client/src/sequence-client.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L73)

___

### overwrite

▸ **overwrite**(): `Promise`<`void`\>

Not implemented.

#### Returns

`Promise`<`void`\>

#### Defined in

[api-client/src/sequence-client.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L100)

___

### start

▸ **start**(`payload`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

Starts sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `StartSequencePayload` | App start configuration. |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

Promise resolving to Instance Client.

#### Defined in

[api-client/src/sequence-client.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/sequence-client.ts#L53)

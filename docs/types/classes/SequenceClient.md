[@scramjet/types](../README.md) / [Exports](../modules.md) / SequenceClient

# Class: SequenceClient

## Table of contents

### Constructors

- [constructor](SequenceClient.md#constructor)

### Methods

- [from](SequenceClient.md#from)
- [getInfo](SequenceClient.md#getinfo)
- [getInstance](SequenceClient.md#getinstance)
- [listInstances](SequenceClient.md#listinstances)
- [overwrite](SequenceClient.md#overwrite)
- [start](SequenceClient.md#start)

### Accessors

- [id](SequenceClient.md#id)

## Constructors

### constructor

• **new SequenceClient**(`apiBase`, `utils`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `undefined` \| `ClientUtils` |

#### Defined in

[packages/types/src/api-client/host-client.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L40)

## Methods

### from

▸ `Static` **from**(`id`, `host`): [`SequenceClient`](SequenceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](ClientProvider.md) |

#### Returns

[`SequenceClient`](SequenceClient.md)

#### Defined in

[packages/types/src/api-client/host-client.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L38)

___

### getInfo

▸ **getInfo**(): `Promise`<[`GetSequenceResponse`](../modules/STHRestAPI.md#getsequenceresponse)\>

#### Returns

`Promise`<[`GetSequenceResponse`](../modules/STHRestAPI.md#getsequenceresponse)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L45)

___

### getInstance

▸ **getInstance**(`id`, `host`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](ClientProvider.md) |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L44)

___

### listInstances

▸ **listInstances**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/types/src/api-client/host-client.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L43)

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

[packages/types/src/api-client/host-client.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L46)

___

### start

▸ **start**(`payload`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | [`StartSequencePayload`](../modules/STHRestAPI.md#startsequencepayload) |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Defined in

[packages/types/src/api-client/host-client.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L42)

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/types/src/api-client/host-client.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L36)

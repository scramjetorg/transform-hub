[@scramjet/api-client](../README.md) / SequenceClient

# Class: SequenceClient

## Table of contents

### Constructors

- [constructor](SequenceClient.md#constructor)

### Properties

- [\_id](SequenceClient.md#_id)
- [host](SequenceClient.md#host)
- [sequenceURL](SequenceClient.md#sequenceurl)

### Accessors

- [clientUtils](SequenceClient.md#clientutils)
- [id](SequenceClient.md#id)

### Methods

- [getInfo](SequenceClient.md#getinfo)
- [getInstance](SequenceClient.md#getinstance)
- [listInstances](SequenceClient.md#listinstances)
- [overwrite](SequenceClient.md#overwrite)
- [start](SequenceClient.md#start)
- [from](SequenceClient.md#from)

## Constructors

### constructor

• `Private` **new SequenceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[packages/api-client/src/sequence-client.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L23)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[packages/api-client/src/sequence-client.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L7)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[packages/api-client/src/sequence-client.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L9)

___

### sequenceURL

• `Private` **sequenceURL**: `string`

#### Defined in

[packages/api-client/src/sequence-client.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L8)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[packages/api-client/src/sequence-client.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L15)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/api-client/src/sequence-client.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L11)

## Methods

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/sequence-client.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L52)

___

### getInstance

▸ **getInstance**(`id`, `host`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Defined in

[packages/api-client/src/sequence-client.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L48)

___

### listInstances

▸ **listInstances**(): `Promise`<[`Response`](../README.md#response)\>

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/sequence-client.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L44)

___

### overwrite

▸ **overwrite**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/api-client/src/sequence-client.ts:56](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L56)

___

### start

▸ **start**(`appConfig`, `args`): `Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `appConfig` | `any` |
| `args` | `any` |

#### Returns

`Promise`<[`InstanceClient`](InstanceClient.md)\>

#### Defined in

[packages/api-client/src/sequence-client.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L33)

___

### from

▸ `Static` **from**(`id`, `host`): [`SequenceClient`](SequenceClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Returns

[`SequenceClient`](SequenceClient.md)

#### Defined in

[packages/api-client/src/sequence-client.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/sequence-client.ts#L19)

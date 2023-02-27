[@scramjet/types](../README.md) / [Exports](../modules.md) / ClientUtils

# Class: ClientUtils

## Hierarchy

- [`ClientUtilsBase`](ClientUtilsBase.md)

  ↳ **`ClientUtils`**

## Table of contents

### Methods

- [addLogger](ClientUtils.md#addlogger)
- [delete](ClientUtils.md#delete)
- [get](ClientUtils.md#get)
- [getStream](ClientUtils.md#getstream)
- [post](ClientUtils.md#post)
- [put](ClientUtils.md#put)
- [sendStream](ClientUtils.md#sendstream)
- [setDefaultHeaders](ClientUtils.md#setdefaultheaders)

### Properties

- [agent](ClientUtils.md#agent)
- [apiBase](ClientUtils.md#apibase)
- [headers](ClientUtils.md#headers)

### Constructors

- [constructor](ClientUtils.md#constructor)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | `Partial`<[`RequestLogger`](RequestLogger.md)\> |

#### Returns

`void`

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[addLogger](ClientUtilsBase.md#addlogger)

#### Defined in

[packages/types/src/api-client/client-utils.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L70)

___

### delete

▸ **delete**<`T`\>(`url`, `requestInit?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`T`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[delete](ClientUtilsBase.md#delete)

#### Defined in

[packages/types/src/api-client/client-utils.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L75)

___

### get

▸ **get**<`T`\>(`url`, `requestInit`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `requestInit` | `RequestInit` |

#### Returns

`Promise`<`T`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[get](ClientUtilsBase.md#get)

#### Defined in

[packages/types/src/api-client/client-utils.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L71)

___

### getStream

▸ **getStream**(`url`, `requestInit?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`any`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[getStream](ClientUtilsBase.md#getstream)

#### Defined in

[packages/types/src/api-client/client-utils.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L72)

___

### post

▸ **post**<`T`\>(`url`, `data`, `requestInit?`, `config?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `requestInit?` | `RequestInit` |
| `config?` | [`RequestConfig`](../modules.md#requestconfig) |

#### Returns

`Promise`<`T`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[post](ClientUtilsBase.md#post)

#### Defined in

[packages/types/src/api-client/client-utils.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L73)

___

### put

▸ **put**<`T`\>(`url`, `data`, `requestInit?`, `config?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `requestInit?` | `RequestInit` |
| `config?` | [`RequestConfig`](../modules.md#requestconfig) |

#### Returns

`Promise`<`T`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[put](ClientUtilsBase.md#put)

#### Defined in

[packages/types/src/api-client/client-utils.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L74)

___

### sendStream

▸ **sendStream**<`T`\>(`url`, `stream`, `requestInit?`, `opts?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `any` |
| `requestInit?` | `RequestInit` |
| `opts?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> |

#### Returns

`Promise`<`T`\>

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[sendStream](ClientUtilsBase.md#sendstream)

#### Defined in

[packages/types/src/api-client/client-utils.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L76)

___

### setDefaultHeaders

▸ `Static` **setDefaultHeaders**(`headers`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | `Headers` |

#### Returns

`void`

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[setDefaultHeaders](ClientUtilsBase.md#setdefaultheaders)

#### Defined in

[packages/types/src/api-client/client-utils.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L63)

## Properties

### agent

• **agent**: `Agent` \| `Agent`

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[agent](ClientUtilsBase.md#agent)

#### Defined in

[packages/types/src/api-client/client-utils.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L66)

___

### apiBase

• **apiBase**: `string`

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[apiBase](ClientUtilsBase.md#apibase)

#### Defined in

[packages/types/src/api-client/client-utils.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L65)

___

### headers

▪ `Static` **headers**: `Headers`

#### Inherited from

[ClientUtilsBase](ClientUtilsBase.md).[headers](ClientUtilsBase.md#headers)

#### Defined in

[packages/types/src/api-client/client-utils.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L62)

## Constructors

### constructor

• **new ClientUtils**(`apiBase`, `ca?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `ca?` | `string` \| `Buffer` |

#### Overrides

[ClientUtilsBase](ClientUtilsBase.md).[constructor](ClientUtilsBase.md#constructor)

#### Defined in

[packages/types/src/api-client/client-utils.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L80)

[@scramjet/types](../README.md) / [Exports](../modules.md) / ClientUtilsBase

# Class: ClientUtilsBase

## Hierarchy

- [`HttpClient`](HttpClient.md)

  ↳ **`ClientUtilsBase`**

  ↳↳ [`ClientUtils`](ClientUtils.md)

  ↳↳ [`ClientUtilsCustomAgent`](ClientUtilsCustomAgent.md)

## Table of contents

### Methods

- [addLogger](ClientUtilsBase.md#addlogger)
- [delete](ClientUtilsBase.md#delete)
- [get](ClientUtilsBase.md#get)
- [getStream](ClientUtilsBase.md#getstream)
- [post](ClientUtilsBase.md#post)
- [put](ClientUtilsBase.md#put)
- [sendStream](ClientUtilsBase.md#sendstream)
- [setDefaultHeaders](ClientUtilsBase.md#setdefaultheaders)

### Properties

- [agent](ClientUtilsBase.md#agent)
- [apiBase](ClientUtilsBase.md#apibase)
- [headers](ClientUtilsBase.md#headers)

### Constructors

- [constructor](ClientUtilsBase.md#constructor)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | `Partial`<[`RequestLogger`](RequestLogger.md)\> |

#### Returns

`void`

#### Overrides

[HttpClient](HttpClient.md).[addLogger](HttpClient.md#addlogger)

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

#### Overrides

[HttpClient](HttpClient.md).[delete](HttpClient.md#delete)

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

#### Overrides

[HttpClient](HttpClient.md).[get](HttpClient.md#get)

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

#### Overrides

[HttpClient](HttpClient.md).[getStream](HttpClient.md#getstream)

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

#### Overrides

[HttpClient](HttpClient.md).[post](HttpClient.md#post)

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

#### Overrides

[HttpClient](HttpClient.md).[sendStream](HttpClient.md#sendstream)

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

#### Defined in

[packages/types/src/api-client/client-utils.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L63)

## Properties

### agent

• **agent**: `Agent` \| `Agent`

#### Defined in

[packages/types/src/api-client/client-utils.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L66)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/types/src/api-client/client-utils.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L65)

___

### headers

▪ `Static` **headers**: `Headers`

#### Defined in

[packages/types/src/api-client/client-utils.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L62)

## Constructors

### constructor

• **new ClientUtilsBase**(`apiBase`, `fetch`, `normalizeUrlFn?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `fetch` | `any` |
| `normalizeUrlFn?` | (`url`: `string`) => `string` |

#### Overrides

[HttpClient](HttpClient.md).[constructor](HttpClient.md#constructor)

#### Defined in

[packages/types/src/api-client/client-utils.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/client-utils.ts#L68)

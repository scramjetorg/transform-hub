[@scramjet/client-utils](../README.md) / [Exports](../modules.md) / ClientUtils

# Class: ClientUtils

Provides HTTP communication methods.

**`Classdesc`**

Provides HTTP communication methods.

## Hierarchy

- `ClientUtilsBase`

  ↳ **`ClientUtils`**

## Implements

- [`HttpClient`](../interfaces/HttpClient.md)

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

Sets given logger.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `logger` | `Partial`<[`RequestLogger`](../modules.md#requestlogger)\> | Logger to set. |

#### Returns

`void`

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[addLogger](../interfaces/HttpClient.md#addlogger)

#### Inherited from

ClientUtilsBase.addLogger

#### Defined in

[packages/client-utils/src/client-utils.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L29)

___

### delete

▸ **delete**<`T`\>(`url`, `requestInit?`): `Promise`<`T`\>

Performs DELETE request.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`T`\>

Promise resolving to given type.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[delete](../interfaces/HttpClient.md#delete)

#### Inherited from

ClientUtilsBase.delete

#### Defined in

[packages/client-utils/src/client-utils.ts:194](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L194)

___

### get

▸ **get**<`T`\>(`url`, `requestInit?`): `Promise`<`T`\>

Performs get using request wrapper.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`T`\>

Promise resolving to given type.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[get](../interfaces/HttpClient.md#get)

#### Inherited from

ClientUtilsBase.get

#### Defined in

[packages/client-utils/src/client-utils.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L119)

___

### getStream

▸ **getStream**(`url`, `requestInit?`, `options?`): `Promise`<`any`\>

Performs get request for streamed data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |
| `options` | `Partial`<{ `type`: `string`  }\> | send stream options. |

#### Returns

`Promise`<`any`\>

Readable stream.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[getStream](../interfaces/HttpClient.md#getstream)

#### Inherited from

ClientUtilsBase.getStream

#### Defined in

[packages/client-utils/src/client-utils.ts:245](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L245)

___

### post

▸ **post**<`T`\>(`url`, `data`, `requestInit?`, `config?`): `Promise`<`T`\>

Performs POST request and returns response in given type.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `data` | `any` | Data to be send. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |
| `config` | `RequestConfig` | Request config. |

#### Returns

`Promise`<`T`\>

Promise resolving to given type.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[post](../interfaces/HttpClient.md#post)

#### Inherited from

ClientUtilsBase.post

#### Defined in

[packages/client-utils/src/client-utils.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L132)

___

### put

▸ **put**<`T`\>(`url`, `data`, `requestInit?`, `config?`): `Promise`<`T`\>

Performs PUT request and returns response in given type.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `data` | `any` | Data to be send. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |
| `config` | `RequestConfig` | Request config. |

#### Returns

`Promise`<`T`\>

Promise resolving to given type.

#### Inherited from

ClientUtilsBase.put

#### Defined in

[packages/client-utils/src/client-utils.ts:164](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L164)

___

### sendStream

▸ **sendStream**<`T`\>(`url`, `stream`, `requestInit?`, `options?`): `Promise`<`T`\>

Performs POST request for streamed data.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request url. |
| `stream` | `any` | stream to be send. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |
| `options` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `type`: `string`  }\> | send stream options. |

#### Returns

`Promise`<`T`\>

Promise resolving to response of given type.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[sendStream](../interfaces/HttpClient.md#sendstream)

#### Inherited from

ClientUtilsBase.sendStream

#### Defined in

[packages/client-utils/src/client-utils.ts:217](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L217)

___

### setDefaultHeaders

▸ `Static` **setDefaultHeaders**(`headers`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | [`Headers`](../modules.md#headers) |

#### Returns

`void`

#### Inherited from

ClientUtilsBase.setDefaultHeaders

#### Defined in

[packages/client-utils/src/client-utils.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L39)

## Properties

### agent

• **agent**: `Agent` \| `Agent`

#### Inherited from

ClientUtilsBase.agent

#### Defined in

[packages/client-utils/src/client-utils.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L14)

___

### apiBase

• **apiBase**: `string`

#### Inherited from

ClientUtilsBase.apiBase

#### Defined in

[packages/client-utils/src/client-utils.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L17)

___

### headers

▪ `Static` **headers**: [`Headers`](../modules.md#headers) = `{}`

#### Inherited from

ClientUtilsBase.headers

#### Defined in

[packages/client-utils/src/client-utils.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L13)

## Constructors

### constructor

• **new ClientUtils**(`apiBase`, `ca?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `ca?` | `string` \| `Buffer` |

#### Overrides

ClientUtilsBase.constructor

#### Defined in

[packages/client-utils/src/index.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/index.ts#L30)

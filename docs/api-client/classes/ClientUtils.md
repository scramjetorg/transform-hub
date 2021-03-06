[@scramjet/client-utils](../README.md) / [Exports](../modules.md) / ClientUtils

# Class: ClientUtils

Provides HTTP communication methods.

**`classdesc`** Provides HTTP communication methods.

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
- [sendStream](ClientUtils.md#sendstream)
- [setDefaultHeaders](ClientUtils.md#setdefaultheaders)

### Properties

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

[packages/client-utils/src/client-utils.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L27)

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

[packages/client-utils/src/client-utils.ts:170](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L170)

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

[packages/client-utils/src/client-utils.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L116)

___

### getStream

▸ **getStream**(`url`, `requestInit?`): `Promise`<`any`\>

Performs get request for streamed data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `requestInit` | `RequestInit` | RequestInit object to be passed to fetch. |

#### Returns

`Promise`<`any`\>

Readable stream.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[getStream](../interfaces/HttpClient.md#getstream)

#### Inherited from

ClientUtilsBase.getStream

#### Defined in

[packages/client-utils/src/client-utils.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L127)

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

[packages/client-utils/src/client-utils.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L140)

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

[packages/client-utils/src/client-utils.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L193)

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

ClientUtilsBase.setDefaultHeaders

#### Defined in

[packages/client-utils/src/client-utils.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L37)

## Properties

### apiBase

• **apiBase**: `string`

#### Inherited from

ClientUtilsBase.apiBase

___

### headers

▪ `Static` **headers**: `Headers` = `{}`

#### Inherited from

ClientUtilsBase.headers

#### Defined in

[packages/client-utils/src/client-utils.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/client-utils.ts#L12)

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

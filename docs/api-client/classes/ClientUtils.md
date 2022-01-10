[@scramjet/api-client](../README.md) / ClientUtils

# Class: ClientUtils

Provides HTTP communication methods.

## Implements

- [`HttpClient`](../interfaces/HttpClient.md)

## Table of contents

### Constructors

- [constructor](ClientUtils.md#constructor)

### Properties

- [apiBase](ClientUtils.md#apibase)
- [log](ClientUtils.md#log)

### Methods

- [addLogger](ClientUtils.md#addlogger)
- [delete](ClientUtils.md#delete)
- [get](ClientUtils.md#get)
- [getStream](ClientUtils.md#getstream)
- [post](ClientUtils.md#post)
- [safeRequest](ClientUtils.md#saferequest)
- [sendStream](ClientUtils.md#sendstream)

## Constructors

### constructor

• **new ClientUtils**(`apiBase`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |

#### Defined in

[packages/api-client/src/client-utils.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L15)

## Properties

### apiBase

• **apiBase**: `string` = `""`

#### Defined in

[packages/api-client/src/client-utils.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L11)

___

### log

• `Private` `Optional` **log**: [`RequestLogger`](../README.md#requestlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L13)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

Sets given logger.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `logger` | `Partial`<[`RequestLogger`](../README.md#requestlogger)\> | Logger to set. |

#### Returns

`void`

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[addLogger](../interfaces/HttpClient.md#addlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L24)

___

### delete

▸ **delete**(`url`): `Promise`<[`Response`](../README.md#response)\>

Performs DELETE request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Fetch response.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[delete](../interfaces/HttpClient.md#delete)

#### Defined in

[packages/api-client/src/client-utils.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L128)

___

### get

▸ **get**(`url`): `Promise`<[`Response`](../README.md#response)\>

Performs get request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Fetch response.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[get](../interfaces/HttpClient.md#get)

#### Defined in

[packages/api-client/src/client-utils.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L66)

___

### getStream

▸ **getStream**(`url`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

Performs get request for streamed data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

Fetch response.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[getStream](../interfaces/HttpClient.md#getstream)

#### Defined in

[packages/api-client/src/client-utils.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L77)

___

### post

▸ **post**(`url`, `data`, `headers?`, `config?`): `Promise`<[`Response`](../README.md#response)\>

Performs POST request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request URL. |
| `data` | `any` | Data to be send. |
| `headers` | `Headers` | Request headers. |
| `config` | `PostRequestConfig` | Request config. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Fetch response.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[post](../interfaces/HttpClient.md#post)

#### Defined in

[packages/api-client/src/client-utils.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L96)

___

### safeRequest

▸ `Private` **safeRequest**(...`args`): `Promise`<`Response`\>

Request wrapper.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...args` | [url: RequestInfo, init?: RequestInit] | Fetch arguments. |

#### Returns

`Promise`<`Response`\>

Fetch object.

#### Defined in

[packages/api-client/src/client-utils.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L39)

___

### sendStream

▸ **sendStream**(`url`, `stream`, `__namedParameters?`): `Promise`<[`Response`](../README.md#response)\>

Performs POST request for streamed data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | Request url. |
| `stream` | `string` \| `Stream` | to be send. |
| `__namedParameters` | `Partial`<`Object`\> | - |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Fetch response.

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[sendStream](../interfaces/HttpClient.md#sendstream)

#### Defined in

[packages/api-client/src/client-utils.ts:151](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L151)

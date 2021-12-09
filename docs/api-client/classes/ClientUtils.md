[@scramjet/api-client](../README.md) / ClientUtils

# Class: ClientUtils

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

[packages/api-client/src/client-utils.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L11)

## Properties

### apiBase

• **apiBase**: `string` = `""`

#### Defined in

[packages/api-client/src/client-utils.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L8)

___

### log

• `Private` `Optional` **log**: [`RequestLogger`](../README.md#requestlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L9)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | `Partial`<[`RequestLogger`](../README.md#requestlogger)\> |

#### Returns

`void`

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[addLogger](../interfaces/HttpClient.md#addlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L15)

___

### delete

▸ **delete**(`url`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[delete](../interfaces/HttpClient.md#delete)

#### Defined in

[packages/api-client/src/client-utils.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L86)

___

### get

▸ **get**(`url`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[get](../interfaces/HttpClient.md#get)

#### Defined in

[packages/api-client/src/client-utils.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L45)

___

### getStream

▸ **getStream**(`url`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[getStream](../interfaces/HttpClient.md#getstream)

#### Defined in

[packages/api-client/src/client-utils.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L50)

___

### post

▸ **post**(`url`, `data`, `headers?`, `config?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `headers` | `Headers` |
| `config` | `PostRequestConfig` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[post](../interfaces/HttpClient.md#post)

#### Defined in

[packages/api-client/src/client-utils.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L60)

___

### safeRequest

▸ `Private` **safeRequest**(...`args`): `Promise`<`Response`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | [url: RequestInfo, init?: RequestInit] |

#### Returns

`Promise`<`Response`\>

#### Defined in

[packages/api-client/src/client-utils.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L24)

___

### sendStream

▸ **sendStream**(`url`, `stream`, `__namedParameters?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `string` \| `Stream` |
| `__namedParameters` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[sendStream](../interfaces/HttpClient.md#sendstream)

#### Defined in

[packages/api-client/src/client-utils.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/client-utils.ts#L101)

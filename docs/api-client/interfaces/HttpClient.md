[@scramjet/api-client](../README.md) / [Exports](../modules.md) / HttpClient

# Interface: HttpClient

## Implemented by

- [`ClientUtils`](../classes/ClientUtils.md)

## Table of contents

### Methods

- [addLogger](HttpClient.md#addlogger)
- [delete](HttpClient.md#delete)
- [get](HttpClient.md#get)
- [getStream](HttpClient.md#getstream)
- [post](HttpClient.md#post)
- [sendStream](HttpClient.md#sendstream)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | [`RequestLogger`](../modules.md#requestlogger) |

#### Returns

`void`

#### Defined in

[packages/api-client/src/types/index.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L36)

___

### delete

▸ **delete**(`url`): `Promise`<[`Response`](../modules.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L40)

___

### get

▸ **get**(`url`): `Promise`<[`Response`](../modules.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L37)

___

### getStream

▸ **getStream**(`url`): `Promise`<[`ResponseStream`](../modules.md#responsestream)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`ResponseStream`](../modules.md#responsestream)\>

#### Defined in

[packages/api-client/src/types/index.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L38)

___

### post

▸ **post**(`url`, `data`, `headers?`, `options?`): `Promise`<[`Response`](../modules.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `headers?` | `Headers` |
| `options?` | { `json`: `boolean`  } & `PostRequestConfig` |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L39)

___

### sendStream

▸ **sendStream**(`url`, `stream`, `options?`): `Promise`<[`Response`](../modules.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `string` \| `Stream` |
| `options?` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L41)

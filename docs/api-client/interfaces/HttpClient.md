[@scramjet/client-utils](../README.md) / [Exports](../modules.md) / HttpClient

# Interface: HttpClient

Nodejs HttpClient interface.

## Hierarchy

- `HttpClient`

  ↳ **`HttpClient`**

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

#### Inherited from

HttpClient.addLogger

#### Defined in

[packages/client-utils/src/types/index.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L49)

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

HttpClient.delete

#### Defined in

[packages/client-utils/src/types/index.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L53)

___

### get

▸ **get**<`T`\>(`url`, `requestInit?`): `Promise`<`T`\>

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

HttpClient.get

#### Defined in

[packages/client-utils/src/types/index.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L50)

___

### getStream

▸ **getStream**(`url`, `requestInit?`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `requestInit?` | `RequestInit` |

#### Returns

`Promise`<`Readable`\>

#### Overrides

HttpClient.getStream

#### Defined in

[packages/client-utils/src/types/index.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L61)

___

### post

▸ **post**<`T`\>(`url`, `data`, `requestInit?`, `options?`): `Promise`<`T`\>

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
| `options?` | { `json`: `boolean`  } & `RequestConfig` |

#### Returns

`Promise`<`T`\>

#### Inherited from

HttpClient.post

#### Defined in

[packages/client-utils/src/types/index.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L52)

___

### sendStream

▸ **sendStream**<`T`\>(`url`, `stream`, `requestInit?`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `string` \| `Readable` |
| `requestInit?` | `RequestInit` |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `type`: `string`  }\> |

#### Returns

`Promise`<`T`\>

#### Overrides

HttpClient.sendStream

#### Defined in

[packages/client-utils/src/types/index.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L62)

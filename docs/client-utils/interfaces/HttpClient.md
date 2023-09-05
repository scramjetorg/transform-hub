[@scramjet/client-utils](../README.md) / [Exports](../modules.md) / HttpClient

# Interface: HttpClient

Nodejs HttpClient interface.

## Hierarchy

- `HttpClient`

  ↳ **`HttpClient`**

## Implemented by

- [`ClientUtils`](../classes/ClientUtils.md)
- [`ClientUtilsCustomAgent`](../classes/ClientUtilsCustomAgent.md)

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

[packages/client-utils/src/types/index.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L57)

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

[packages/client-utils/src/types/index.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L61)

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

[packages/client-utils/src/types/index.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L58)

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

[packages/client-utils/src/types/index.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L69)

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

[packages/client-utils/src/types/index.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L60)

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
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> |

#### Returns

`Promise`<`T`\>

#### Overrides

HttpClient.sendStream

#### Defined in

[packages/client-utils/src/types/index.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/client-utils/src/types/index.ts#L70)

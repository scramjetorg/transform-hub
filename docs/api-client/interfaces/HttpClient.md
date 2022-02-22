[@scramjet/api-client](../README.md) / [Exports](../modules.md) / HttpClient

# Interface: HttpClient

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

[types/index.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L26)

___

### delete

▸ **delete**(`url`): `Promise`<`Response`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<`Response`\>

#### Defined in

[types/index.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L30)

___

### get

▸ **get**<`T`\>(`url`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<`T`\>

#### Defined in

[types/index.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L27)

___

### getStream

▸ **getStream**(`url`): `Promise`<`Stream`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<`Stream`\>

#### Defined in

[types/index.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L28)

___

### post

▸ **post**<`T`\>(`url`, `data`, `headers?`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `headers?` | `Headers` |
| `options?` | { `json`: `boolean`  } & `PostRequestConfig` |

#### Returns

`Promise`<`T`\>

#### Defined in

[types/index.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L29)

___

### sendStream

▸ **sendStream**<`T`\>(`url`, `stream`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `string` \| `Stream` |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"json"`` \| ``"text"`` ; `type`: `string`  }\> |

#### Returns

`Promise`<`T`\>

#### Defined in

[types/index.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/types/index.ts#L31)

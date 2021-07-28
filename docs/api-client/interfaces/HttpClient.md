[@scramjet/api-client](../README.md) / HttpClient

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
| `logger` | [`RequestLogger`](../README.md#requestlogger) |

#### Returns

`void`

#### Defined in

[packages/api-client/src/types/index.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L30)

___

### delete

▸ **delete**(`url`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L34)

___

### get

▸ **get**(`url`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L31)

___

### getStream

▸ **getStream**(`url`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

#### Defined in

[packages/api-client/src/types/index.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L32)

___

### post

▸ **post**(`url`, `data`, `headers?`, `options?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `data` | `any` |
| `headers?` | `Headers` |
| `options?` | `Object` |
| `options.json` | `boolean` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L33)

___

### sendStream

▸ **sendStream**(`url`, `stream`, `options?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `stream` | `string` \| `Stream` |
| `options?` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/types/index.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/types/index.ts#L35)

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

[packages/api-client/src/client-utils.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L12)

## Properties

### apiBase

• **apiBase**: `string` = `""`

#### Defined in

[packages/api-client/src/client-utils.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L9)

___

### log

• `Private` `Optional` **log**: [`RequestLogger`](../README.md#requestlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L10)

## Methods

### addLogger

▸ **addLogger**(`logger`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `logger` | [`RequestLogger`](../README.md#requestlogger) |

#### Returns

`void`

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[addLogger](../interfaces/HttpClient.md#addlogger)

#### Defined in

[packages/api-client/src/client-utils.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L16)

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

[packages/api-client/src/client-utils.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L72)

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

[packages/api-client/src/client-utils.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L35)

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

[packages/api-client/src/client-utils.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L41)

___

### post

▸ **post**(`url`, `data`, `headers?`, `config?`): `Promise`<[`Response`](../README.md#response)\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `url` | `string` | `undefined` |
| `data` | `any` | `undefined` |
| `headers` | `Headers` | `{}` |
| `config` | `Object` | `undefined` |
| `config.json` | `boolean` | `false` |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Implementation of

[HttpClient](../interfaces/HttpClient.md).[post](../interfaces/HttpClient.md#post)

#### Defined in

[packages/api-client/src/client-utils.ts:53](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L53)

___

### safeRequest

▸ `Private` **safeRequest**(`_resp`): `Promise`<`Response`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_resp` | `Promise`<`Response`\> |

#### Returns

`Promise`<`Response`\>

#### Defined in

[packages/api-client/src/client-utils.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L20)

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

[packages/api-client/src/client-utils.ts:86](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-client/src/client-utils.ts#L86)

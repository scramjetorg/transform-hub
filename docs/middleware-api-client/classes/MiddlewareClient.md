[@scramjet/middleware-api-client](../README.md) / [Exports](../modules.md) / MiddlewareClient

# Class: MiddlewareClient

Middleware client.
Client for the Middleware interaction.

## Implements

- `ClientProvider`

## Table of contents

### Properties

- [apiBase](MiddlewareClient.md#apibase)
- [client](MiddlewareClient.md#client)

### Constructors

- [constructor](MiddlewareClient.md#constructor)

### Methods

- [createAccessKey](MiddlewareClient.md#createaccesskey)
- [getAuditStream](MiddlewareClient.md#getauditstream)
- [getManagerClient](MiddlewareClient.md#getmanagerclient)
- [getManagers](MiddlewareClient.md#getmanagers)
- [getVersion](MiddlewareClient.md#getversion)
- [listAccessKeys](MiddlewareClient.md#listaccesskeys)
- [revokeAccessKey](MiddlewareClient.md#revokeaccesskey)
- [revokeAllAccessKeys](MiddlewareClient.md#revokeallaccesskeys)

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[middleware-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L12)

___

### client

• **client**: `ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[middleware-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L13)

## Constructors

### constructor

• **new MiddlewareClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[middleware-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L15)

## Methods

### createAccessKey

▸ **createAccessKey**(`spaceId`, `opts`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |
| `opts` | `Object` |
| `opts.description?` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[middleware-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L65)

___

### getAuditStream

▸ **getAuditStream**(): `Promise`<`ReadableStream`<`any`\>\>

Requests API for version of various API components

#### Returns

`Promise`<`ReadableStream`<`any`\>\>

List of manager ids

#### Defined in

[middleware-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L55)

___

### getManagerClient

▸ **getManagerClient**(`id`, `mutliManagerApiBase?`): `ManagerClient`

Creates new ManagerClient with proper base api url setup

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `id` | `string` | `undefined` | Space ID used in apiBase url |
| `mutliManagerApiBase` | `string` | `"/api/v1"` | api/version prefix by default |

#### Returns

`ManagerClient`

ManagerClient for space management

#### Defined in

[middleware-client.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L28)

___

### getManagers

▸ **getManagers**(): `Promise`<`GetManagersResponse`\>

Requests API for the list of managers avaiable to the user

#### Returns

`Promise`<`GetManagersResponse`\>

List of manager ids

#### Defined in

[middleware-client.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L37)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Requests API for version of various API components

#### Returns

`Promise`<`GetVersionResponse`\>

List of manager ids

#### Defined in

[middleware-client.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L46)

___

### listAccessKeys

▸ **listAccessKeys**(`spaceId`): `Promise`<`GetAccessKeysResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |

#### Returns

`Promise`<`GetAccessKeysResponse`\>

#### Defined in

[middleware-client.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L59)

___

### revokeAccessKey

▸ **revokeAccessKey**(`spaceId`, `accessKey`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |
| `accessKey` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[middleware-client.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L74)

___

### revokeAllAccessKeys

▸ **revokeAllAccessKeys**(`spaceId`, `apiKeys`): `Promise`<{ `keysRevoked`: `number` ; `message`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |
| `apiKeys` | `GetAccessKeysResponse` |

#### Returns

`Promise`<{ `keysRevoked`: `number` ; `message`: `string`  }\>

#### Defined in

[middleware-client.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L82)

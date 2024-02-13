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

[middleware-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L11)

___

### client

• **client**: `ClientUtils`

#### Implementation of

ClientProvider.client

#### Defined in

[middleware-client.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L12)

## Constructors

### constructor

• **new MiddlewareClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[middleware-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L14)

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

[middleware-client.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L67)

___

### getAuditStream

▸ **getAuditStream**(): `Promise`<`ReadableStream`<`any`\>\>

Requests API for version of various API components

#### Returns

`Promise`<`ReadableStream`<`any`\>\>

List of manager ids

#### Defined in

[middleware-client.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L57)

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

[middleware-client.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L27)

___

### getManagers

▸ **getManagers**(): `Promise`<`GetManagersResponse`\>

Requests API for the list of managers avaiable to the user

#### Returns

`Promise`<`GetManagersResponse`\>

List of manager ids

#### Defined in

[middleware-client.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L39)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Requests API for version of various API components

#### Returns

`Promise`<`GetVersionResponse`\>

List of manager ids

#### Defined in

[middleware-client.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L48)

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

[middleware-client.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L61)

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

[middleware-client.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L76)

___

### revokeAllAccessKeys

▸ **revokeAllAccessKeys**(`spaceId`): `Promise`<{ `keysRevoked`: `number` ; `message`: `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |

#### Returns

`Promise`<{ `keysRevoked`: `number` ; `message`: `string`  }\>

#### Defined in

[middleware-client.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L85)

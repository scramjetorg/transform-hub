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

- [getAuditStream](MiddlewareClient.md#getauditstream)
- [getManagerClient](MiddlewareClient.md#getmanagerclient)
- [getManagers](MiddlewareClient.md#getmanagers)
- [getVersion](MiddlewareClient.md#getversion)

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

### getAuditStream

▸ **getAuditStream**(): `Promise`<`ReadableStream`<`any`\>\>

Requests API for version of various API components

#### Returns

`Promise`<`ReadableStream`<`any`\>\>

List of manager ids

#### Defined in

[middleware-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L54)

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

[middleware-client.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L36)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

Requests API for version of various API components

#### Returns

`Promise`<`GetVersionResponse`\>

List of manager ids

#### Defined in

[middleware-client.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/middleware-api-client/src/middleware-client.ts#L45)

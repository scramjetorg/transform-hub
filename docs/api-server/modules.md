[@scramjet/api-server](README.md) / Modules

# @scramjet/api-server

## Table of contents

### Type Aliases

- [CeroCode](modules.md#cerocode)
- [CeroConfig](modules.md#ceroconfig)
- [CeroDefaultRoute](modules.md#cerodefaultroute)
- [CeroErrorHandler](modules.md#ceroerrorhandler)
- [CeroMiddleware](modules.md#ceromiddleware)
- [CeroRouterConfig](modules.md#cerorouterconfig)
- [ServerConfig](modules.md#serverconfig)

### Classes

- [CeroError](classes/CeroError.md)
- [DuplexStream](classes/DuplexStream.md)
- [ServerConfiguration](classes/ServerConfiguration.md)

### Interfaces

- [CeroRouter](interfaces/CeroRouter.md)
- [SequentialCeroRouter](interfaces/SequentialCeroRouter.md)

### Functions

- [cero](modules.md#cero)
- [createServer](modules.md#createserver)
- [getRouter](modules.md#getrouter)
- [sequentialRouter](modules.md#sequentialrouter)

### Variables

- [logger](modules.md#logger)

## Type Aliases

### CeroCode

Ƭ **CeroCode**: keyof typeof `codelist`

#### Defined in

[packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**<`T`, `S`\>: `Partial`<{ `prioRequestsProcessing`: `boolean` ; `router`: `S` ; `server`: `T`  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Server` = `Server` |
| `S` | extends [`CeroRouter`](interfaces/CeroRouter.md) = [`CeroRouter`](interfaces/CeroRouter.md) |

#### Defined in

[packages/api-server/src/lib/definitions.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L15)

___

### CeroDefaultRoute

Ƭ **CeroDefaultRoute**: `Middleware`

#### Defined in

[packages/api-server/src/lib/definitions.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L6)

___

### CeroErrorHandler

Ƭ **CeroErrorHandler**: (`err`: [`CeroError`](classes/CeroError.md), `req`: `IncomingMessage`, `res`: `ServerResponse`) => `void`

#### Type declaration

▸ (`err`, `req`, `res`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | [`CeroError`](classes/CeroError.md) |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |

##### Returns

`void`

#### Defined in

[packages/api-server/src/lib/definitions.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L64)

___

### CeroMiddleware

Ƭ **CeroMiddleware**: `Middleware`

#### Defined in

[packages/api-server/src/lib/definitions.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L5)

___

### CeroRouterConfig

Ƭ **CeroRouterConfig**: `Partial`<{ `cacheSize`: `number` ; `defaultRoute`: [`CeroDefaultRoute`](modules.md#cerodefaultroute) ; `errorHandler`: [`CeroErrorHandler`](modules.md#ceroerrorhandler) ; `id`: `string`  }\>

#### Defined in

[packages/api-server/src/lib/definitions.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L66)

___

### ServerConfig

Ƭ **ServerConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `router?` | [`CeroRouter`](interfaces/CeroRouter.md) |
| `server?` | `HttpsServer` \| `HttpServer` |
| `sslCertPath?` | `string` |
| `sslKeyPath?` | `string` |
| `verbose?` | `boolean` |

#### Defined in

[packages/api-server/src/types/ServerConfig.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/types/ServerConfig.ts#L5)

## Functions

### cero

▸ **cero**<`T`, `S`\>(`config?`): `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Server`<`T`\> = `Server` |
| `S` | extends [`CeroRouter`](interfaces/CeroRouter.md)<`S`\> = [`CeroRouter`](interfaces/CeroRouter.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | `Partial`<{ `prioRequestsProcessing`: `boolean` ; `router`: `S` ; `server`: `T`  }\> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `router` | `S` |
| `server` | `T` |

#### Defined in

[packages/api-server/src/lib/0http.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/0http.ts#L7)

___

### createServer

▸ **createServer**(`conf?`): `APIExpose`

#### Parameters

| Name | Type |
| :------ | :------ |
| `conf` | [`ServerConfig`](modules.md#serverconfig) |

#### Returns

`APIExpose`

#### Defined in

[packages/api-server/src/index.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L85)

___

### getRouter

▸ **getRouter**(): `APIRoute`

#### Returns

`APIRoute`

#### Defined in

[packages/api-server/src/index.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L67)

___

### sequentialRouter

▸ **sequentialRouter**(`config`): [`SequentialCeroRouter`](interfaces/SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Partial`<{ `cacheSize`: `number` ; `defaultRoute`: `Middleware` ; `errorHandler`: [`CeroErrorHandler`](modules.md#ceroerrorhandler) ; `id`: `string`  }\> |

#### Returns

[`SequentialCeroRouter`](interfaces/SequentialCeroRouter.md)

#### Defined in

[packages/api-server/src/lib/0http.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/0http.ts#L6)

## Variables

### logger

• `Const` **logger**: `ObjLogger`

#### Defined in

[packages/api-server/src/index.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L18)

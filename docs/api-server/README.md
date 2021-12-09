@scramjet/api-server

# @scramjet/api-server

## Table of contents

### Classes

- [CeroError](classes/CeroError.md)
- [DuplexStream](classes/DuplexStream.md)

### Interfaces

- [CeroRouter](interfaces/CeroRouter.md)
- [SequentialCeroRouter](interfaces/SequentialCeroRouter.md)

### Type aliases

- [CeroCode](README.md#cerocode)
- [CeroConfig](README.md#ceroconfig)
- [CeroDefaultRoute](README.md#cerodefaultroute)
- [CeroErrorHandler](README.md#ceroerrorhandler)
- [CeroMiddleware](README.md#ceromiddleware)
- [CeroRouterConfig](README.md#cerorouterconfig)
- [ServerConfig](README.md#serverconfig)

### Functions

- [cero](README.md#cero)
- [createServer](README.md#createserver)
- [getRouter](README.md#getrouter)
- [sequentialRouter](README.md#sequentialrouter)

## Type aliases

### CeroCode

Ƭ **CeroCode**: keyof typeof `codelist`

#### Defined in

[packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**<`T`, `S`\>: `Partial`<`Object`\>

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

Ƭ **CeroRouterConfig**: `Partial`<`Object`\>

#### Defined in

[packages/api-server/src/lib/definitions.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L66)

___

### ServerConfig

Ƭ **ServerConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `router?` | [`CeroRouter`](interfaces/CeroRouter.md) |
| `server?` | `Server` |
| `verbose?` | `boolean` |

#### Defined in

[packages/api-server/src/index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L11)

## Functions

### cero

▸ `Const` **cero**<`T`, `S`\>(`config?`): `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Server`<`T`\> = `Server` |
| `S` | extends [`CeroRouter`](interfaces/CeroRouter.md)<`S`\> = [`CeroRouter`](interfaces/CeroRouter.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | `Partial`<`Object`\> |

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
| `conf` | [`ServerConfig`](README.md#serverconfig) |

#### Returns

`APIExpose`

#### Defined in

[packages/api-server/src/index.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L49)

___

### getRouter

▸ **getRouter**(): `APIRoute`

#### Returns

`APIRoute`

#### Defined in

[packages/api-server/src/index.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L31)

___

### sequentialRouter

▸ `Const` **sequentialRouter**(`config`): [`SequentialCeroRouter`](interfaces/SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Partial`<`Object`\> |

#### Returns

[`SequentialCeroRouter`](interfaces/SequentialCeroRouter.md)

#### Defined in

[packages/api-server/src/lib/0http.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/0http.ts#L6)

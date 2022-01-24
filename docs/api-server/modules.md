[@scramjet/api-server](README.md) / Modules

# @scramjet/api-server

## Table of contents

### Type aliases

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

### Interfaces

- [CeroRouter](interfaces/CeroRouter.md)
- [SequentialCeroRouter](interfaces/SequentialCeroRouter.md)

### Functions

- [cero](modules.md#cero)
- [createServer](modules.md#createserver)
- [getRouter](modules.md#getrouter)
- [sequentialRouter](modules.md#sequentialrouter)

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
| `conf` | [`ServerConfig`](modules.md#serverconfig) |

#### Returns

`APIExpose`

#### Defined in

[packages/api-server/src/index.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L66)

___

### getRouter

▸ **getRouter**(): `APIRoute`

#### Returns

`APIRoute`

#### Defined in

[packages/api-server/src/index.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L48)

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

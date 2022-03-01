[@scramjet/api-server](README.md) / Modules

# @scramjet/api-server

## Table of contents

### Type aliases

- [CeroCode](undefined)
- [CeroConfig](undefined)
- [CeroDefaultRoute](undefined)
- [CeroErrorHandler](undefined)
- [CeroMiddleware](undefined)
- [CeroRouterConfig](undefined)
- [ServerConfig](undefined)

### Classes

- [CeroError](undefined)
- [DuplexStream](undefined)

### Interfaces

- [CeroRouter](undefined)
- [SequentialCeroRouter](undefined)

### Functions

- [cero](undefined)
- [createServer](undefined)
- [getRouter](undefined)
- [sequentialRouter](undefined)

## Type aliases

### CeroCode

Ƭ **CeroCode**: keyof typeof codelist

#### Defined in

[packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**: Partial<Object\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends Server = Server |
| `S` | extends CeroRouter = CeroRouter |

#### Defined in

[packages/api-server/src/lib/definitions.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L15)

___

### CeroDefaultRoute

Ƭ **CeroDefaultRoute**: Middleware

#### Defined in

[packages/api-server/src/lib/definitions.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L6)

___

### CeroErrorHandler

Ƭ **CeroErrorHandler**: Function

#### Type declaration

▸ (`err`, `req`, `res`): void

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | CeroError |
| `req` | IncomingMessage |
| `res` | ServerResponse |

##### Returns

void

#### Defined in

[packages/api-server/src/lib/definitions.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L64)

___

### CeroMiddleware

Ƭ **CeroMiddleware**: Middleware

#### Defined in

[packages/api-server/src/lib/definitions.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L5)

___

### CeroRouterConfig

Ƭ **CeroRouterConfig**: Partial<Object\>

#### Defined in

[packages/api-server/src/lib/definitions.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L66)

___

### ServerConfig

Ƭ **ServerConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `router?` | CeroRouter |
| `server?` | HttpsServer \| HttpServer |
| `sslCertPath?` | string |
| `sslKeyPath?` | string |
| `verbose?` | boolean |

#### Defined in

[packages/api-server/src/index.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L12)

## Classes

### CeroError

• **CeroError**: Class CeroError

#### Defined in

[packages/api-server/src/lib/definitions.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L37)

___

### DuplexStream

• **DuplexStream**: Class DuplexStream

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L3)

## Interfaces

### CeroRouter

• **CeroRouter**: Interface CeroRouter

#### Defined in

[packages/api-server/src/lib/definitions.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L8)

___

### SequentialCeroRouter

• **SequentialCeroRouter**: Interface SequentialCeroRouter

#### Defined in

[packages/api-server/src/lib/definitions.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L13)

## Functions

### cero

▸ **cero**<`T`, `S`\>(`config?`): Object

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends Server<T\> = Server |
| `S` | extends CeroRouter<S\> = CeroRouter |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | Partial<Object\> |

#### Returns

Object

| Name | Type |
| :------ | :------ |
| `router` | S |
| `server` | T |

#### Defined in

[packages/api-server/src/lib/0http.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/0http.ts#L7)

___

### createServer

▸ **createServer**(`conf?`): APIExpose

#### Parameters

| Name | Type |
| :------ | :------ |
| `conf` | ServerConfig |

#### Returns

APIExpose

#### Defined in

[packages/api-server/src/index.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L87)

___

### getRouter

▸ **getRouter**(): APIRoute

#### Returns

APIRoute

#### Defined in

[packages/api-server/src/index.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/index.ts#L69)

___

### sequentialRouter

▸ **sequentialRouter**(`config`): SequentialCeroRouter

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | Partial<Object\> |

#### Returns

SequentialCeroRouter

#### Defined in

[packages/api-server/src/lib/0http.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/0http.ts#L6)

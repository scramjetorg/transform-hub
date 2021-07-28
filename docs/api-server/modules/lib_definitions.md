[@scramjet/api-server](../README.md) / lib/definitions

# Module: lib/definitions

## Table of contents

### Classes

- [CeroError](../classes/lib_definitions.CeroError.md)

### Interfaces

- [CeroRouter](../interfaces/lib_definitions.CeroRouter.md)
- [SequentialCeroRouter](../interfaces/lib_definitions.SequentialCeroRouter.md)

### Type aliases

- [CeroCode](lib_definitions.md#cerocode)
- [CeroConfig](lib_definitions.md#ceroconfig)
- [CeroDefaultRoute](lib_definitions.md#cerodefaultroute)
- [CeroErrorHandler](lib_definitions.md#ceroerrorhandler)
- [CeroMiddleware](lib_definitions.md#ceromiddleware)
- [CeroRouterConfig](lib_definitions.md#cerorouterconfig)

## Type aliases

### CeroCode

Ƭ **CeroCode**: keyof typeof `codelist`

#### Defined in

[packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**<`T`, `S`\>: `Partial`<`Object`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Server``Server` |
| `S` | extends [`CeroRouter`](../interfaces/lib_definitions.CeroRouter.md)[`CeroRouter`](../interfaces/lib_definitions.CeroRouter.md) |

#### Defined in

[packages/api-server/src/lib/definitions.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L15)

___

### CeroDefaultRoute

Ƭ **CeroDefaultRoute**: `Middleware`

#### Defined in

[packages/api-server/src/lib/definitions.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L6)

___

### CeroErrorHandler

Ƭ **CeroErrorHandler**: (`err`: [`CeroError`](../classes/lib_definitions.CeroError.md), `req`: `IncomingMessage`, `res`: `ServerResponse`) => `void`

#### Type declaration

▸ (`err`, `req`, `res`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | [`CeroError`](../classes/lib_definitions.CeroError.md) |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |

##### Returns

`void`

#### Defined in

[packages/api-server/src/lib/definitions.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L65)

___

### CeroMiddleware

Ƭ **CeroMiddleware**: `Middleware`

#### Defined in

[packages/api-server/src/lib/definitions.ts:5](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L5)

___

### CeroRouterConfig

Ƭ **CeroRouterConfig**: `Partial`<`Object`\>

#### Defined in

[packages/api-server/src/lib/definitions.ts:67](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L67)

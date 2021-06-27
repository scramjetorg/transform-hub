[@scramjet/api-server](../README.md) / lib/definitions

# Module: lib/definitions

## Table of contents

### Classes

- [CeroError](../classes/lib_definitions.ceroerror.md)

### Interfaces

- [CeroRouter](../interfaces/lib_definitions.cerorouter.md)
- [SequentialCeroRouter](../interfaces/lib_definitions.sequentialcerorouter.md)

### Type aliases

- [CeroCode](lib_definitions.md#cerocode)
- [CeroConfig](lib_definitions.md#ceroconfig)
- [CeroDefaultRoute](lib_definitions.md#cerodefaultroute)
- [CeroErrorHandler](lib_definitions.md#ceroerrorhandler)
- [CeroMiddleware](lib_definitions.md#ceromiddleware)
- [CeroRouterConfig](lib_definitions.md#cerorouterconfig)

## Type aliases

### CeroCode

Ƭ **CeroCode**: keyof *typeof* codelist

Defined in: [packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**<T, S\>: *Partial*<{ `prioRequestsProcessing`: *boolean* ; `router`: S ; `server`: T  }\>

#### Type parameters

| Name | Type | Default |
| :------ | :------ | :------ |
| `T` | Server | Server |
| `S` | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md) | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md) |

Defined in: [packages/api-server/src/lib/definitions.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L15)

___

### CeroDefaultRoute

Ƭ **CeroDefaultRoute**: Middleware

Defined in: [packages/api-server/src/lib/definitions.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L6)

___

### CeroErrorHandler

Ƭ **CeroErrorHandler**: (`err`: [*CeroError*](../classes/lib_definitions.ceroerror.md), `req`: IncomingMessage, `res`: ServerResponse) => *void*

#### Type declaration

▸ (`err`: [*CeroError*](../classes/lib_definitions.ceroerror.md), `req`: IncomingMessage, `res`: ServerResponse): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | [*CeroError*](../classes/lib_definitions.ceroerror.md) |
| `req` | IncomingMessage |
| `res` | ServerResponse |

**Returns:** *void*

Defined in: [packages/api-server/src/lib/definitions.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L65)

___

### CeroMiddleware

Ƭ **CeroMiddleware**: Middleware

Defined in: [packages/api-server/src/lib/definitions.ts:5](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L5)

___

### CeroRouterConfig

Ƭ **CeroRouterConfig**: *Partial*<{ `cacheSize`: *number* ; `defaultRoute`: [*CeroDefaultRoute*](lib_definitions.md#cerodefaultroute) ; `errorHandler`: [*CeroErrorHandler*](lib_definitions.md#ceroerrorhandler) ; `id`: *string*  }\>

Defined in: [packages/api-server/src/lib/definitions.ts:67](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L67)

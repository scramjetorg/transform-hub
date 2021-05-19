[@scramjet/api-server](../README.md) / index

# Module: index

## Table of contents

### Classes

- [CeroError](../classes/index.ceroerror.md)

### Interfaces

- [CeroRouter](../interfaces/index.cerorouter.md)
- [SequentialCeroRouter](../interfaces/index.sequentialcerorouter.md)

### Type aliases

- [CeroCode](index.md#cerocode)
- [CeroConfig](index.md#ceroconfig)
- [CeroDefaultRoute](index.md#cerodefaultroute)
- [CeroErrorHandler](index.md#ceroerrorhandler)
- [CeroMiddleware](index.md#ceromiddleware)
- [CeroRouterConfig](index.md#cerorouterconfig)

### Functions

- [createServer](index.md#createserver)
- [getRouter](index.md#getrouter)

## Type aliases

### CeroCode

Ƭ **CeroCode**: keyof *typeof* codelist

Defined in: [packages/api-server/src/lib/definitions.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L35)

___

### CeroConfig

Ƭ **CeroConfig**<T, S\>: *Partial*<{ `prioRequestsProcessing`: *boolean* ; `router`: S ; `server`: T  }\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`T` | Server | Server |
`S` | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md) | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md) |

Defined in: [packages/api-server/src/lib/definitions.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L15)

___

### CeroDefaultRoute

Ƭ **CeroDefaultRoute**: Middleware

Defined in: [packages/api-server/src/lib/definitions.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L6)

___

### CeroErrorHandler

Ƭ **CeroErrorHandler**: (`err`: [*CeroError*](../classes/lib_definitions.ceroerror.md), `req`: IncomingMessage, `res`: ServerResponse) => *void*

Defined in: [packages/api-server/src/lib/definitions.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L65)

___

### CeroMiddleware

Ƭ **CeroMiddleware**: Middleware

Defined in: [packages/api-server/src/lib/definitions.ts:5](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L5)

___

### CeroRouterConfig

Ƭ **CeroRouterConfig**: *Partial*<{ `cacheSize`: *number* ; `defaultRoute`: [*CeroDefaultRoute*](lib_definitions.md#cerodefaultroute) ; `errorHandler`: [*CeroErrorHandler*](lib_definitions.md#ceroerrorhandler) ; `id`: *string*  }\>

Defined in: [packages/api-server/src/lib/definitions.ts:67](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L67)

## Functions

### createServer

▸ **createServer**(`conf?`: ServerConfig): APIExpose

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`conf` | ServerConfig | ... |

**Returns:** APIExpose

Defined in: [packages/api-server/src/index.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/index.ts#L30)

___

### getRouter

▸ **getRouter**(): APIRoute

**Returns:** APIRoute

Defined in: [packages/api-server/src/index.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/index.ts#L15)

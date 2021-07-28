[@scramjet/api-server](../README.md) / index

# Module: index

## Table of contents

### References

- [CeroCode](index.md#cerocode)
- [CeroConfig](index.md#ceroconfig)
- [CeroDefaultRoute](index.md#cerodefaultroute)
- [CeroError](index.md#ceroerror)
- [CeroErrorHandler](index.md#ceroerrorhandler)
- [CeroMiddleware](index.md#ceromiddleware)
- [CeroRouter](index.md#cerorouter)
- [CeroRouterConfig](index.md#cerorouterconfig)
- [DuplexStream](index.md#duplexstream)
- [SequentialCeroRouter](index.md#sequentialcerorouter)
- [cero](index.md#cero)
- [sequentialRouter](index.md#sequentialrouter)

### Type aliases

- [ServerConfig](index.md#serverconfig)

### Functions

- [createServer](index.md#createserver)
- [getRouter](index.md#getrouter)

## References

### CeroCode

Re-exports: [CeroCode](lib_definitions.md#cerocode)

___

### CeroConfig

Re-exports: [CeroConfig](lib_definitions.md#ceroconfig)

___

### CeroDefaultRoute

Re-exports: [CeroDefaultRoute](lib_definitions.md#cerodefaultroute)

___

### CeroError

Re-exports: [CeroError](../classes/lib_definitions.CeroError.md)

___

### CeroErrorHandler

Re-exports: [CeroErrorHandler](lib_definitions.md#ceroerrorhandler)

___

### CeroMiddleware

Re-exports: [CeroMiddleware](lib_definitions.md#ceromiddleware)

___

### CeroRouter

Re-exports: [CeroRouter](../interfaces/lib_definitions.CeroRouter.md)

___

### CeroRouterConfig

Re-exports: [CeroRouterConfig](lib_definitions.md#cerorouterconfig)

___

### DuplexStream

Re-exports: [DuplexStream](../classes/lib_duplex_stream.DuplexStream.md)

___

### SequentialCeroRouter

Re-exports: [SequentialCeroRouter](../interfaces/lib_definitions.SequentialCeroRouter.md)

___

### cero

Re-exports: [cero](lib_0http.md#cero)

___

### sequentialRouter

Re-exports: [sequentialRouter](lib_0http.md#sequentialrouter)

## Type aliases

### ServerConfig

Ƭ **ServerConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `router?` | [`CeroRouter`](../interfaces/lib_definitions.CeroRouter.md) |
| `server?` | `Server` |
| `verbose?` | `boolean` |

#### Defined in

[packages/api-server/src/index.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/index.ts#L10)

## Functions

### createServer

▸ **createServer**(`conf?`): `APIExpose`

#### Parameters

| Name | Type |
| :------ | :------ |
| `conf` | [`ServerConfig`](index.md#serverconfig) |

#### Returns

`APIExpose`

#### Defined in

[packages/api-server/src/index.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/index.ts#L34)

___

### getRouter

▸ **getRouter**(): `APIRoute`

#### Returns

`APIRoute`

#### Defined in

[packages/api-server/src/index.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/index.ts#L18)

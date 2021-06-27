[@scramjet/api-server](../README.md) / lib/0http

# Module: lib/0http

## Table of contents

### Functions

- [cero](lib_0http.md#cero)
- [sequentialRouter](lib_0http.md#sequentialrouter)

## Functions

### cero

▸ `Const` **cero**<T, S\>(`config?`: *Partial*<{ `prioRequestsProcessing`: *boolean* ; `router`: S ; `server`: T  }\>): *object*

#### Type parameters

| Name | Type | Default |
| :------ | :------ | :------ |
| `T` | *Server*<T\> | *Server* |
| `S` | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md)<S\> | [*CeroRouter*](../interfaces/lib_definitions.cerorouter.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | *Partial*<{ `prioRequestsProcessing`: *boolean* ; `router`: S ; `server`: T  }\> |

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `router` | S |
| `server` | T |

Defined in: [packages/api-server/src/lib/0http.ts:7](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/api-server/src/lib/0http.ts#L7)

___

### sequentialRouter

▸ `Const` **sequentialRouter**(`config`: *Partial*<{ `cacheSize`: *number* ; `defaultRoute`: Middleware ; `errorHandler`: [*CeroErrorHandler*](lib_definitions.md#ceroerrorhandler) ; `id`: *string*  }\>): [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | *Partial*<{ `cacheSize`: *number* ; `defaultRoute`: Middleware ; `errorHandler`: [*CeroErrorHandler*](lib_definitions.md#ceroerrorhandler) ; `id`: *string*  }\> |

**Returns:** [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md)

Defined in: [packages/api-server/src/lib/0http.ts:6](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/api-server/src/lib/0http.ts#L6)

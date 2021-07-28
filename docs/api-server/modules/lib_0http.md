[@scramjet/api-server](../README.md) / lib/0http

# Module: lib/0http

## Table of contents

### Functions

- [cero](lib_0http.md#cero)
- [sequentialRouter](lib_0http.md#sequentialrouter)

## Functions

### cero

▸ `Const` **cero**<`T`, `S`\>(`config?`): `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Server`<`T`\>`Server` |
| `S` | extends [`CeroRouter`](../interfaces/lib_definitions.CeroRouter.md)<`S`\>[`CeroRouter`](../interfaces/lib_definitions.CeroRouter.md) |

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

[packages/api-server/src/lib/0http.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/0http.ts#L7)

___

### sequentialRouter

▸ `Const` **sequentialRouter**(`config`): [`SequentialCeroRouter`](../interfaces/lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Partial`<`Object`\> |

#### Returns

[`SequentialCeroRouter`](../interfaces/lib_definitions.SequentialCeroRouter.md)

#### Defined in

[packages/api-server/src/lib/0http.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/0http.ts#L6)

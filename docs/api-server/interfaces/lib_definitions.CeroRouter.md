[@scramjet/api-server](../README.md) / [lib/definitions](../modules/lib_definitions.md) / CeroRouter

# Interface: CeroRouter

[lib/definitions](../modules/lib_definitions.md).CeroRouter

## Hierarchy

- `TRouter`<[`CeroMiddleware`](../modules/lib_definitions.md#ceromiddleware)\>

  ↳ **`CeroRouter`**

  ↳↳ [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

## Table of contents

### Methods

- [add](lib_definitions.CeroRouter.md#add)
- [all](lib_definitions.CeroRouter.md#all)
- [connect](lib_definitions.CeroRouter.md#connect)
- [delete](lib_definitions.CeroRouter.md#delete)
- [find](lib_definitions.CeroRouter.md#find)
- [get](lib_definitions.CeroRouter.md#get)
- [head](lib_definitions.CeroRouter.md#head)
- [lookup](lib_definitions.CeroRouter.md#lookup)
- [options](lib_definitions.CeroRouter.md#options)
- [patch](lib_definitions.CeroRouter.md#patch)
- [post](lib_definitions.CeroRouter.md#post)
- [put](lib_definitions.CeroRouter.md#put)
- [trace](lib_definitions.CeroRouter.md#trace)
- [use](lib_definitions.CeroRouter.md#use)

## Methods

### add

▸ **add**(`method`, `pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `Methods` |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.add

#### Defined in

node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.all

#### Defined in

node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.connect

#### Defined in

node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.delete

#### Defined in

node_modules/trouter/index.d.ts:22

___

### find

▸ **find**(`method`, `url`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `Methods` |
| `url` | `string` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `handlers` | `Middleware`[] |
| `params` | `Record`<`string`, `string`\> |

#### Inherited from

TRouter.find

#### Defined in

node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.get

#### Defined in

node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.head

#### Defined in

node_modules/trouter/index.d.ts:18

___

### lookup

▸ **lookup**(`req`, `res`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |
| `next` | `NextCallback` |

#### Returns

`void`

#### Defined in

[packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.options

#### Defined in

node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.patch

#### Defined in

node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.post

#### Defined in

node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.put

#### Defined in

node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`, ...`handlers`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Inherited from

TRouter.trace

#### Defined in

node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`, ...`middlewares`): [`CeroRouter`](lib_definitions.CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | `Middleware`[] |

#### Returns

[`CeroRouter`](lib_definitions.CeroRouter.md)

#### Overrides

TRouter.use

#### Defined in

[packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/definitions.ts#L9)

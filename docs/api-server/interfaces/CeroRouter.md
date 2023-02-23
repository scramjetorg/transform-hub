[@scramjet/api-server](../README.md) / [Modules](../modules.md) / CeroRouter

# Interface: CeroRouter

## Hierarchy

- `default`<[`CeroMiddleware`](../modules.md#ceromiddleware)\>

  ↳ **`CeroRouter`**

  ↳↳ [`SequentialCeroRouter`](SequentialCeroRouter.md)

## Table of contents

### Methods

- [add](CeroRouter.md#add)
- [all](CeroRouter.md#all)
- [connect](CeroRouter.md#connect)
- [delete](CeroRouter.md#delete)
- [find](CeroRouter.md#find)
- [get](CeroRouter.md#get)
- [head](CeroRouter.md#head)
- [lookup](CeroRouter.md#lookup)
- [options](CeroRouter.md#options)
- [patch](CeroRouter.md#patch)
- [post](CeroRouter.md#post)
- [put](CeroRouter.md#put)
- [trace](CeroRouter.md#trace)
- [use](CeroRouter.md#use)

## Methods

### add

▸ **add**(`method`, `pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `Methods` |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.add

#### Defined in

node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.all

#### Defined in

node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.connect

#### Defined in

node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

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

▸ **get**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.get

#### Defined in

node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

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

[packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.options

#### Defined in

node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.patch

#### Defined in

node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.post

#### Defined in

node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.put

#### Defined in

node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`, `...handlers`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Inherited from

TRouter.trace

#### Defined in

node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`, `...middlewares`): [`CeroRouter`](CeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | `Middleware`[] |

#### Returns

[`CeroRouter`](CeroRouter.md)

#### Overrides

TRouter.use

#### Defined in

[packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L9)

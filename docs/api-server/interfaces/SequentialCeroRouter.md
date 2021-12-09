[@scramjet/api-server](../README.md) / SequentialCeroRouter

# Interface: SequentialCeroRouter

## Hierarchy

- [`CeroRouter`](CeroRouter.md)

  ↳ **`SequentialCeroRouter`**

## Table of contents

### Methods

- [add](SequentialCeroRouter.md#add)
- [all](SequentialCeroRouter.md#all)
- [connect](SequentialCeroRouter.md#connect)
- [delete](SequentialCeroRouter.md#delete)
- [find](SequentialCeroRouter.md#find)
- [get](SequentialCeroRouter.md#get)
- [head](SequentialCeroRouter.md#head)
- [lookup](SequentialCeroRouter.md#lookup)
- [options](SequentialCeroRouter.md#options)
- [patch](SequentialCeroRouter.md#patch)
- [post](SequentialCeroRouter.md#post)
- [put](SequentialCeroRouter.md#put)
- [trace](SequentialCeroRouter.md#trace)
- [use](SequentialCeroRouter.md#use)

## Methods

### add

▸ **add**(`method`, `pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `Methods` |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[add](CeroRouter.md#add)

#### Defined in

node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[all](CeroRouter.md#all)

#### Defined in

node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[connect](CeroRouter.md#connect)

#### Defined in

node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[delete](CeroRouter.md#delete)

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

[CeroRouter](CeroRouter.md).[find](CeroRouter.md#find)

#### Defined in

node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[get](CeroRouter.md#get)

#### Defined in

node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[head](CeroRouter.md#head)

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

#### Inherited from

[CeroRouter](CeroRouter.md).[lookup](CeroRouter.md#lookup)

#### Defined in

[packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[options](CeroRouter.md#options)

#### Defined in

node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[patch](CeroRouter.md#patch)

#### Defined in

node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[post](CeroRouter.md#post)

#### Defined in

node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[put](CeroRouter.md#put)

#### Defined in

node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[trace](CeroRouter.md#trace)

#### Defined in

node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`, ...`middlewares`): [`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](CeroRouter.md).[use](CeroRouter.md#use)

#### Defined in

[packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/definitions.ts#L9)

[@scramjet/api-server](../README.md) / [lib/definitions](../modules/lib_definitions.md) / SequentialCeroRouter

# Interface: SequentialCeroRouter

[lib/definitions](../modules/lib_definitions.md).SequentialCeroRouter

## Hierarchy

- [`CeroRouter`](lib_definitions.CeroRouter.md)

  ↳ **`SequentialCeroRouter`**

## Table of contents

### Methods

- [add](lib_definitions.SequentialCeroRouter.md#add)
- [all](lib_definitions.SequentialCeroRouter.md#all)
- [connect](lib_definitions.SequentialCeroRouter.md#connect)
- [delete](lib_definitions.SequentialCeroRouter.md#delete)
- [find](lib_definitions.SequentialCeroRouter.md#find)
- [get](lib_definitions.SequentialCeroRouter.md#get)
- [head](lib_definitions.SequentialCeroRouter.md#head)
- [lookup](lib_definitions.SequentialCeroRouter.md#lookup)
- [options](lib_definitions.SequentialCeroRouter.md#options)
- [patch](lib_definitions.SequentialCeroRouter.md#patch)
- [post](lib_definitions.SequentialCeroRouter.md#post)
- [put](lib_definitions.SequentialCeroRouter.md#put)
- [trace](lib_definitions.SequentialCeroRouter.md#trace)
- [use](lib_definitions.SequentialCeroRouter.md#use)

## Methods

### add

▸ **add**(`method`, `pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `Methods` |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[add](lib_definitions.CeroRouter.md#add)

#### Defined in

node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[all](lib_definitions.CeroRouter.md#all)

#### Defined in

node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[connect](lib_definitions.CeroRouter.md#connect)

#### Defined in

node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[delete](lib_definitions.CeroRouter.md#delete)

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

[CeroRouter](lib_definitions.CeroRouter.md).[find](lib_definitions.CeroRouter.md#find)

#### Defined in

node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[get](lib_definitions.CeroRouter.md#get)

#### Defined in

node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[head](lib_definitions.CeroRouter.md#head)

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

[CeroRouter](lib_definitions.CeroRouter.md).[lookup](lib_definitions.CeroRouter.md#lookup)

#### Defined in

[packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[options](lib_definitions.CeroRouter.md#options)

#### Defined in

node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[patch](lib_definitions.CeroRouter.md#patch)

#### Defined in

node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[post](lib_definitions.CeroRouter.md#post)

#### Defined in

node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[put](lib_definitions.CeroRouter.md#put)

#### Defined in

node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`, ...`handlers`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | `Pattern` |
| `...handlers` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[trace](lib_definitions.CeroRouter.md#trace)

#### Defined in

node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`, ...`middlewares`): [`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | `Middleware`[] |

#### Returns

[`SequentialCeroRouter`](lib_definitions.SequentialCeroRouter.md)

#### Inherited from

[CeroRouter](lib_definitions.CeroRouter.md).[use](lib_definitions.CeroRouter.md#use)

#### Defined in

[packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/definitions.ts#L9)

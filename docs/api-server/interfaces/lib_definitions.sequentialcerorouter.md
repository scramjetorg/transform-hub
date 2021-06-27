[@scramjet/api-server](../README.md) / [lib/definitions](../modules/lib_definitions.md) / SequentialCeroRouter

# Interface: SequentialCeroRouter

[lib/definitions](../modules/lib_definitions.md).SequentialCeroRouter

## Hierarchy

- [*CeroRouter*](lib_definitions.cerorouter.md)

  ↳ **SequentialCeroRouter**

## Table of contents

### Methods

- [add](lib_definitions.sequentialcerorouter.md#add)
- [all](lib_definitions.sequentialcerorouter.md#all)
- [connect](lib_definitions.sequentialcerorouter.md#connect)
- [delete](lib_definitions.sequentialcerorouter.md#delete)
- [find](lib_definitions.sequentialcerorouter.md#find)
- [get](lib_definitions.sequentialcerorouter.md#get)
- [head](lib_definitions.sequentialcerorouter.md#head)
- [lookup](lib_definitions.sequentialcerorouter.md#lookup)
- [options](lib_definitions.sequentialcerorouter.md#options)
- [patch](lib_definitions.sequentialcerorouter.md#patch)
- [post](lib_definitions.sequentialcerorouter.md#post)
- [put](lib_definitions.sequentialcerorouter.md#put)
- [trace](lib_definitions.sequentialcerorouter.md#trace)
- [use](lib_definitions.sequentialcerorouter.md#use)

## Methods

### add

▸ **add**(`method`: Methods, `pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | Methods |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:22

___

### find

▸ **find**(`method`: Methods, `url`: *string*): *object*

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | Methods |
| `url` | *string* |

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `handlers` | Middleware[] |
| `params` | *Record*<string, string\> |

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:18

___

### lookup

▸ **lookup**(`req`: *IncomingMessage*, `res`: *ServerResponse*, `next`: NextCallback): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | *IncomingMessage* |
| `res` | *ServerResponse* |
| `next` | NextCallback |

**Returns:** *void*

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: [packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `pattern` | *string* \| *RegExp* |
| `...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`: *string* \| *RegExp*, ...`middlewares`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | *string* \| *RegExp* |
| `...middlewares` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: [packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/api-server/src/lib/definitions.ts#L9)

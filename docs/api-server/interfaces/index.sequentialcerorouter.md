[@scramjet/api-server](../README.md) / [index](../modules/index.md) / SequentialCeroRouter

# Interface: SequentialCeroRouter

[index](../modules/index.md).SequentialCeroRouter

## Hierarchy

* [*CeroRouter*](lib_definitions.cerorouter.md)

  ↳ **SequentialCeroRouter**

## Table of contents

### Methods

- [add](index.sequentialcerorouter.md#add)
- [all](index.sequentialcerorouter.md#all)
- [connect](index.sequentialcerorouter.md#connect)
- [delete](index.sequentialcerorouter.md#delete)
- [find](index.sequentialcerorouter.md#find)
- [get](index.sequentialcerorouter.md#get)
- [head](index.sequentialcerorouter.md#head)
- [lookup](index.sequentialcerorouter.md#lookup)
- [options](index.sequentialcerorouter.md#options)
- [patch](index.sequentialcerorouter.md#patch)
- [post](index.sequentialcerorouter.md#post)
- [put](index.sequentialcerorouter.md#put)
- [trace](index.sequentialcerorouter.md#trace)
- [use](index.sequentialcerorouter.md#use)

## Methods

### add

▸ **add**(`method`: Methods, `pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`method` | Methods |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:22

___

### find

▸ **find**(`method`: Methods, `url`: *string*): *object*

#### Parameters:

Name | Type |
------ | ------ |
`method` | Methods |
`url` | *string* |

**Returns:** *object*

Name | Type |
------ | ------ |
`handlers` | Middleware[] |
`params` | *Record*<*string*, *string*\> |

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:18

___

### lookup

▸ **lookup**(`req`: *IncomingMessage*, `res`: *ServerResponse*, `next`: NextCallback): *void*

#### Parameters:

Name | Type |
------ | ------ |
`req` | *IncomingMessage* |
`res` | *ServerResponse* |
`next` | NextCallback |

**Returns:** *void*

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: [packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`: *string* \| *RegExp*, ...`middlewares`: Middleware[]): [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`path` | *string* \| *RegExp* |
`...middlewares` | Middleware[] |

**Returns:** [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

Inherited from: [CeroRouter](lib_definitions.cerorouter.md)

Defined in: [packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L9)

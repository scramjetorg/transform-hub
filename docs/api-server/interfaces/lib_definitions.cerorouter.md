[@scramjet/api-server](../README.md) / [lib/definitions](../modules/lib_definitions.md) / CeroRouter

# Interface: CeroRouter

[lib/definitions](../modules/lib_definitions.md).CeroRouter

## Hierarchy

* *TRouter*<[*CeroMiddleware*](../modules/lib_definitions.md#ceromiddleware)\>

  ↳ **CeroRouter**

  ↳↳ [*SequentialCeroRouter*](lib_definitions.sequentialcerorouter.md)

  ↳↳ [*SequentialCeroRouter*](index.sequentialcerorouter.md)

## Table of contents

### Methods

- [add](lib_definitions.cerorouter.md#add)
- [all](lib_definitions.cerorouter.md#all)
- [connect](lib_definitions.cerorouter.md#connect)
- [delete](lib_definitions.cerorouter.md#delete)
- [find](lib_definitions.cerorouter.md#find)
- [get](lib_definitions.cerorouter.md#get)
- [head](lib_definitions.cerorouter.md#head)
- [lookup](lib_definitions.cerorouter.md#lookup)
- [options](lib_definitions.cerorouter.md#options)
- [patch](lib_definitions.cerorouter.md#patch)
- [post](lib_definitions.cerorouter.md#post)
- [put](lib_definitions.cerorouter.md#put)
- [trace](lib_definitions.cerorouter.md#trace)
- [use](lib_definitions.cerorouter.md#use)

## Methods

### add

▸ **add**(`method`: Methods, `pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`method` | Methods |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:14

___

### all

▸ **all**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:16

___

### connect

▸ **connect**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:21

___

### delete

▸ **delete**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

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

Defined in: node_modules/trouter/index.d.ts:10

___

### get

▸ **get**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:17

___

### head

▸ **head**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

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

Defined in: [packages/api-server/src/lib/definitions.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L10)

___

### options

▸ **options**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:20

___

### patch

▸ **patch**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:19

___

### post

▸ **post**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:24

___

### put

▸ **put**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:25

___

### trace

▸ **trace**(`pattern`: *string* \| *RegExp*, ...`handlers`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`pattern` | *string* \| *RegExp* |
`...handlers` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: node_modules/trouter/index.d.ts:23

___

### use

▸ **use**(`path`: *string* \| *RegExp*, ...`middlewares`: Middleware[]): [*CeroRouter*](lib_definitions.cerorouter.md)

#### Parameters:

Name | Type |
------ | ------ |
`path` | *string* \| *RegExp* |
`...middlewares` | Middleware[] |

**Returns:** [*CeroRouter*](lib_definitions.cerorouter.md)

Defined in: [packages/api-server/src/lib/definitions.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/definitions.ts#L9)

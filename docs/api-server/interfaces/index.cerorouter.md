[@scramjet/api-server](../README.md) / [index](../modules/index.md) / CeroRouter

# Interface: CeroRouter

[index](../modules/index.md).CeroRouter

## Hierarchy

* *TRouter*<[*CeroMiddleware*](../modules/lib_definitions.md#ceromiddleware)\>

  ↳ **CeroRouter**

## Table of contents

### Methods

- [add](index.cerorouter.md#add)
- [all](index.cerorouter.md#all)
- [connect](index.cerorouter.md#connect)
- [delete](index.cerorouter.md#delete)
- [find](index.cerorouter.md#find)
- [get](index.cerorouter.md#get)
- [head](index.cerorouter.md#head)
- [lookup](index.cerorouter.md#lookup)
- [options](index.cerorouter.md#options)
- [patch](index.cerorouter.md#patch)
- [post](index.cerorouter.md#post)
- [put](index.cerorouter.md#put)
- [trace](index.cerorouter.md#trace)
- [use](index.cerorouter.md#use)

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

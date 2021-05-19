[@scramjet/types](../README.md) / APIExpose

# Interface: APIExpose

## Hierarchy

* [*APIBase*](apibase.md)

  ↳ **APIExpose**

## Table of contents

### Properties

- [server](apiexpose.md#server)

### Methods

- [downstream](apiexpose.md#downstream)
- [get](apiexpose.md#get)
- [op](apiexpose.md#op)
- [upstream](apiexpose.md#upstream)
- [use](apiexpose.md#use)

## Properties

### server

• **server**: *Server*

The raw HTTP server

Defined in: [packages/types/src/api-expose.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L107)

## Methods

### downstream

▸ **downstream**(`path`: *string* \| *RegExp*, `stream`: [*StreamOutput*](../README.md#streamoutput), `config?`: [*StreamConfig*](../README.md#streamconfig)): *void*

A method that allows to consume incoming stream from the specified path on the API server

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`path` | *string* \| *RegExp* | the request path as string or regex   |
`stream` | [*StreamOutput*](../README.md#streamoutput) | the output that will be piped to from request or a method to be called then   |
`config?` | [*StreamConfig*](../README.md#streamconfig) | configuration of the stream    |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:95](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L95)

___

### get

▸ **get**<T\>(`path`: *string* \| *RegExp*, `msg`: [*GetResolver*](../README.md#getresolver) \| T, `conn?`: [*ICommunicationHandler*](icommunicationhandler.md)): *void*

Simple GET request hook for static data in monitoring stream.

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*MonitoringMessageCode*](../README.md#monitoringmessagecode) |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`path` | *string* \| *RegExp* | the request path as string or regex   |
`msg` | [*GetResolver*](../README.md#getresolver) \| T | - |
`conn?` | [*ICommunicationHandler*](icommunicationhandler.md) | the communication handler to use    |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L74)

___

### op

▸ **op**<T\>(`path`: *string* \| *RegExp*, `message`: [*OpResolver*](../README.md#opresolver) \| T, `conn?`: [*ICommunicationHandler*](icommunicationhandler.md)): *void*

Simple POST request hook for static data in monitoring stream.

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*ControlMessageCode*](../README.md#controlmessagecode) |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`path` | *string* \| *RegExp* | the request path as string or regex   |
`message` | [*OpResolver*](../README.md#opresolver) \| T | which operation to expose   |
`conn?` | [*ICommunicationHandler*](icommunicationhandler.md) | the communication handler to use    |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L65)

___

### upstream

▸ **upstream**(`path`: *string* \| *RegExp*, `stream`: [*StreamInput*](../README.md#streaminput), `config?`: [*StreamConfig*](../README.md#streamconfig)): *void*

A method that allows to pass a stream to the specified path on the API server

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`path` | *string* \| *RegExp* | the request path as string or regex   |
`stream` | [*StreamInput*](../README.md#streaminput) | the stream that will be sent in reponse body or a method to be called then   |
`config?` | [*StreamConfig*](../README.md#streamconfig) | configuration of the stream    |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L83)

___

### use

▸ **use**(`path`: *string* \| *RegExp*, ...`middlewares`: [*Middleware*](../README.md#middleware)[]): *void*

#### Parameters:

Name | Type |
------ | ------ |
`path` | *string* \| *RegExp* |
`...middlewares` | [*Middleware*](../README.md#middleware)[] |

**Returns:** *void*

Defined in: [packages/types/src/api-expose.ts:108](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L108)

[@scramjet/types](../README.md) / APIRoute

# Interface: APIRoute

## Hierarchy

- [*APIBase*](apibase.md)

  ↳ **APIRoute**

## Table of contents

### Properties

- [lookup](apiroute.md#lookup)

### Methods

- [downstream](apiroute.md#downstream)
- [get](apiroute.md#get)
- [op](apiroute.md#op)
- [upstream](apiroute.md#upstream)

## Properties

### lookup

• **lookup**: [*Middleware*](../README.md#middleware)

Defined in: [packages/types/src/api-expose.ts:115](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/api-expose.ts#L115)

## Methods

### downstream

▸ **downstream**(`path`: *string* \| *RegExp*, `stream`: [*StreamOutput*](../README.md#streamoutput), `config?`: [*StreamConfig*](../README.md#streamconfig)): *void*

A method that allows to consume incoming stream from the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | *string* \| *RegExp* | the request path as string or regex |
| `stream` | [*StreamOutput*](../README.md#streamoutput) | the output that will be piped to from request or a method to be called then |
| `config?` | [*StreamConfig*](../README.md#streamconfig) | configuration of the stream |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:98](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/api-expose.ts#L98)

___

### get

▸ **get**<T\>(`path`: *string* \| *RegExp*, `msg`: [*GetResolver*](../README.md#getresolver) \| T, `conn?`: [*ICommunicationHandler*](icommunicationhandler.md)): *void*

Simple GET request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [*MonitoringMessageCode*](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | *string* \| *RegExp* | the request path as string or regex |
| `msg` | [*GetResolver*](../README.md#getresolver) \| T | - |
| `conn?` | [*ICommunicationHandler*](icommunicationhandler.md) | the communication handler to use |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:77](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/api-expose.ts#L77)

___

### op

▸ **op**<T\>(`method`: [*HttpMethod*](../README.md#httpmethod), `path`: *string* \| *RegExp*, `message`: [*OpResolver*](../README.md#opresolver) \| T, `conn?`: [*ICommunicationHandler*](icommunicationhandler.md)): *void*

Simple POST request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [*ControlMessageCode*](../README.md#controlmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `method` | [*HttpMethod*](../README.md#httpmethod) | - |
| `path` | *string* \| *RegExp* | the request path as string or regex |
| `message` | [*OpResolver*](../README.md#opresolver) \| T | which operation to expose |
| `conn?` | [*ICommunicationHandler*](icommunicationhandler.md) | the communication handler to use |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:68](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/api-expose.ts#L68)

___

### upstream

▸ **upstream**(`path`: *string* \| *RegExp*, `stream`: [*StreamInput*](../README.md#streaminput), `config?`: [*StreamConfig*](../README.md#streamconfig)): *void*

A method that allows to pass a stream to the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | *string* \| *RegExp* | the request path as string or regex |
| `stream` | [*StreamInput*](../README.md#streaminput) | the stream that will be sent in reponse body or a method to be called then |
| `config?` | [*StreamConfig*](../README.md#streamconfig) | configuration of the stream |

**Returns:** *void*

Inherited from: [APIBase](apibase.md)

Defined in: [packages/types/src/api-expose.ts:86](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/api-expose.ts#L86)

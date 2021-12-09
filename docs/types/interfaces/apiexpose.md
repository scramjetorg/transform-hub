[@scramjet/types](../README.md) / APIExpose

# Interface: APIExpose

## Hierarchy

- [`APIBase`](apibase.md)

  ↳ **`APIExpose`**

## Table of contents

### Properties

- [log](apiexpose.md#log)
- [server](apiexpose.md#server)

### Methods

- [downstream](apiexpose.md#downstream)
- [duplex](apiexpose.md#duplex)
- [get](apiexpose.md#get)
- [op](apiexpose.md#op)
- [upstream](apiexpose.md#upstream)
- [use](apiexpose.md#use)

## Properties

### log

• **log**: `DataStream`

#### Defined in

[packages/types/src/api-expose.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L131)

___

### server

• **server**: `Server`

The raw HTTP server

#### Defined in

[packages/types/src/api-expose.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L130)

## Methods

### downstream

▸ **downstream**(`path`, `stream`, `config?`): `void`

A method that allows to consume incoming stream from the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamOutput`](../README.md#streamoutput) | the output that will be piped to from request or a method to be called then |
| `config?` | [`StreamConfig`](../README.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[downstream](apibase.md#downstream)

#### Defined in

[packages/types/src/api-expose.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L112)

___

### duplex

▸ **duplex**(`path`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `callback` | (`stream`: `Duplex`, `headers`: `IncomingHttpHeaders`) => `void` |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[duplex](apibase.md#duplex)

#### Defined in

[packages/types/src/api-expose.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L118)

___

### get

▸ **get**<`T`\>(`path`, `msg`, `conn`): `void`

Simple GET request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | `T` | - |
| `conn` | [`ICommunicationHandler`](icommunicationhandler.md) | the communication handler to use |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[get](apibase.md#get)

#### Defined in

[packages/types/src/api-expose.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L84)

▸ **get**(`path`, `msg`): `void`

Alternative GET request hook with dynamic resolution

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | [`GetResolver`](../README.md#getresolver) | - |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[get](apibase.md#get)

#### Defined in

[packages/types/src/api-expose.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L92)

___

### op

▸ **op**<`T`\>(`method`, `path`, `message`, `conn?`): `void`

Simple POST request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../README.md#controlmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `method` | [`HttpMethod`](../README.md#httpmethod) | - |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `message` | [`OpResolver`](../README.md#opresolver) \| `T` | which operation to expose |
| `conn?` | [`ICommunicationHandler`](icommunicationhandler.md) | the communication handler to use |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[op](apibase.md#op)

#### Defined in

[packages/types/src/api-expose.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L75)

___

### upstream

▸ **upstream**(`path`, `stream`, `config?`): `void`

A method that allows to pass a stream to the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamInput`](../README.md#streaminput) | the stream that will be sent in reponse body or a method to be called then |
| `config?` | [`StreamConfig`](../README.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[upstream](apibase.md#upstream)

#### Defined in

[packages/types/src/api-expose.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L100)

___

### use

▸ **use**(`path`, ...`middlewares`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | [`Middleware`](../README.md#middleware)[] |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[use](apibase.md#use)

#### Defined in

[packages/types/src/api-expose.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L123)

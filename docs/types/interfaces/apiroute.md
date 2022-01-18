[@scramjet/types](../README.md) / [Exports](../modules.md) / APIRoute

# Interface: APIRoute

## Hierarchy

- [`APIBase`](apibase.md)

  ↳ **`APIRoute`**

## Table of contents

### Methods

- [downstream](apiroute.md#downstream)
- [duplex](apiroute.md#duplex)
- [get](apiroute.md#get)
- [op](apiroute.md#op)
- [upstream](apiroute.md#upstream)
- [use](apiroute.md#use)

### Properties

- [lookup](apiroute.md#lookup)

## Methods

### downstream

▸ **downstream**(`path`, `stream`, `config?`): `void`

A method that allows to consume incoming stream from the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamOutput`](../modules.md#streamoutput) | the output that will be piped to from request or a method to be called then |
| `config?` | [`StreamConfig`](../modules.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[downstream](apibase.md#downstream)

#### Defined in

[packages/types/src/api-expose.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L120)

___

### duplex

▸ **duplex**(`path`, `callback`): `void`

Allows to handle dual direction (duplex) streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `callback` | (`stream`: `Duplex`, `headers`: `IncomingHttpHeaders`) => `void` | A method to be called when the stream is ready. |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[duplex](apibase.md#duplex)

#### Defined in

[packages/types/src/api-expose.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L132)

___

### get

▸ **get**<`T`\>(`path`, `msg`, `conn`): `void`

Simple GET request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../modules.md#monitoringmessagecode) |

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

[packages/types/src/api-expose.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L89)

▸ **get**(`path`, `msg`): `void`

Alternative GET request hook with dynamic resolution

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | [`GetResolver`](../modules.md#getresolver) | - |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[get](apibase.md#get)

#### Defined in

[packages/types/src/api-expose.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L98)

___

### op

▸ **op**<`T`\>(`method`, `path`, `message`, `conn?`): `void`

Simple POST/DELETE request hook.
This method can be used in two ways - as a control message handler or as general data handler.

**`example`**
// Control message handler
router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);
// Data handler
router.op("post", `${this.apiBase}/start`, (req) => this.handleStartRequest(req));

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../modules.md#controlmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `method` | [`HttpMethod`](../modules.md#httpmethod) | - |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `message` | [`OpResolver`](../modules.md#opresolver) \| `T` | which operation to expose |
| `conn?` | [`ICommunicationHandler`](icommunicationhandler.md) | the communication handler to use |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[op](apibase.md#op)

#### Defined in

[packages/types/src/api-expose.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L79)

___

### upstream

▸ **upstream**(`path`, `stream`, `config?`): `void`

A method that allows to pass a stream to the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamInput`](../modules.md#streaminput) | the stream that will be sent in reponse body or a method to be called then |
| `config?` | [`StreamConfig`](../modules.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[upstream](apibase.md#upstream)

#### Defined in

[packages/types/src/api-expose.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L107)

___

### use

▸ **use**(`path`, ...`middlewares`): `void`

Allows to register middlewares for specific paths, for all HTTP methods.

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...middlewares` | [`Middleware`](../modules.md#middleware)[] |

#### Returns

`void`

#### Inherited from

[APIBase](apibase.md).[use](apibase.md#use)

#### Defined in

[packages/types/src/api-expose.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L143)

## Properties

### lookup

• **lookup**: [`Middleware`](../modules.md#middleware)

#### Defined in

[packages/types/src/api-expose.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L156)

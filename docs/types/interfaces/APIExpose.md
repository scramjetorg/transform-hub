[@scramjet/types](../README.md) / [Exports](../modules.md) / APIExpose

# Interface: APIExpose

## Hierarchy

- [`APIBase`](APIBase.md)

  ↳ **`APIExpose`**

## Table of contents

### Methods

- [decorate](APIExpose.md#decorate)
- [downstream](APIExpose.md#downstream)
- [duplex](APIExpose.md#duplex)
- [get](APIExpose.md#get)
- [op](APIExpose.md#op)
- [upstream](APIExpose.md#upstream)
- [use](APIExpose.md#use)

### Properties

- [log](APIExpose.md#log)
- [server](APIExpose.md#server)

## Methods

### decorate

▸ **decorate**(`path`, ...`decorators`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `...decorators` | [`Decorator`](../modules.md#decorator)[] |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:158](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L158)

___

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

[APIBase](APIBase.md).[downstream](APIBase.md#downstream)

#### Defined in

[packages/types/src/api-expose.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L126)

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

[APIBase](APIBase.md).[duplex](APIBase.md#duplex)

#### Defined in

[packages/types/src/api-expose.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L138)

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
| `conn` | [`ICommunicationHandler`](ICommunicationHandler.md) | the communication handler to use |

#### Returns

`void`

#### Inherited from

[APIBase](APIBase.md).[get](APIBase.md#get)

#### Defined in

[packages/types/src/api-expose.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L95)

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

[APIBase](APIBase.md).[get](APIBase.md#get)

#### Defined in

[packages/types/src/api-expose.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L104)

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
| `conn?` | [`ICommunicationHandler`](ICommunicationHandler.md) | the communication handler to use |

#### Returns

`void`

#### Inherited from

[APIBase](APIBase.md).[op](APIBase.md#op)

#### Defined in

[packages/types/src/api-expose.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L85)

___

### upstream

▸ **upstream**(`path`, `stream`, `config?`): `void`

A method that allows to pass a stream to the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamInput`](../modules.md#streaminput) | the stream that will be sent in reposnse body or a method to be called then |
| `config?` | [`StreamConfig`](../modules.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Inherited from

[APIBase](APIBase.md).[upstream](APIBase.md#upstream)

#### Defined in

[packages/types/src/api-expose.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L113)

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

[APIBase](APIBase.md).[use](APIBase.md#use)

#### Defined in

[packages/types/src/api-expose.ts:149](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L149)

## Properties

### log

• **log**: `DataStream`

#### Defined in

[packages/types/src/api-expose.ts:157](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L157)

___

### server

• **server**: `Server`

The raw HTTP server

#### Defined in

[packages/types/src/api-expose.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L156)

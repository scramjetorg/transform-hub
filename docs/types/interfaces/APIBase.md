[@scramjet/types](../README.md) / [Exports](../modules.md) / APIBase

# Interface: APIBase

## Hierarchy

- **`APIBase`**

  ↳ [`APIExpose`](APIExpose.md)

  ↳ [`APIRoute`](APIRoute.md)

## Table of contents

### Methods

- [downstream](APIBase.md#downstream)
- [duplex](APIBase.md#duplex)
- [get](APIBase.md#get)
- [op](APIBase.md#op)
- [upstream](APIBase.md#upstream)
- [use](APIBase.md#use)

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

#### Defined in

[packages/types/src/api-expose.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L127)

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

#### Defined in

[packages/types/src/api-expose.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L135)

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

#### Defined in

[packages/types/src/api-expose.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L101)

▸ **get**(`path`, `msg`): `void`

Alternative GET request hook with dynamic resolution

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | [`GetResolver`](../modules.md#getresolver) | - |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L109)

___

### op

▸ **op**<`T`\>(`method`, `path`, `message`, `comm?`, `rawBody?`): `void`

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
| `message` | `T` \| [`OpResolver`](../modules.md#opresolver) | which operation to expose |
| `comm?` | [`ICommunicationHandler`](ICommunicationHandler.md) | - |
| `rawBody?` | `boolean` | - |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L86)

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

#### Defined in

[packages/types/src/api-expose.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L118)

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

#### Defined in

[packages/types/src/api-expose.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L143)

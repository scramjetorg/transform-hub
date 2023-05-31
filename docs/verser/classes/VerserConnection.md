[@scramjet/verser](../README.md) / [Exports](../modules.md) / VerserConnection

# Class: VerserConnection

VerserConnection class.

Provides methods for handling connection to Verser server and streams in connection socket.

## Table of contents

### Methods

- [addChannelListener](VerserConnection.md#addchannellistener)
- [close](VerserConnection.md#close)
- [createChannel](VerserConnection.md#createchannel)
- [end](VerserConnection.md#end)
- [forward](VerserConnection.md#forward)
- [getAgent](VerserConnection.md#getagent)
- [getHeader](VerserConnection.md#getheader)
- [getHeaders](VerserConnection.md#getheaders)
- [makeRequest](VerserConnection.md#makerequest)
- [reconnect](VerserConnection.md#reconnect)
- [respond](VerserConnection.md#respond)

### Accessors

- [connected](VerserConnection.md#connected)
- [socket](VerserConnection.md#socket)

### Constructors

- [constructor](VerserConnection.md#constructor)

### Properties

- [logger](VerserConnection.md#logger)

## Methods

### addChannelListener

▸ **addChannelListener**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`socket`: `Duplex`, `data?`: `Buffer`) => `any` |

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L54)

___

### close

▸ **close**(): `void`

Closes the connection by sending FIN packet.

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:242](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L242)

___

### createChannel

▸ **createChannel**(`id`): `Duplex`

**`Deprecated`**

Creates new multiplexed duplex stream in the socket.
Created channel has id to be identified in VerserClient.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `number` | {number} Channel id. |

#### Returns

`Duplex`

Duplex stream.

#### Defined in

[packages/verser/src/lib/verser-connection.ts:195](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L195)

___

### end

▸ **end**(`httpStatusCode`): `void`

Ends response with provided HTTP status code.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `httpStatusCode` | `number` | HTTP status code |

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L91)

___

### forward

▸ **forward**(`req`, `res`): `Promise`<`void`\>

**`Deprecated`**

Use makeRequest instead.
Forwards data from the request to the new duplex stream multiplexed in the socket.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `IncomingMessage` | {IncomingMessage} Request object. |
| `res` | `ServerResponse` | {ServerResponse} Response object. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/verser/src/lib/verser-connection.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L102)

___

### getAgent

▸ **getAgent**(): `Agent`

#### Returns

`Agent`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L249)

___

### getHeader

▸ **getHeader**(`name`): `undefined` \| `string` \| `string`[]

Returns header value.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | header name |

#### Returns

`undefined` \| `string` \| `string`[]

Header value

#### Defined in

[packages/verser/src/lib/verser-connection.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L64)

___

### getHeaders

▸ **getHeaders**(): `IncomingHttpHeaders`

Returns request headers.

#### Returns

`IncomingHttpHeaders`

request headers

#### Defined in

[packages/verser/src/lib/verser-connection.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L73)

___

### makeRequest

▸ **makeRequest**(`options`): `Promise`<`VerserRequestResult`\>

Creates new HTTP request to VerserClient over VerserConnection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `RequestOptions` | Request options. |

#### Returns

`Promise`<`VerserRequestResult`\>

Promise resolving to Response and Request objects.

#### Defined in

[packages/verser/src/lib/verser-connection.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L165)

___

### reconnect

▸ **reconnect**(): `void`

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:201](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L201)

___

### respond

▸ **respond**(`httpStatusCode`): `void`

Writes HTTP head to the socket with provided HTTP status code.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `httpStatusCode` | `number` | HTTP status code |

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L82)

## Accessors

### connected

• `get` **connected**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L31)

___

### socket

• `get` **socket**(): `Duplex`

#### Returns

`Duplex`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L35)

## Constructors

### constructor

• **new VerserConnection**(`request`, `socket`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `IncomingMessage` |
| `socket` | `Duplex` |

#### Defined in

[packages/verser/src/lib/verser-connection.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L39)

## Properties

### logger

• **logger**: `ObjLogger`

#### Defined in

[packages/verser/src/lib/verser-connection.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-connection.ts#L22)

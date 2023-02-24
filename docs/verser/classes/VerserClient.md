[@scramjet/verser](../README.md) / [Exports](../modules.md) / VerserClient

# Class: VerserClient

VerserClient class.

Provides methods for connecting to Verser server and handling of incoming muxed duplex streams.

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`VerserClient`**

## Table of contents

### Methods

- [addListener](VerserClient.md#addlistener)
- [connect](VerserClient.md#connect)
- [emit](VerserClient.md#emit)
- [eventNames](VerserClient.md#eventnames)
- [getMaxListeners](VerserClient.md#getmaxlisteners)
- [listenerCount](VerserClient.md#listenercount)
- [listeners](VerserClient.md#listeners)
- [off](VerserClient.md#off)
- [on](VerserClient.md#on)
- [once](VerserClient.md#once)
- [prependListener](VerserClient.md#prependlistener)
- [prependOnceListener](VerserClient.md#prependoncelistener)
- [rawListeners](VerserClient.md#rawlisteners)
- [registerChannel](VerserClient.md#registerchannel)
- [removeAllListeners](VerserClient.md#removealllisteners)
- [removeListener](VerserClient.md#removelistener)
- [setMaxListeners](VerserClient.md#setmaxlisteners)
- [updateHeaders](VerserClient.md#updateheaders)

### Accessors

- [agent](VerserClient.md#agent)
- [verserAgent](VerserClient.md#verseragent)

### Constructors

- [constructor](VerserClient.md#constructor)

### Properties

- [logger](VerserClient.md#logger)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### connect

▸ **connect**(): `Promise`<`VerserClientConnection`\>

Connect to the Verser server using defined configuration.

#### Returns

`Promise`<`VerserClientConnection`\>

Promise that resolves to the connection object.

#### Defined in

[packages/verser/src/lib/verser-client.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L90)

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `...args` | `Arguments`<`Events`[`E`]\> |

#### Returns

`boolean`

#### Inherited from

TypedEmitter.emit

#### Defined in

node_modules/typed-emitter/index.d.ts:34

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

TypedEmitter.eventNames

#### Defined in

node_modules/typed-emitter/index.d.ts:35

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

TypedEmitter.getMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:40

___

### listenerCount

▸ **listenerCount**<`E`\>(`event`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`number`

#### Inherited from

TypedEmitter.listenerCount

#### Defined in

node_modules/typed-emitter/index.d.ts:38

___

### listeners

▸ **listeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

TypedEmitter.listeners

#### Defined in

node_modules/typed-emitter/index.d.ts:37

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.prependOnceListener

#### Defined in

node_modules/typed-emitter/index.d.ts:28

___

### rawListeners

▸ **rawListeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

TypedEmitter.rawListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:36

___

### registerChannel

▸ **registerChannel**(`channelId`, `data`): `void`

**`Deprecated`**

Registers a channel on the client.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `channelId` | `number` | {number} Channel id. |
| `data` | `RegisteredChannelCallback` | {RegisteredChannelCallback} Callback to be called when channel is created. |

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-client.ts:189](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L189)

___

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`VerserClient`](VerserClient.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"error"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`VerserClient`](VerserClient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`VerserClient`](VerserClient.md)

#### Inherited from

TypedEmitter.setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

___

### updateHeaders

▸ **updateHeaders**(`headers`): `void`

Sets up headers.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `headers` | `OutgoingHttpHeaders` | {IncomingHttpHeaders} Headers to be sent to the server on the connection. |

#### Returns

`void`

#### Defined in

[packages/verser/src/lib/verser-client.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L178)

## Accessors

### agent

• `get` **agent**(): `Agent` \| `Agent`

#### Returns

`Agent` \| `Agent`

#### Defined in

[packages/verser/src/lib/verser-client.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L74)

___

### verserAgent

• `get` **verserAgent**(): `undefined` \| `Agent` & { `createConnection`: (`options`: `NetConnectOpts`, `connectionListener?`: () => `void`) => `Socket`(`port`: `number`, `host?`: `string`, `connectionListener?`: () => `void`) => `Socket`(`path`: `string`, `connectionListener?`: () => `void`) => `Socket`  }

Return BPMux instance.

#### Returns

`undefined` \| `Agent` & { `createConnection`: (`options`: `NetConnectOpts`, `connectionListener?`: () => `void`) => `Socket`(`port`: `number`, `host?`: `string`, `connectionListener?`: () => `void`) => `Socket`(`path`: `string`, `connectionListener?`: () => `void`) => `Socket`  }

#### Defined in

[packages/verser/src/lib/verser-client.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L70)

## Constructors

### constructor

• **new VerserClient**(`opts?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `VerserClientOptions` | `defaultVerserClientOptions` |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/verser/src/lib/verser-client.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L78)

## Properties

### logger

• **logger**: `IObjectLogger`

Logger instance.

#### Defined in

[packages/verser/src/lib/verser-client.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser-client.ts#L65)

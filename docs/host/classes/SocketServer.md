[@scramjet/host](../README.md) / [Exports](../modules.md) / SocketServer

# Class: SocketServer

Server for incoming connections from Runners

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`SocketServer`**

## Implements

- `IComponent`

## Table of contents

### Methods

- [addListener](SocketServer.md#addlistener)
- [close](SocketServer.md#close)
- [emit](SocketServer.md#emit)
- [eventNames](SocketServer.md#eventnames)
- [getMaxListeners](SocketServer.md#getmaxlisteners)
- [listenerCount](SocketServer.md#listenercount)
- [listeners](SocketServer.md#listeners)
- [off](SocketServer.md#off)
- [on](SocketServer.md#on)
- [once](SocketServer.md#once)
- [prependListener](SocketServer.md#prependlistener)
- [prependOnceListener](SocketServer.md#prependoncelistener)
- [rawListeners](SocketServer.md#rawlisteners)
- [removeAllListeners](SocketServer.md#removealllisteners)
- [removeListener](SocketServer.md#removelistener)
- [setMaxListeners](SocketServer.md#setmaxlisteners)
- [start](SocketServer.md#start)

### Constructors

- [constructor](SocketServer.md#constructor)

### Properties

- [logger](SocketServer.md#logger)
- [server](SocketServer.md#server)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### close

▸ **close**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/socket-server.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L91)

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

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
| `E` | extends ``"connect"`` |

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
| `E` | extends ``"connect"`` |

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

▸ **off**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

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
| `E` | extends ``"connect"`` |

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

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`SocketServer`](SocketServer.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`SocketServer`](SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`SocketServer`](SocketServer.md)

#### Inherited from

TypedEmitter.setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

___

### start

▸ **start**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/socket-server.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L37)

## Constructors

### constructor

• **new SocketServer**(`port`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `number` |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/socket-server.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L31)

## Properties

### logger

• **logger**: `IObjectLogger`

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/socket-server.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L27)

___

### server

• `Optional` **server**: `Server`

#### Defined in

[packages/host/src/lib/socket-server.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L25)

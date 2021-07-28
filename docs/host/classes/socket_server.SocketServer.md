[@scramjet/host](../README.md) / [socket-server](../modules/socket_server.md) / SocketServer

# Class: SocketServer

[socket-server](../modules/socket_server.md).SocketServer

## Hierarchy

- `EventEmitter`

  ↳ **`SocketServer`**

## Implements

- `IComponent`

## Table of contents

### Constructors

- [constructor](socket_server.SocketServer.md#constructor)

### Properties

- [address](socket_server.SocketServer.md#address)
- [logger](socket_server.SocketServer.md#logger)
- [server](socket_server.SocketServer.md#server)
- [captureRejectionSymbol](socket_server.SocketServer.md#capturerejectionsymbol)
- [captureRejections](socket_server.SocketServer.md#capturerejections)
- [defaultMaxListeners](socket_server.SocketServer.md#defaultmaxlisteners)
- [errorMonitor](socket_server.SocketServer.md#errormonitor)

### Methods

- [addListener](socket_server.SocketServer.md#addlistener)
- [close](socket_server.SocketServer.md#close)
- [emit](socket_server.SocketServer.md#emit)
- [eventNames](socket_server.SocketServer.md#eventnames)
- [getMaxListeners](socket_server.SocketServer.md#getmaxlisteners)
- [listenerCount](socket_server.SocketServer.md#listenercount)
- [listeners](socket_server.SocketServer.md#listeners)
- [off](socket_server.SocketServer.md#off)
- [on](socket_server.SocketServer.md#on)
- [once](socket_server.SocketServer.md#once)
- [prependListener](socket_server.SocketServer.md#prependlistener)
- [prependOnceListener](socket_server.SocketServer.md#prependoncelistener)
- [rawListeners](socket_server.SocketServer.md#rawlisteners)
- [removeAllListeners](socket_server.SocketServer.md#removealllisteners)
- [removeListener](socket_server.SocketServer.md#removelistener)
- [setMaxListeners](socket_server.SocketServer.md#setmaxlisteners)
- [start](socket_server.SocketServer.md#start)
- [getEventListener](socket_server.SocketServer.md#geteventlistener)
- [listenerCount](socket_server.SocketServer.md#listenercount)
- [on](socket_server.SocketServer.md#on)
- [once](socket_server.SocketServer.md#once)

## Constructors

### constructor

• **new SocketServer**(`address`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `PathLike` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/host/src/lib/socket-server.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L22)

## Properties

### address

• **address**: `PathLike`

#### Defined in

[packages/host/src/lib/socket-server.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L19)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/socket-server.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L20)

___

### server

• `Optional` **server**: `Server`

#### Defined in

[packages/host/src/lib/socket-server.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L18)

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](cpm_connector.CPMConnector.md#capturerejectionsymbol)

#### Inherited from

EventEmitter.captureRejectionSymbol

#### Defined in

node_modules/@types/node/events.d.ts:46

___

### captureRejections

▪ `Static` **captureRejections**: `boolean`

Sets or gets the default captureRejection value for all emitters.

#### Inherited from

EventEmitter.captureRejections

#### Defined in

node_modules/@types/node/events.d.ts:52

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: `number`

#### Inherited from

EventEmitter.defaultMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:53

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](cpm_connector.CPMConnector.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

#### Inherited from

EventEmitter.errorMonitor

#### Defined in

node_modules/@types/node/events.d.ts:45

## Methods

### addListener

▸ **addListener**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:72

___

### close

▸ **close**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/socket-server.ts:118](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L118)

___

### emit

▸ **emit**(`event`, ...`args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

EventEmitter.emit

#### Defined in

node_modules/@types/node/events.d.ts:82

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

EventEmitter.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:87

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

EventEmitter.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:79

___

### listenerCount

▸ **listenerCount**(`event`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:83

___

### listeners

▸ **listeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.listeners

#### Defined in

node_modules/@types/node/events.d.ts:80

___

### off

▸ **off**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:73

___

### once

▸ **once**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:74

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:85

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:86

___

### rawListeners

▸ **rawListeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:81

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:75

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`SocketServer`](socket_server.SocketServer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`SocketServer`](socket_server.SocketServer.md)

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### start

▸ **start**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/socket-server.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/socket-server.ts#L54)

___

### getEventListener

▸ `Static` **getEventListener**(`emitter`, `name`): `Function`[]

Returns a list listener for a specific emitter event name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` \| `EventEmitter` |
| `name` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.getEventListener

#### Defined in

node_modules/@types/node/events.d.ts:34

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `event`): `number`

**`deprecated`** since v4.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:30

___

### on

▸ `Static` **on**(`emitter`, `event`, `options?`): `AsyncIterableIterator`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`AsyncIterableIterator`<`any`\>

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:27

___

### once

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `NodeEventTarget` |
| `event` | `string` \| `symbol` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:25

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:26

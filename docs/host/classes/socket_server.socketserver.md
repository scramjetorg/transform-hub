[@scramjet/host](../README.md) / [socket-server](../modules/socket_server.md) / SocketServer

# Class: SocketServer

[socket-server](../modules/socket_server.md).SocketServer

## Hierarchy

- *EventEmitter*

  ↳ **SocketServer**

## Implements

- *IComponent*

## Table of contents

### Constructors

- [constructor](socket_server.socketserver.md#constructor)

### Properties

- [address](socket_server.socketserver.md#address)
- [logger](socket_server.socketserver.md#logger)
- [server](socket_server.socketserver.md#server)
- [captureRejectionSymbol](socket_server.socketserver.md#capturerejectionsymbol)
- [captureRejections](socket_server.socketserver.md#capturerejections)
- [defaultMaxListeners](socket_server.socketserver.md#defaultmaxlisteners)
- [errorMonitor](socket_server.socketserver.md#errormonitor)

### Methods

- [addListener](socket_server.socketserver.md#addlistener)
- [close](socket_server.socketserver.md#close)
- [emit](socket_server.socketserver.md#emit)
- [eventNames](socket_server.socketserver.md#eventnames)
- [getMaxListeners](socket_server.socketserver.md#getmaxlisteners)
- [listenerCount](socket_server.socketserver.md#listenercount)
- [listeners](socket_server.socketserver.md#listeners)
- [off](socket_server.socketserver.md#off)
- [on](socket_server.socketserver.md#on)
- [once](socket_server.socketserver.md#once)
- [prependListener](socket_server.socketserver.md#prependlistener)
- [prependOnceListener](socket_server.socketserver.md#prependoncelistener)
- [rawListeners](socket_server.socketserver.md#rawlisteners)
- [removeAllListeners](socket_server.socketserver.md#removealllisteners)
- [removeListener](socket_server.socketserver.md#removelistener)
- [setMaxListeners](socket_server.socketserver.md#setmaxlisteners)
- [start](socket_server.socketserver.md#start)
- [listenerCount](socket_server.socketserver.md#listenercount)
- [on](socket_server.socketserver.md#on)
- [once](socket_server.socketserver.md#once)

## Constructors

### constructor

\+ **new SocketServer**(`address`: PathLike): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | PathLike |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Overrides: EventEmitter.constructor

Defined in: [packages/host/src/lib/socket-server.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L20)

## Properties

### address

• **address**: PathLike

Defined in: [packages/host/src/lib/socket-server.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L19)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [packages/host/src/lib/socket-server.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L20)

___

### server

• `Optional` **server**: *Server*

Defined in: [packages/host/src/lib/socket-server.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L18)

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: *typeof* [*captureRejectionSymbol*](csi_controller.csicontroller.md#capturerejectionsymbol)

Inherited from: EventEmitter.captureRejectionSymbol

Defined in: node_modules/@types/node/events.d.ts:38

___

### captureRejections

▪ `Static` **captureRejections**: *boolean*

Sets or gets the default captureRejection value for all emitters.

Inherited from: EventEmitter.captureRejections

Defined in: node_modules/@types/node/events.d.ts:44

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: *number*

Inherited from: EventEmitter.defaultMaxListeners

Defined in: node_modules/@types/node/events.d.ts:45

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: *typeof* [*errorMonitor*](csi_controller.csicontroller.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

Inherited from: EventEmitter.errorMonitor

Defined in: node_modules/@types/node/events.d.ts:37

## Methods

### addListener

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.addListener

Defined in: node_modules/@types/node/events.d.ts:57

___

### close

▸ **close**(): *void*

**Returns:** *void*

Defined in: [packages/host/src/lib/socket-server.ts:118](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L118)

___

### emit

▸ **emit**(`event`: *string* \| *symbol*, ...`args`: *any*[]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `...args` | *any*[] |

**Returns:** *boolean*

Inherited from: EventEmitter.emit

Defined in: node_modules/@types/node/events.d.ts:67

___

### eventNames

▸ **eventNames**(): (*string* \| *symbol*)[]

**Returns:** (*string* \| *symbol*)[]

Inherited from: EventEmitter.eventNames

Defined in: node_modules/@types/node/events.d.ts:72

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Inherited from: EventEmitter.getMaxListeners

Defined in: node_modules/@types/node/events.d.ts:64

___

### listenerCount

▸ **listenerCount**(`event`: *string* \| *symbol*): *number*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** *number*

Inherited from: EventEmitter.listenerCount

Defined in: node_modules/@types/node/events.d.ts:68

___

### listeners

▸ **listeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: EventEmitter.listeners

Defined in: node_modules/@types/node/events.d.ts:65

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.off

Defined in: node_modules/@types/node/events.d.ts:61

___

### on

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.on

Defined in: node_modules/@types/node/events.d.ts:58

___

### once

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.once

Defined in: node_modules/@types/node/events.d.ts:59

___

### prependListener

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.prependListener

Defined in: node_modules/@types/node/events.d.ts:70

___

### prependOnceListener

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.prependOnceListener

Defined in: node_modules/@types/node/events.d.ts:71

___

### rawListeners

▸ **rawListeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: EventEmitter.rawListeners

Defined in: node_modules/@types/node/events.d.ts:66

___

### removeAllListeners

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | *string* \| *symbol* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.removeAllListeners

Defined in: node_modules/@types/node/events.d.ts:62

___

### removeListener

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.removeListener

Defined in: node_modules/@types/node/events.d.ts:60

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | *number* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Inherited from: EventEmitter.setMaxListeners

Defined in: node_modules/@types/node/events.d.ts:63

___

### start

▸ **start**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/socket-server.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/socket-server.ts#L54)

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`: *EventEmitter*, `event`: *string* \| *symbol*): *number*

**`deprecated`** since v4.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | *EventEmitter* |
| `event` | *string* \| *symbol* |

**Returns:** *number*

Inherited from: EventEmitter.listenerCount

Defined in: node_modules/@types/node/events.d.ts:26

___

### on

▸ `Static` **on**(`emitter`: *EventEmitter*, `event`: *string*): *AsyncIterableIterator*<any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | *EventEmitter* |
| `event` | *string* |

**Returns:** *AsyncIterableIterator*<any\>

Inherited from: EventEmitter.on

Defined in: node_modules/@types/node/events.d.ts:23

___

### once

▸ `Static` **once**(`emitter`: *NodeEventTarget*, `event`: *string* \| *symbol*): *Promise*<any[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | *NodeEventTarget* |
| `event` | *string* \| *symbol* |

**Returns:** *Promise*<any[]\>

Inherited from: EventEmitter.once

Defined in: node_modules/@types/node/events.d.ts:21

▸ `Static` **once**(`emitter`: DOMEventTarget, `event`: *string*): *Promise*<any[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | DOMEventTarget |
| `event` | *string* |

**Returns:** *Promise*<any[]\>

Inherited from: EventEmitter.once

Defined in: node_modules/@types/node/events.d.ts:22

[@scramjet/host](../README.md) / [socket-server](../modules/socket_server.md) / SocketServer

# Class: SocketServer

[socket-server](../modules/socket_server.md).SocketServer

## Hierarchy

* *EventEmitter*

  ↳ **SocketServer**

## Implements

* *IComponent*

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

#### Parameters:

Name | Type |
------ | ------ |
`address` | PathLike |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: [src/lib/socket-server.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L20)

## Properties

### address

• **address**: PathLike

Defined in: [src/lib/socket-server.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L19)

___

### logger

• **logger**: Console

Defined in: [src/lib/socket-server.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L20)

___

### server

• `Optional` **server**: *undefined* \| *Server*

Defined in: [src/lib/socket-server.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L18)

___

### captureRejectionSymbol

▪ `Readonly` `Static` **captureRejectionSymbol**: *typeof* [*captureRejectionSymbol*](csi_controller.csicontroller.md#capturerejectionsymbol)

Defined in: node_modules/@types/node/events.d.ts:43

___

### captureRejections

▪ `Static` **captureRejections**: *boolean*

Sets or gets the default captureRejection value for all emitters.

Defined in: node_modules/@types/node/events.d.ts:49

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: *number*

Defined in: node_modules/@types/node/events.d.ts:50

___

### errorMonitor

▪ `Readonly` `Static` **errorMonitor**: *typeof* [*errorMonitor*](csi_controller.csicontroller.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

Defined in: node_modules/@types/node/events.d.ts:42

## Methods

### addListener

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:62

___

### close

▸ **close**(): *void*

**Returns:** *void*

Defined in: [src/lib/socket-server.ts:118](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L118)

___

### emit

▸ **emit**(`event`: *string* \| *symbol*, ...`args`: *any*[]): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`...args` | *any*[] |

**Returns:** *boolean*

Defined in: node_modules/@types/node/events.d.ts:72

___

### eventNames

▸ **eventNames**(): (*string* \| *symbol*)[]

**Returns:** (*string* \| *symbol*)[]

Defined in: node_modules/@types/node/events.d.ts:77

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Defined in: node_modules/@types/node/events.d.ts:69

___

### listenerCount

▸ **listenerCount**(`event`: *string* \| *symbol*): *number*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** *number*

Defined in: node_modules/@types/node/events.d.ts:73

___

### listeners

▸ **listeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** Function[]

Defined in: node_modules/@types/node/events.d.ts:70

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:66

___

### on

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:63

___

### once

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:64

___

### prependListener

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:75

___

### prependOnceListener

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:76

___

### rawListeners

▸ **rawListeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** Function[]

Defined in: node_modules/@types/node/events.d.ts:71

___

### removeAllListeners

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event?` | *string* \| *symbol* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:67

___

### removeListener

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:65

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*SocketServer*](socket_server.socketserver.md)

#### Parameters:

Name | Type |
------ | ------ |
`n` | *number* |

**Returns:** [*SocketServer*](socket_server.socketserver.md)

Defined in: node_modules/@types/node/events.d.ts:68

___

### start

▸ **start**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/socket-server.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/socket-server.ts#L54)

___

### listenerCount

▸ `Static`**listenerCount**(`emitter`: *EventEmitter*, `event`: *string* \| *symbol*): *number*

**`deprecated`** since v4.0.0

#### Parameters:

Name | Type |
------ | ------ |
`emitter` | *EventEmitter* |
`event` | *string* \| *symbol* |

**Returns:** *number*

Defined in: node_modules/@types/node/events.d.ts:31

___

### on

▸ `Static`**on**(`emitter`: *EventEmitter*, `event`: *string*): *AsyncIterableIterator*<*any*\>

#### Parameters:

Name | Type |
------ | ------ |
`emitter` | *EventEmitter* |
`event` | *string* |

**Returns:** *AsyncIterableIterator*<*any*\>

Defined in: node_modules/@types/node/events.d.ts:28

___

### once

▸ `Static`**once**(`emitter`: *NodeEventTarget*, `event`: *string* \| *symbol*): *Promise*<*any*[]\>

#### Parameters:

Name | Type |
------ | ------ |
`emitter` | *NodeEventTarget* |
`event` | *string* \| *symbol* |

**Returns:** *Promise*<*any*[]\>

Defined in: node_modules/@types/node/events.d.ts:26

▸ `Static`**once**(`emitter`: DOMEventTarget, `event`: *string*): *Promise*<*any*[]\>

#### Parameters:

Name | Type |
------ | ------ |
`emitter` | DOMEventTarget |
`event` | *string* |

**Returns:** *Promise*<*any*[]\>

Defined in: node_modules/@types/node/events.d.ts:27

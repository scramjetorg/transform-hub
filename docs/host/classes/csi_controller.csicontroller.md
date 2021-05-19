[@scramjet/host](../README.md) / [csi-controller](../modules/csi_controller.md) / CSIController

# Class: CSIController

[csi-controller](../modules/csi_controller.md).CSIController

## Hierarchy

* *EventEmitter*

  ↳ **CSIController**

## Table of contents

### Constructors

- [constructor](csi_controller.csicontroller.md#constructor)

### Properties

- [appConfig](csi_controller.csicontroller.md#appconfig)
- [communicationHandler](csi_controller.csicontroller.md#communicationhandler)
- [controlDataStream](csi_controller.csicontroller.md#controldatastream)
- [downStreams](csi_controller.csicontroller.md#downstreams)
- [id](csi_controller.csicontroller.md#id)
- [initResolver](csi_controller.csicontroller.md#initresolver)
- [logger](csi_controller.csicontroller.md#logger)
- [router](csi_controller.csicontroller.md#router)
- [sequence](csi_controller.csicontroller.md#sequence)
- [sequenceArgs](csi_controller.csicontroller.md#sequenceargs)
- [status](csi_controller.csicontroller.md#status)
- [superVisorProcess](csi_controller.csicontroller.md#supervisorprocess)
- [captureRejectionSymbol](csi_controller.csicontroller.md#capturerejectionsymbol)
- [captureRejections](csi_controller.csicontroller.md#capturerejections)
- [defaultMaxListeners](csi_controller.csicontroller.md#defaultmaxlisteners)
- [errorMonitor](csi_controller.csicontroller.md#errormonitor)

### Methods

- [addListener](csi_controller.csicontroller.md#addlistener)
- [createInstanceAPIRouter](csi_controller.csicontroller.md#createinstanceapirouter)
- [emit](csi_controller.csicontroller.md#emit)
- [eventNames](csi_controller.csicontroller.md#eventnames)
- [getMaxListeners](csi_controller.csicontroller.md#getmaxlisteners)
- [handleHandshake](csi_controller.csicontroller.md#handlehandshake)
- [handleSupervisorConnect](csi_controller.csicontroller.md#handlesupervisorconnect)
- [hookupStreams](csi_controller.csicontroller.md#hookupstreams)
- [listenerCount](csi_controller.csicontroller.md#listenercount)
- [listeners](csi_controller.csicontroller.md#listeners)
- [main](csi_controller.csicontroller.md#main)
- [off](csi_controller.csicontroller.md#off)
- [on](csi_controller.csicontroller.md#on)
- [once](csi_controller.csicontroller.md#once)
- [prependListener](csi_controller.csicontroller.md#prependlistener)
- [prependOnceListener](csi_controller.csicontroller.md#prependoncelistener)
- [rawListeners](csi_controller.csicontroller.md#rawlisteners)
- [removeAllListeners](csi_controller.csicontroller.md#removealllisteners)
- [removeListener](csi_controller.csicontroller.md#removelistener)
- [sendConfig](csi_controller.csicontroller.md#sendconfig)
- [setMaxListeners](csi_controller.csicontroller.md#setmaxlisteners)
- [start](csi_controller.csicontroller.md#start)
- [startSupervisor](csi_controller.csicontroller.md#startsupervisor)
- [supervisorStopped](csi_controller.csicontroller.md#supervisorstopped)
- [listenerCount](csi_controller.csicontroller.md#listenercount)
- [on](csi_controller.csicontroller.md#on)
- [once](csi_controller.csicontroller.md#once)

## Constructors

### constructor

\+ **new CSIController**(`id`: *string*, `sequence`: [*Sequence*](../modules/host.md#sequence), `appConfig`: AppConfig, `args`: *undefined* \| *any*[], `communicationHandler`: *CommunicationHandler*, `logger`: Console): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`id` | *string* |
`sequence` | [*Sequence*](../modules/host.md#sequence) |
`appConfig` | AppConfig |
`args` | *undefined* \| *any*[] |
`communicationHandler` | *CommunicationHandler* |
`logger` | Console |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: [src/lib/csi-controller.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L35)

## Properties

### appConfig

• **appConfig**: AppConfig

Defined in: [src/lib/csi-controller.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L19)

___

### communicationHandler

• **communicationHandler**: *CommunicationHandler*

Defined in: [src/lib/csi-controller.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L34)

___

### controlDataStream

• `Optional` **controlDataStream**: *undefined* \| *DataStream*

Defined in: [src/lib/csi-controller.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L23)

___

### downStreams

• `Optional` **downStreams**: *undefined* \| *DownstreamStreamsConfig*<*true*\>

Defined in: [src/lib/csi-controller.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L24)

___

### id

• **id**: *string*

Defined in: [src/lib/csi-controller.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L17)

___

### initResolver

• `Optional` **initResolver**: *undefined* \| { `rej`: Function ; `res`: Function  }

Defined in: [src/lib/csi-controller.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L27)

___

### logger

• **logger**: Console

Defined in: [src/lib/csi-controller.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L35)

___

### router

• `Optional` **router**: *undefined* \| APIRoute

Defined in: [src/lib/csi-controller.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L25)

___

### sequence

• **sequence**: [*Sequence*](../modules/host.md#sequence)

Defined in: [src/lib/csi-controller.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L18)

___

### sequenceArgs

• **sequenceArgs**: *undefined* \| *string*[]

Defined in: [src/lib/csi-controller.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L21)

___

### status

• `Optional` **status**: *undefined* \| FunctionDefinition[]

Defined in: [src/lib/csi-controller.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L22)

___

### superVisorProcess

• `Optional` **superVisorProcess**: *undefined* \| *ChildProcess*

Defined in: [src/lib/csi-controller.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L20)

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

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:62

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): *void*

**Returns:** *void*

Defined in: [src/lib/csi-controller.ts:200](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L200)

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

### handleHandshake

▸ **handleHandshake**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/csi-controller.ts:160](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L160)

___

### handleSupervisorConnect

▸ **handleSupervisorConnect**(`streams`: *DownstreamStreamsConfig*<*true*\>): *Promise*<*void*\>

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *DownstreamStreamsConfig*<*true*\> |

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/csi-controller.ts:188](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L188)

___

### hookupStreams

▸ **hookupStreams**(`streams`: *DownstreamStreamsConfig*<*true*\>): *void*

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *DownstreamStreamsConfig*<*true*\> |

**Returns:** *void*

Defined in: [src/lib/csi-controller.ts:119](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L119)

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

### main

▸ **main**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/csi-controller.ts:67](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L67)

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:66

___

### on

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:63

___

### once

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:64

___

### prependListener

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:75

___

### prependOnceListener

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

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

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event?` | *string* \| *symbol* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:67

___

### removeListener

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:65

___

### sendConfig

▸ **sendConfig**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/csi-controller.ts:177](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L177)

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters:

Name | Type |
------ | ------ |
`n` | *number* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Defined in: node_modules/@types/node/events.d.ts:68

___

### start

▸ **start**(): *Promise*<*unknown*\>

**Returns:** *Promise*<*unknown*\>

Defined in: [src/lib/csi-controller.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L54)

___

### startSupervisor

▸ **startSupervisor**(): *void*

**Returns:** *void*

Defined in: [src/lib/csi-controller.ts:78](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L78)

___

### supervisorStopped

▸ **supervisorStopped**(): *Promise*<*number*\>

**Returns:** *Promise*<*number*\>

Defined in: [src/lib/csi-controller.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/csi-controller.ts#L99)

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

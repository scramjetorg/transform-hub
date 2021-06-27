[@scramjet/host](../README.md) / [csi-controller](../modules/csi_controller.md) / CSIController

# Class: CSIController

[csi-controller](../modules/csi_controller.md).CSIController

## Hierarchy

- *EventEmitter*

  ↳ **CSIController**

## Table of contents

### Constructors

- [constructor](csi_controller.csicontroller.md#constructor)

### Properties

- [appConfig](csi_controller.csicontroller.md#appconfig)
- [communicationHandler](csi_controller.csicontroller.md#communicationhandler)
- [controlDataStream](csi_controller.csicontroller.md#controldatastream)
- [id](csi_controller.csicontroller.md#id)
- [info](csi_controller.csicontroller.md#info)
- [initResolver](csi_controller.csicontroller.md#initresolver)
- [logger](csi_controller.csicontroller.md#logger)
- [router](csi_controller.csicontroller.md#router)
- [sequence](csi_controller.csicontroller.md#sequence)
- [sequenceArgs](csi_controller.csicontroller.md#sequenceargs)
- [startPromise](csi_controller.csicontroller.md#startpromise)
- [startResolver](csi_controller.csicontroller.md#startresolver)
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
- [getInfo](csi_controller.csicontroller.md#getinfo)
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

\+ **new CSIController**(`id`: *string*, `sequence`: [*Sequence*](sequence.sequence-1.md), `appConfig`: AppConfig, `sequenceArgs`: *undefined* \| *any*[], `communicationHandler`: *CommunicationHandler*, `logger`: Console): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |
| `sequence` | [*Sequence*](sequence.sequence-1.md) |
| `appConfig` | AppConfig |
| `sequenceArgs` | *undefined* \| *any*[] |
| `communicationHandler` | *CommunicationHandler* |
| `logger` | Console |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Overrides: EventEmitter.constructor

Defined in: [packages/host/src/lib/csi-controller.ts:45](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L45)

## Properties

### appConfig

• **appConfig**: AppConfig

Defined in: [packages/host/src/lib/csi-controller.ts:23](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L23)

___

### communicationHandler

• **communicationHandler**: *CommunicationHandler*

Defined in: [packages/host/src/lib/csi-controller.ts:44](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L44)

___

### controlDataStream

• `Optional` **controlDataStream**: *DataStream*

Defined in: [packages/host/src/lib/csi-controller.ts:27](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L27)

___

### id

• **id**: *string*

Defined in: [packages/host/src/lib/csi-controller.ts:21](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L21)

___

### info

• **info**: *object*= {}

#### Type declaration

| Name | Type |
| :------ | :------ |
| `created?` | Date |
| `ports?` | *any* |
| `started?` | Date |

Defined in: [packages/host/src/lib/csi-controller.ts:29](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L29)

___

### initResolver

• `Optional` **initResolver**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | Function |
| `res` | Function |

Defined in: [packages/host/src/lib/csi-controller.ts:34](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L34)

___

### logger

• **logger**: Console

Defined in: [packages/host/src/lib/csi-controller.ts:45](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L45)

___

### router

• `Optional` **router**: APIRoute

Defined in: [packages/host/src/lib/csi-controller.ts:28](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L28)

___

### sequence

• **sequence**: [*Sequence*](sequence.sequence-1.md)

Defined in: [packages/host/src/lib/csi-controller.ts:22](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L22)

___

### sequenceArgs

• **sequenceArgs**: *undefined* \| *any*[]

Defined in: [packages/host/src/lib/csi-controller.ts:25](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L25)

___

### startPromise

• **startPromise**: *Promise*<void\>

Defined in: [packages/host/src/lib/csi-controller.ts:36](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L36)

___

### startResolver

• `Optional` **startResolver**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | Function |
| `res` | Function |

Defined in: [packages/host/src/lib/csi-controller.ts:35](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L35)

___

### status

• `Optional` **status**: FunctionDefinition[]

Defined in: [packages/host/src/lib/csi-controller.ts:26](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L26)

___

### superVisorProcess

• `Optional` **superVisorProcess**: *ChildProcess*

Defined in: [packages/host/src/lib/csi-controller.ts:24](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L24)

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

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.addListener

Defined in: node_modules/@types/node/events.d.ts:57

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): *void*

**Returns:** *void*

Defined in: [packages/host/src/lib/csi-controller.ts:233](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L233)

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

### getInfo

▸ **getInfo**(): *Promise*<{ `appConfig`: AppConfig ; `args`: *undefined* \| *any*[] ; `created?`: Date ; `ports?`: *any* ; `sequenceId`: *string* ; `started?`: Date  }\>

**Returns:** *Promise*<{ `appConfig`: AppConfig ; `args`: *undefined* \| *any*[] ; `created?`: Date ; `ports?`: *any* ; `sequenceId`: *string* ; `started?`: Date  }\>

Defined in: [packages/host/src/lib/csi-controller.ts:267](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L267)

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Inherited from: EventEmitter.getMaxListeners

Defined in: node_modules/@types/node/events.d.ts:64

___

### handleHandshake

▸ **handleHandshake**(`message`: *any*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | *any* |

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/csi-controller.ts:188](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L188)

___

### handleSupervisorConnect

▸ **handleSupervisorConnect**(`streams`: *DownstreamStreamsConfig*<``true``\>): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | *DownstreamStreamsConfig*<``true``\> |

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/csi-controller.ts:221](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L221)

___

### hookupStreams

▸ **hookupStreams**(`streams`: *DownstreamStreamsConfig*<``true``\>): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | *DownstreamStreamsConfig*<``true``\> |

**Returns:** *void*

Defined in: [packages/host/src/lib/csi-controller.ts:142](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L142)

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

### main

▸ **main**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/csi-controller.ts:84](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L84)

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.off

Defined in: node_modules/@types/node/events.d.ts:61

___

### on

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.on

Defined in: node_modules/@types/node/events.d.ts:58

___

### once

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.once

Defined in: node_modules/@types/node/events.d.ts:59

___

### prependListener

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.prependListener

Defined in: node_modules/@types/node/events.d.ts:70

___

### prependOnceListener

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

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

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | *string* \| *symbol* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.removeAllListeners

Defined in: node_modules/@types/node/events.d.ts:62

___

### removeListener

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.removeListener

Defined in: node_modules/@types/node/events.d.ts:60

___

### sendConfig

▸ **sendConfig**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/csi-controller.ts:210](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L210)

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*CSIController*](csi_controller.csicontroller.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | *number* |

**Returns:** [*CSIController*](csi_controller.csicontroller.md)

Inherited from: EventEmitter.setMaxListeners

Defined in: node_modules/@types/node/events.d.ts:63

___

### start

▸ **start**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Defined in: [packages/host/src/lib/csi-controller.ts:71](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L71)

___

### startSupervisor

▸ **startSupervisor**(): *void*

**Returns:** *void*

Defined in: [packages/host/src/lib/csi-controller.ts:97](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L97)

___

### supervisorStopped

▸ **supervisorStopped**(): *Promise*<number\>

**Returns:** *Promise*<number\>

Defined in: [packages/host/src/lib/csi-controller.ts:118](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/csi-controller.ts#L118)

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

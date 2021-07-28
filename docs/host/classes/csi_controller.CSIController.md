[@scramjet/host](../README.md) / [csi-controller](../modules/csi_controller.md) / CSIController

# Class: CSIController

[csi-controller](../modules/csi_controller.md).CSIController

## Hierarchy

- `EventEmitter`

  ↳ **`CSIController`**

## Table of contents

### Constructors

- [constructor](csi_controller.CSIController.md#constructor)

### Properties

- [appConfig](csi_controller.CSIController.md#appconfig)
- [communicationHandler](csi_controller.CSIController.md#communicationhandler)
- [controlDataStream](csi_controller.CSIController.md#controldatastream)
- [id](csi_controller.CSIController.md#id)
- [info](csi_controller.CSIController.md#info)
- [initResolver](csi_controller.CSIController.md#initresolver)
- [logger](csi_controller.CSIController.md#logger)
- [router](csi_controller.CSIController.md#router)
- [sequence](csi_controller.CSIController.md#sequence)
- [sequenceArgs](csi_controller.CSIController.md#sequenceargs)
- [startPromise](csi_controller.CSIController.md#startpromise)
- [startResolver](csi_controller.CSIController.md#startresolver)
- [status](csi_controller.CSIController.md#status)
- [superVisorProcess](csi_controller.CSIController.md#supervisorprocess)
- [captureRejectionSymbol](csi_controller.CSIController.md#capturerejectionsymbol)
- [captureRejections](csi_controller.CSIController.md#capturerejections)
- [defaultMaxListeners](csi_controller.CSIController.md#defaultmaxlisteners)
- [errorMonitor](csi_controller.CSIController.md#errormonitor)

### Methods

- [addListener](csi_controller.CSIController.md#addlistener)
- [createInstanceAPIRouter](csi_controller.CSIController.md#createinstanceapirouter)
- [emit](csi_controller.CSIController.md#emit)
- [eventNames](csi_controller.CSIController.md#eventnames)
- [getInfo](csi_controller.CSIController.md#getinfo)
- [getMaxListeners](csi_controller.CSIController.md#getmaxlisteners)
- [handleHandshake](csi_controller.CSIController.md#handlehandshake)
- [handleSupervisorConnect](csi_controller.CSIController.md#handlesupervisorconnect)
- [hookupStreams](csi_controller.CSIController.md#hookupstreams)
- [listenerCount](csi_controller.CSIController.md#listenercount)
- [listeners](csi_controller.CSIController.md#listeners)
- [main](csi_controller.CSIController.md#main)
- [off](csi_controller.CSIController.md#off)
- [on](csi_controller.CSIController.md#on)
- [once](csi_controller.CSIController.md#once)
- [prependListener](csi_controller.CSIController.md#prependlistener)
- [prependOnceListener](csi_controller.CSIController.md#prependoncelistener)
- [rawListeners](csi_controller.CSIController.md#rawlisteners)
- [removeAllListeners](csi_controller.CSIController.md#removealllisteners)
- [removeListener](csi_controller.CSIController.md#removelistener)
- [sendConfig](csi_controller.CSIController.md#sendconfig)
- [setMaxListeners](csi_controller.CSIController.md#setmaxlisteners)
- [start](csi_controller.CSIController.md#start)
- [startSupervisor](csi_controller.CSIController.md#startsupervisor)
- [supervisorStopped](csi_controller.CSIController.md#supervisorstopped)
- [getEventListener](csi_controller.CSIController.md#geteventlistener)
- [listenerCount](csi_controller.CSIController.md#listenercount)
- [on](csi_controller.CSIController.md#on)
- [once](csi_controller.CSIController.md#once)

## Constructors

### constructor

• **new CSIController**(`id`, `sequence`, `appConfig`, `sequenceArgs`, `communicationHandler`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `sequence` | [`Sequence`](sequence.Sequence.md) |
| `appConfig` | `AppConfig` |
| `sequenceArgs` | `undefined` \| `any`[] |
| `communicationHandler` | `CommunicationHandler` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/host/src/lib/csi-controller.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L52)

## Properties

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L27)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L48)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L31)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L25)

___

### info

• **info**: `Object` = `{}`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `created?` | `Date` |
| `ports?` | `any` |
| `started?` | `Date` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L33)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L38)

___

### logger

• **logger**: `Console`

#### Defined in

[packages/host/src/lib/csi-controller.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L49)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L32)

___

### sequence

• **sequence**: [`Sequence`](sequence.Sequence.md)

#### Defined in

[packages/host/src/lib/csi-controller.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L26)

___

### sequenceArgs

• **sequenceArgs**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L29)

___

### startPromise

• **startPromise**: `Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L40)

___

### startResolver

• `Optional` **startResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L39)

___

### status

• `Optional` **status**: `FunctionDefinition`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L30)

___

### superVisorProcess

• `Optional` **superVisorProcess**: `ChildProcess`

#### Defined in

[packages/host/src/lib/csi-controller.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L28)

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

▸ **addListener**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:72

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:241](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L241)

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

### getInfo

▸ **getInfo**(): `Promise`<`Object`\>

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:324](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L324)

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

### handleHandshake

▸ **handleHandshake**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:196](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L196)

___

### handleSupervisorConnect

▸ **handleSupervisorConnect**(`streams`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `DownstreamStreamsConfig`<``true``\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:229](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L229)

___

### hookupStreams

▸ **hookupStreams**(`streams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `DownstreamStreamsConfig`<``true``\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:154](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L154)

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

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L89)

___

### off

▸ **off**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:73

___

### once

▸ **once**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:74

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:85

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

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

▸ **removeAllListeners**(`event?`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:75

___

### sendConfig

▸ **sendConfig**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:218](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L218)

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`CSIController`](csi_controller.CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`CSIController`](csi_controller.CSIController.md)

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### start

▸ **start**(): `Promise`<`unknown`\>

#### Returns

`Promise`<`unknown`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:76](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L76)

___

### startSupervisor

▸ **startSupervisor**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:105](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L105)

___

### supervisorStopped

▸ **supervisorStopped**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:130](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/csi-controller.ts#L130)

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

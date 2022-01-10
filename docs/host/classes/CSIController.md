[@scramjet/host](../README.md) / CSIController

# Class: CSIController

## Hierarchy

- `EventEmitter`

  ↳ **`CSIController`**

## Table of contents

### Constructors

- [constructor](CSIController.md#constructor)

### Properties

- [\_endOfSequence](CSIController.md#_endofsequence)
- [apiInputEnabled](CSIController.md#apiinputenabled)
- [apiOutput](CSIController.md#apioutput)
- [appConfig](CSIController.md#appconfig)
- [communicationHandler](CSIController.md#communicationhandler)
- [config](CSIController.md#config)
- [controlDataStream](CSIController.md#controldatastream)
- [id](CSIController.md#id)
- [info](CSIController.md#info)
- [initResolver](CSIController.md#initresolver)
- [instancePromise](CSIController.md#instancepromise)
- [logger](CSIController.md#logger)
- [provides](CSIController.md#provides)
- [requires](CSIController.md#requires)
- [router](CSIController.md#router)
- [sequence](CSIController.md#sequence)
- [sequenceArgs](CSIController.md#sequenceargs)
- [startPromise](CSIController.md#startpromise)
- [startResolver](CSIController.md#startresolver)
- [captureRejectionSymbol](CSIController.md#capturerejectionsymbol)
- [captureRejections](CSIController.md#capturerejections)
- [defaultMaxListeners](CSIController.md#defaultmaxlisteners)
- [errorMonitor](CSIController.md#errormonitor)

### Accessors

- [endOfSequence](CSIController.md#endofsequence)
- [instanceAdapter](CSIController.md#instanceadapter)

### Methods

- [addListener](CSIController.md#addlistener)
- [confirmInputHook](CSIController.md#confirminputhook)
- [createInstanceAPIRouter](CSIController.md#createinstanceapirouter)
- [emit](CSIController.md#emit)
- [eventNames](CSIController.md#eventnames)
- [getInfo](CSIController.md#getinfo)
- [getInputStream](CSIController.md#getinputstream)
- [getLogStream](CSIController.md#getlogstream)
- [getMaxListeners](CSIController.md#getmaxlisteners)
- [getOutputStream](CSIController.md#getoutputstream)
- [handleHandshake](CSIController.md#handlehandshake)
- [handleInstanceConnect](CSIController.md#handleinstanceconnect)
- [handleKeepAliveCommand](CSIController.md#handlekeepalivecommand)
- [handleSequenceCompleted](CSIController.md#handlesequencecompleted)
- [handleSequenceStopped](CSIController.md#handlesequencestopped)
- [hookupStreams](CSIController.md#hookupstreams)
- [instanceStopped](CSIController.md#instancestopped)
- [listenerCount](CSIController.md#listenercount)
- [listeners](CSIController.md#listeners)
- [main](CSIController.md#main)
- [off](CSIController.md#off)
- [on](CSIController.md#on)
- [once](CSIController.md#once)
- [prependListener](CSIController.md#prependlistener)
- [prependOnceListener](CSIController.md#prependoncelistener)
- [rawListeners](CSIController.md#rawlisteners)
- [removeAllListeners](CSIController.md#removealllisteners)
- [removeListener](CSIController.md#removelistener)
- [setMaxListeners](CSIController.md#setmaxlisteners)
- [start](CSIController.md#start)
- [startInstance](CSIController.md#startinstance)
- [getEventListener](CSIController.md#geteventlistener)
- [listenerCount](CSIController.md#listenercount)
- [on](CSIController.md#on)
- [once](CSIController.md#once)

## Constructors

### constructor

• **new CSIController**(`id`, `sequence`, `appConfig`, `sequenceArgs`, `communicationHandler`, `csiConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `sequence` | `SequenceInfo` |
| `appConfig` | `AppConfig` |
| `sequenceArgs` | `undefined` \| `any`[] |
| `communicationHandler` | `CommunicationHandler` |
| `csiConfig` | `CSIConfig` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/host/src/lib/csi-controller.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L101)

## Properties

### \_endOfSequence

• `Optional` **\_endOfSequence**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L79)

___

### apiInputEnabled

• **apiInputEnabled**: `boolean` = `true`

#### Defined in

[packages/host/src/lib/csi-controller.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L67)

___

### apiOutput

• **apiOutput**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L66)

___

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L50)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L99)

___

### config

• **config**: `CSIConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L48)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L53)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L43)

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

[packages/host/src/lib/csi-controller.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L55)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L62)

___

### instancePromise

• `Optional` **instancePromise**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L51)

___

### logger

• **logger**: `Console`

#### Defined in

[packages/host/src/lib/csi-controller.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L45)

___

### provides

• `Optional` **provides**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L60)

___

### requires

• `Optional` **requires**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L61)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L54)

___

### sequence

• **sequence**: `SequenceInfo`

#### Defined in

[packages/host/src/lib/csi-controller.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L49)

___

### sequenceArgs

• **sequenceArgs**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L52)

___

### startPromise

• **startPromise**: `Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L64)

___

### startResolver

• `Optional` **startResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L63)

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](CPMConnector.md#capturerejectionsymbol)

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

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](CPMConnector.md#errormonitor)

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

## Accessors

### endOfSequence

• `get` **endOfSequence**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L81)

• `set` **endOfSequence**(`prm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | `Promise`<`number`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L89)

___

### instanceAdapter

• `get` **instanceAdapter**(): `ILifeCycleAdapterRun`

#### Returns

`ILifeCycleAdapterRun`

#### Defined in

[packages/host/src/lib/csi-controller.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L71)

## Methods

### addListener

▸ **addListener**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:72

___

### confirmInputHook

▸ **confirmInputHook**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:458](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L458)

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:321](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L321)

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

[packages/host/src/lib/csi-controller.ts:435](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L435)

___

### getInputStream

▸ **getInputStream**(): `WritableStream`<`any`\>

#### Returns

`WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:450](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L450)

___

### getLogStream

▸ **getLogStream**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/csi-controller.ts:454](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L454)

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

### getOutputStream

▸ **getOutputStream**(): `ReadableStream`<`any`\>

#### Returns

`ReadableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:446](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L446)

___

### handleHandshake

▸ **handleHandshake**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `EncodedMessage`<`PING`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:284](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L284)

___

### handleInstanceConnect

▸ **handleInstanceConnect**(`streams`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `DownstreamStreamsConfig`<``true``\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:310](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L310)

___

### handleKeepAliveCommand

▸ **handleKeepAliveCommand**(`message`): `EncodedMessage`<`ALIVE`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `EncodedMessage`<`ALIVE`\> |

#### Returns

`EncodedMessage`<`ALIVE`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:510](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L510)

___

### handleSequenceCompleted

▸ **handleSequenceCompleted**(`message`): `Promise`<`EncodedMessage`<`SEQUENCE_COMPLETED`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `EncodedMessage`<`SEQUENCE_COMPLETED`\> |

#### Returns

`Promise`<`EncodedMessage`<`SEQUENCE_COMPLETED`\>\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:465](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L465)

___

### handleSequenceStopped

▸ **handleSequenceStopped**(`message`): `Promise`<`EncodedMessage`<`SEQUENCE_STOPPED`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `EncodedMessage`<`SEQUENCE_STOPPED`\> |

#### Returns

`Promise`<`EncodedMessage`<`SEQUENCE_STOPPED`\>\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:486](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L486)

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

[packages/host/src/lib/csi-controller.ts:199](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L199)

___

### instanceStopped

▸ **instanceStopped**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L193)

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

[packages/host/src/lib/csi-controller.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L139)

___

### off

▸ **off**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:73

___

### once

▸ **once**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:74

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:85

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

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

▸ **removeAllListeners**(`event?`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:75

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`CSIController`](CSIController.md)

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

[packages/host/src/lib/csi-controller.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L126)

___

### startInstance

▸ **startInstance**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:155](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L155)

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

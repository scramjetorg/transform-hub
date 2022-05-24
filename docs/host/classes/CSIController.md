[@scramjet/host](../README.md) / [Exports](../modules.md) / CSIController

# Class: CSIController

Handles all Instance lifecycle, exposes instance's HTTP API.

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`CSIController`**

## Table of contents

### Properties

- [\_endOfSequence](CSIController.md#_endofsequence)
- [apiInputEnabled](CSIController.md#apiinputenabled)
- [apiOutput](CSIController.md#apioutput)
- [appConfig](CSIController.md#appconfig)
- [communicationHandler](CSIController.md#communicationhandler)
- [controlDataStream](CSIController.md#controldatastream)
- [finalizingPromise](CSIController.md#finalizingpromise)
- [heartBeatPromise](CSIController.md#heartbeatpromise)
- [heartBeatResolver](CSIController.md#heartbeatresolver)
- [heartBeatTicker](CSIController.md#heartbeatticker)
- [id](CSIController.md#id)
- [info](CSIController.md#info)
- [initResolver](CSIController.md#initresolver)
- [inputTopic](CSIController.md#inputtopic)
- [instancePromise](CSIController.md#instancepromise)
- [logMux](CSIController.md#logmux)
- [logger](CSIController.md#logger)
- [outputTopic](CSIController.md#outputtopic)
- [provides](CSIController.md#provides)
- [requires](CSIController.md#requires)
- [router](CSIController.md#router)
- [sequence](CSIController.md#sequence)
- [sequenceArgs](CSIController.md#sequenceargs)
- [startPromise](CSIController.md#startpromise)
- [startResolver](CSIController.md#startresolver)
- [sthConfig](CSIController.md#sthconfig)

### Methods

- [addListener](CSIController.md#addlistener)
- [cleanup](CSIController.md#cleanup)
- [createInstanceAPIRouter](CSIController.md#createinstanceapirouter)
- [emit](CSIController.md#emit)
- [eventNames](CSIController.md#eventnames)
- [finalize](CSIController.md#finalize)
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
- [heartBeatStart](CSIController.md#heartbeatstart)
- [heartBeatStop](CSIController.md#heartbeatstop)
- [heartBeatTick](CSIController.md#heartbeattick)
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

### Constructors

- [constructor](CSIController.md#constructor)

### Accessors

- [endOfSequence](CSIController.md#endofsequence)
- [instanceAdapter](CSIController.md#instanceadapter)

## Properties

### \_endOfSequence

• `Optional` **\_endOfSequence**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L117)

___

### apiInputEnabled

• **apiInputEnabled**: `boolean` = `true`

#### Defined in

[packages/host/src/lib/csi-controller.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L87)

___

### apiOutput

• **apiOutput**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L86)

___

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L62)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L137)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L65)

___

### finalizingPromise

• `Optional` **finalizingPromise**: `CancellablePromise`

#### Defined in

[packages/host/src/lib/csi-controller.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L107)

___

### heartBeatPromise

• `Optional` **heartBeatPromise**: `Promise`<`string`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L81)

___

### heartBeatResolver

• `Optional` **heartBeatResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L78)

___

### heartBeatTicker

• `Optional` **heartBeatTicker**: `Timeout`

#### Defined in

[packages/host/src/lib/csi-controller.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L83)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L57)

___

### info

• **info**: `Object` = `{}`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `created?` | `Date` |
| `ended?` | `Date` |
| `ports?` | `any` |
| `started?` | `Date` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L67)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L76)

___

### inputTopic

• `Optional` **inputTopic**: `string`

Topic to which the input stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L97)

___

### instancePromise

• `Optional` **instancePromise**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L63)

___

### logMux

• `Optional` **logMux**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L84)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/csi-controller.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L104)

___

### outputTopic

• `Optional` **outputTopic**: `string`

Topic to which the output stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L92)

___

### provides

• `Optional` **provides**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L73)

___

### requires

• `Optional` **requires**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L74)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L66)

___

### sequence

• **sequence**: `SequenceInfo`

#### Defined in

[packages/host/src/lib/csi-controller.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L61)

___

### sequenceArgs

• **sequenceArgs**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L64)

___

### startPromise

• **startPromise**: `Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L80)

___

### startResolver

• `Optional` **startResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L77)

___

### sthConfig

• **sthConfig**: `STHConfiguration`

#### Defined in

[packages/host/src/lib/csi-controller.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L60)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:297](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L297)

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:433](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L433)

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

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

### finalize

▸ **finalize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:303](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L303)

___

### getInfo

▸ **getInfo**(): `Promise`<`Instance`\>

#### Returns

`Promise`<`Instance`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:599](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L599)

___

### getInputStream

▸ **getInputStream**(): `WritableStream`<`any`\>

#### Returns

`WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:618](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L618)

___

### getLogStream

▸ **getLogStream**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/csi-controller.ts:622](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L622)

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

### getOutputStream

▸ **getOutputStream**(): `ReadableStream`<`any`\>

#### Returns

`ReadableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:614](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L614)

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

[packages/host/src/lib/csi-controller.ts:394](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L394)

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

[packages/host/src/lib/csi-controller.ts:421](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L421)

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

[packages/host/src/lib/csi-controller.ts:672](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L672)

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

[packages/host/src/lib/csi-controller.ts:627](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L627)

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

[packages/host/src/lib/csi-controller.ts:645](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L645)

___

### heartBeatStart

▸ **heartBeatStart**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:258](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L258)

___

### heartBeatStop

▸ **heartBeatStop**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:271](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L271)

___

### heartBeatTick

▸ **heartBeatTick**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:264](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L264)

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

[packages/host/src/lib/csi-controller.ts:319](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L319)

___

### instanceStopped

▸ **instanceStopped**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:311](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L311)

___

### listenerCount

▸ **listenerCount**<`E`\>(`event`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

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
| `E` | extends keyof `Events` |

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

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:181](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L181)

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

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
| `E` | extends keyof `Events` |

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

▸ **removeAllListeners**<`E`\>(`event?`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`CSIController`](CSIController.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`CSIController`](CSIController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`CSIController`](CSIController.md)

#### Inherited from

TypedEmitter.setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

___

### start

▸ **start**(): `Promise`<`unknown`\>

#### Returns

`Promise`<`unknown`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:168](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L168)

___

### startInstance

▸ **startInstance**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:207](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L207)

## Constructors

### constructor

• **new CSIController**(`id`, `sequence`, `payload`, `communicationHandler`, `sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `sequence` | `SequenceInfo` |
| `payload` | `StartSequencePayload` |
| `communicationHandler` | `CommunicationHandler` |
| `sthConfig` | `STHConfiguration` |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/csi-controller.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L139)

## Accessors

### endOfSequence

• `get` **endOfSequence**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L119)

• `set` **endOfSequence**(`prm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | `Promise`<`number`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L127)

___

### instanceAdapter

• `get` **instanceAdapter**(): `ILifeCycleAdapterRun`

#### Returns

`ILifeCycleAdapterRun`

#### Defined in

[packages/host/src/lib/csi-controller.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L109)

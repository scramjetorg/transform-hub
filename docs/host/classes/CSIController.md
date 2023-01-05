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
- [args](CSIController.md#args)
- [communicationHandler](CSIController.md#communicationhandler)
- [controlDataStream](CSIController.md#controldatastream)
- [finalizingPromise](CSIController.md#finalizingpromise)
- [heartBeatPromise](CSIController.md#heartbeatpromise)
- [heartBeatResolver](CSIController.md#heartbeatresolver)
- [heartBeatTicker](CSIController.md#heartbeatticker)
- [id](CSIController.md#id)
- [info](CSIController.md#info)
- [initResolver](CSIController.md#initresolver)
- [inputRouted](CSIController.md#inputrouted)
- [inputTopic](CSIController.md#inputtopic)
- [instancePromise](CSIController.md#instancepromise)
- [limits](CSIController.md#limits)
- [logMux](CSIController.md#logmux)
- [logger](CSIController.md#logger)
- [outputRouted](CSIController.md#outputrouted)
- [outputTopic](CSIController.md#outputtopic)
- [provides](CSIController.md#provides)
- [requires](CSIController.md#requires)
- [router](CSIController.md#router)
- [sequence](CSIController.md#sequence)
- [status](CSIController.md#status)
- [sthConfig](CSIController.md#sthconfig)
- [terminated](CSIController.md#terminated)

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
- [setExitInfo](CSIController.md#setexitinfo)
- [setMaxListeners](CSIController.md#setmaxlisteners)
- [start](CSIController.md#start)
- [startInstance](CSIController.md#startinstance)

### Constructors

- [constructor](CSIController.md#constructor)

### Accessors

- [endOfSequence](CSIController.md#endofsequence)
- [instanceAdapter](CSIController.md#instanceadapter)
- [isRunning](CSIController.md#isrunning)
- [lastStats](CSIController.md#laststats)

## Properties

### \_endOfSequence

• `Optional` **\_endOfSequence**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:149](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L149)

___

### apiInputEnabled

• **apiInputEnabled**: `boolean` = `true`

#### Defined in

[packages/host/src/lib/csi-controller.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L116)

___

### apiOutput

• **apiOutput**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L115)

___

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L89)

___

### args

• **args**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L91)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L169)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L92)

___

### finalizingPromise

• `Optional` **finalizingPromise**: `CancellablePromise`

#### Defined in

[packages/host/src/lib/csi-controller.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L139)

___

### heartBeatPromise

• `Optional` **heartBeatPromise**: `Promise`<`string`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L110)

___

### heartBeatResolver

• `Optional` **heartBeatResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L109)

___

### heartBeatTicker

• `Optional` **heartBeatTicker**: `Timeout`

#### Defined in

[packages/host/src/lib/csi-controller.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L112)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L68)

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

[packages/host/src/lib/csi-controller.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L94)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L108)

___

### inputRouted

• **inputRouted**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/csi-controller.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L129)

___

### inputTopic

• `Optional` **inputTopic**: `string`

Topic to which the input stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L126)

___

### instancePromise

• `Optional` **instancePromise**: `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L90)

___

### limits

• **limits**: `InstanceLimits` = `{}`

#### Defined in

[packages/host/src/lib/csi-controller.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L87)

___

### logMux

• `Optional` **logMux**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L113)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/csi-controller.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L136)

___

### outputRouted

• **outputRouted**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/csi-controller.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L128)

___

### outputTopic

• `Optional` **outputTopic**: `string`

Topic to which the output stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L121)

___

### provides

• `Optional` **provides**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:105](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L105)

___

### requires

• `Optional` **requires**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:106](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L106)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L93)

___

### sequence

• **sequence**: `SequenceInfo`

#### Defined in

[packages/host/src/lib/csi-controller.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L88)

___

### status

• **status**: `InstanceStatus`

#### Defined in

[packages/host/src/lib/csi-controller.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L100)

___

### sthConfig

• **sthConfig**: `STHConfiguration`

#### Defined in

[packages/host/src/lib/csi-controller.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L86)

___

### terminated

• `Optional` **terminated**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitcode` | `number` |
| `reason` | `string` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L101)

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

[packages/host/src/lib/csi-controller.ts:396](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L396)

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:556](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L556)

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

[packages/host/src/lib/csi-controller.ts:404](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L404)

___

### getInfo

▸ **getInfo**(): `GetInstanceResponse`

#### Returns

`GetInstanceResponse`

#### Defined in

[packages/host/src/lib/csi-controller.ts:763](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L763)

___

### getInputStream

▸ **getInputStream**(): `WritableStream`<`any`\>

#### Returns

`WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:787](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L787)

___

### getLogStream

▸ **getLogStream**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/csi-controller.ts:791](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L791)

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

[packages/host/src/lib/csi-controller.ts:783](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L783)

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

[packages/host/src/lib/csi-controller.ts:519](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L519)

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

[packages/host/src/lib/csi-controller.ts:544](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L544)

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

[packages/host/src/lib/csi-controller.ts:842](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L842)

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

[packages/host/src/lib/csi-controller.ts:796](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L796)

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

[packages/host/src/lib/csi-controller.ts:815](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L815)

___

### heartBeatTick

▸ **heartBeatTick**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:322](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L322)

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

[packages/host/src/lib/csi-controller.ts:435](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L435)

___

### instanceStopped

▸ **instanceStopped**(): `undefined` \| `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Returns

`undefined` \| `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:427](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L427)

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

[packages/host/src/lib/csi-controller.ts:224](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L224)

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

### setExitInfo

▸ **setExitInfo**(`exitcode`, `reason`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `exitcode` | `number` |
| `reason` | `string` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:850](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L850)

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

[packages/host/src/lib/csi-controller.ts:202](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L202)

___

### startInstance

▸ **startInstance**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:261](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L261)

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

[packages/host/src/lib/csi-controller.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L171)

## Accessors

### endOfSequence

• `get` **endOfSequence**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:151](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L151)

• `set` **endOfSequence**(`prm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | `Promise`<`number`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L159)

___

### instanceAdapter

• `get` **instanceAdapter**(): `ILifeCycleAdapterRun`

#### Returns

`ILifeCycleAdapterRun`

#### Defined in

[packages/host/src/lib/csi-controller.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L141)

___

### isRunning

• `get` **isRunning**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/host/src/lib/csi-controller.ts:402](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L402)

___

### lastStats

• `get` **lastStats**(): `InstanceStats`

#### Returns

`InstanceStats`

#### Defined in

[packages/host/src/lib/csi-controller.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L75)

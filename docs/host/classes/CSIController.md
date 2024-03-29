[@scramjet/host](../README.md) / [Exports](../modules.md) / CSIController

# Class: CSIController

Handles all Instance lifecycle, exposes instance's HTTP API.

**`Todo`**

write interface for CSIController and CSIDispatcher

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
- [executionTime](CSIController.md#executiontime)
- [finalizingPromise](CSIController.md#finalizingpromise)
- [heartBeatPromise](CSIController.md#heartbeatpromise)
- [heartBeatResolver](CSIController.md#heartbeatresolver)
- [heartBeatTicker](CSIController.md#heartbeatticker)
- [id](CSIController.md#id)
- [info](CSIController.md#info)
- [initResolver](CSIController.md#initresolver)
- [inputHeadersSent](CSIController.md#inputheaderssent)
- [inputRouted](CSIController.md#inputrouted)
- [inputTopic](CSIController.md#inputtopic)
- [instancePromise](CSIController.md#instancepromise)
- [limits](CSIController.md#limits)
- [localEmitter](CSIController.md#localemitter)
- [logMux](CSIController.md#logmux)
- [logger](CSIController.md#logger)
- [outputEncoding](CSIController.md#outputencoding)
- [outputRouted](CSIController.md#outputrouted)
- [outputTopic](CSIController.md#outputtopic)
- [provides](CSIController.md#provides)
- [requires](CSIController.md#requires)
- [router](CSIController.md#router)
- [runnerSystemInfo](CSIController.md#runnersysteminfo)
- [sequence](CSIController.md#sequence)
- [status](CSIController.md#status)
- [terminated](CSIController.md#terminated)

### Methods

- [addListener](CSIController.md#addlistener)
- [cleanup](CSIController.md#cleanup)
- [createInstanceAPIRouter](CSIController.md#createinstanceapirouter)
- [emit](CSIController.md#emit)
- [emitEvent](CSIController.md#emitevent)
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
- [kill](CSIController.md#kill)
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

[packages/host/src/lib/csi-controller.ts:155](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L155)

___

### apiInputEnabled

• **apiInputEnabled**: `boolean` = `true`

#### Defined in

[packages/host/src/lib/csi-controller.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L119)

___

### apiOutput

• **apiOutput**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L118)

___

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L98)

___

### args

• **args**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L100)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L179)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L101)

___

### executionTime

• **executionTime**: `number` = `-1`

#### Defined in

[packages/host/src/lib/csi-controller.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L121)

___

### finalizingPromise

• `Optional` **finalizingPromise**: `CancellablePromise`

#### Defined in

[packages/host/src/lib/csi-controller.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L145)

___

### heartBeatPromise

• `Optional` **heartBeatPromise**: `Promise`<`string`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L113)

___

### heartBeatResolver

• `Optional` **heartBeatResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L112)

___

### heartBeatTicker

• `Optional` **heartBeatTicker**: `Timeout`

#### Defined in

[packages/host/src/lib/csi-controller.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L115)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L77)

___

### info

• **info**: [`CSIControllerInfo`](../modules.md#csicontrollerinfo) = `{}`

#### Defined in

[packages/host/src/lib/csi-controller.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L103)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L111)

___

### inputHeadersSent

• **inputHeadersSent**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/csi-controller.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L122)

___

### inputRouted

• **inputRouted**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/csi-controller.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L135)

___

### inputTopic

• `Optional` **inputTopic**: `string`

Topic to which the input stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L132)

___

### instancePromise

• `Optional` **instancePromise**: `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L99)

___

### limits

• **limits**: `InstanceLimits` = `{}`

#### Defined in

[packages/host/src/lib/csi-controller.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L95)

___

### localEmitter

• **localEmitter**: `EventEmitter` & { `lastEvents`: { `[evname: string]`: `any`;  }  }

#### Defined in

[packages/host/src/lib/csi-controller.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L175)

___

### logMux

• `Optional` **logMux**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L116)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/csi-controller.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L142)

___

### outputEncoding

• **outputEncoding**: `BufferEncoding` = `"utf-8"`

#### Defined in

[packages/host/src/lib/csi-controller.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L109)

___

### outputRouted

• **outputRouted**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/csi-controller.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L134)

___

### outputTopic

• `Optional` **outputTopic**: `string`

Topic to which the output stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L127)

___

### provides

• `Optional` **provides**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L107)

___

### requires

• `Optional` **requires**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L108)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L102)

___

### runnerSystemInfo

• **runnerSystemInfo**: `undefined` \| `Record`<`string`, `string`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L96)

___

### sequence

• **sequence**: `SequenceInfo`

#### Defined in

[packages/host/src/lib/csi-controller.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L97)

___

### status

• **status**: `InstanceStatus`

#### Defined in

[packages/host/src/lib/csi-controller.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L104)

___

### terminated

• `Optional` **terminated**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exitcode` | `number` |
| `reason` | `string` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:105](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L105)

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

[packages/host/src/lib/csi-controller.ts:352](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L352)

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:562](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L562)

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

### emitEvent

▸ **emitEvent**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `EventMessageData` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:727](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L727)

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

[packages/host/src/lib/csi-controller.ts:360](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L360)

___

### getInfo

▸ **getInfo**(): `GetInstanceResponse`

#### Returns

`GetInstanceResponse`

#### Defined in

[packages/host/src/lib/csi-controller.ts:800](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L800)

___

### getInputStream

▸ **getInputStream**(): `WritableStream`<`any`\>

#### Returns

`WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:828](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L828)

___

### getLogStream

▸ **getLogStream**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/csi-controller.ts:832](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L832)

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

[packages/host/src/lib/csi-controller.ts:824](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L824)

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

[packages/host/src/lib/csi-controller.ts:500](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L500)

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

[packages/host/src/lib/csi-controller.ts:543](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L543)

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

[packages/host/src/lib/csi-controller.ts:883](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L883)

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

[packages/host/src/lib/csi-controller.ts:837](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L837)

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

[packages/host/src/lib/csi-controller.ts:856](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L856)

___

### heartBeatTick

▸ **heartBeatTick**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:345](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L345)

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

[packages/host/src/lib/csi-controller.ts:393](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L393)

___

### instanceStopped

▸ **instanceStopped**(): `undefined` \| `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Returns

`undefined` \| `Promise`<{ `exitcode`: `number` ; `message`: `string` ; `status`: `InstanceStatus`  }\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:383](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L383)

___

### kill

▸ **kill**(`opts?`): `Promise`<`void`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `Object` | `undefined` |
| `opts.removeImmediately` | `boolean` | `false` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:776](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L776)

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

[packages/host/src/lib/csi-controller.ts:245](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L245)

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

[packages/host/src/lib/csi-controller.ts:891](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L891)

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

▸ **start**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:219](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L219)

___

### startInstance

▸ **startInstance**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:289](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L289)

## Constructors

### constructor

• **new CSIController**(`handshakeMessage`, `communicationHandler`, `sthConfig`, `hostProxy`, `adapter?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `handshakeMessage` | `Omit`<`PingMessageData`, ``"created"``\> | `undefined` |
| `communicationHandler` | `ICommunicationHandler` | `undefined` |
| `sthConfig` | `STHConfiguration` | `undefined` |
| `hostProxy` | `HostProxy` | `undefined` |
| `adapter` | `string` | `sthConfig.runtimeAdapter` |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/csi-controller.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L177)

## Accessors

### endOfSequence

• `get` **endOfSequence**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:157](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L157)

• `set` **endOfSequence**(`prm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | `Promise`<`number`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L165)

___

### instanceAdapter

• `get` **instanceAdapter**(): `ILifeCycleAdapterRun`

#### Returns

`ILifeCycleAdapterRun`

#### Defined in

[packages/host/src/lib/csi-controller.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L147)

___

### isRunning

• `get` **isRunning**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/host/src/lib/csi-controller.ts:358](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L358)

___

### lastStats

• `get` **lastStats**(): `InstanceStats`

#### Returns

`InstanceStats`

#### Defined in

[packages/host/src/lib/csi-controller.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L85)

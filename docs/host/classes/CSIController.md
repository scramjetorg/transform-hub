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
- [limits](CSIController.md#limits)
- [logMux](CSIController.md#logmux)
- [logger](CSIController.md#logger)
- [outputTopic](CSIController.md#outputtopic)
- [provides](CSIController.md#provides)
- [requires](CSIController.md#requires)
- [router](CSIController.md#router)
- [sequence](CSIController.md#sequence)
- [sequenceArgs](CSIController.md#sequenceargs)
- [status](CSIController.md#status)
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
- [isRunning](CSIController.md#isrunning)
- [lastStats](CSIController.md#laststats)

## Properties

### \_endOfSequence

• `Optional` **\_endOfSequence**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L140)

___

### apiInputEnabled

• **apiInputEnabled**: `boolean` = `true`

#### Defined in

[packages/host/src/lib/csi-controller.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L110)

___

### apiOutput

• **apiOutput**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L109)

___

### appConfig

• **appConfig**: `AppConfig`

#### Defined in

[packages/host/src/lib/csi-controller.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L87)

___

### communicationHandler

• **communicationHandler**: `ICommunicationHandler`

#### Defined in

[packages/host/src/lib/csi-controller.ts:160](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L160)

___

### controlDataStream

• `Optional` **controlDataStream**: `DataStream`

#### Defined in

[packages/host/src/lib/csi-controller.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L90)

___

### finalizingPromise

• `Optional` **finalizingPromise**: `CancellablePromise`

#### Defined in

[packages/host/src/lib/csi-controller.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L130)

___

### heartBeatPromise

• `Optional` **heartBeatPromise**: `Promise`<`string`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L104)

___

### heartBeatResolver

• `Optional` **heartBeatResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L103)

___

### heartBeatTicker

• `Optional` **heartBeatTicker**: `Timeout`

#### Defined in

[packages/host/src/lib/csi-controller.ts:106](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L106)

___

### id

• **id**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L66)

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

[packages/host/src/lib/csi-controller.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L92)

___

### initResolver

• `Optional` **initResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[packages/host/src/lib/csi-controller.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L102)

___

### inputTopic

• `Optional` **inputTopic**: `string`

Topic to which the input stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L120)

___

### instancePromise

• `Optional` **instancePromise**: `Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L88)

___

### limits

• **limits**: `InstanceLimits` = `{}`

#### Defined in

[packages/host/src/lib/csi-controller.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L85)

___

### logMux

• `Optional` **logMux**: `PassThrough`

#### Defined in

[packages/host/src/lib/csi-controller.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L107)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/csi-controller.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L127)

___

### outputTopic

• `Optional` **outputTopic**: `string`

Topic to which the output stream should be routed

#### Defined in

[packages/host/src/lib/csi-controller.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L115)

___

### provides

• `Optional` **provides**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L99)

___

### requires

• `Optional` **requires**: `string`

#### Defined in

[packages/host/src/lib/csi-controller.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L100)

___

### router

• `Optional` **router**: `APIRoute`

#### Defined in

[packages/host/src/lib/csi-controller.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L91)

___

### sequence

• **sequence**: `SequenceInfo`

#### Defined in

[packages/host/src/lib/csi-controller.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L86)

___

### sequenceArgs

• **sequenceArgs**: `undefined` \| `any`[]

#### Defined in

[packages/host/src/lib/csi-controller.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L89)

___

### status

• **status**: `InstanceStatus`

#### Defined in

[packages/host/src/lib/csi-controller.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L98)

___

### sthConfig

• **sthConfig**: `STHConfiguration`

#### Defined in

[packages/host/src/lib/csi-controller.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L84)

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

[packages/host/src/lib/csi-controller.ts:343](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L343)

___

### createInstanceAPIRouter

▸ **createInstanceAPIRouter**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:491](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L491)

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

[packages/host/src/lib/csi-controller.ts:351](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L351)

___

### getInfo

▸ **getInfo**(): `Instance`

#### Returns

`Instance`

#### Defined in

[packages/host/src/lib/csi-controller.ts:679](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L679)

___

### getInputStream

▸ **getInputStream**(): `WritableStream`<`any`\>

#### Returns

`WritableStream`<`any`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:697](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L697)

___

### getLogStream

▸ **getLogStream**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/csi-controller.ts:701](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L701)

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

[packages/host/src/lib/csi-controller.ts:693](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L693)

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

[packages/host/src/lib/csi-controller.ts:454](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L454)

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

[packages/host/src/lib/csi-controller.ts:479](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L479)

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

[packages/host/src/lib/csi-controller.ts:751](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L751)

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

[packages/host/src/lib/csi-controller.ts:706](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L706)

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

[packages/host/src/lib/csi-controller.ts:724](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L724)

___

### heartBeatTick

▸ **heartBeatTick**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:297](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L297)

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

[packages/host/src/lib/csi-controller.ts:371](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L371)

___

### instanceStopped

▸ **instanceStopped**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:363](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L363)

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

[packages/host/src/lib/csi-controller.ts:208](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L208)

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

[packages/host/src/lib/csi-controller.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L193)

___

### startInstance

▸ **startInstance**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:235](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L235)

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

[packages/host/src/lib/csi-controller.ts:162](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L162)

## Accessors

### endOfSequence

• `get` **endOfSequence**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[packages/host/src/lib/csi-controller.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L142)

• `set` **endOfSequence**(`prm`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | `Promise`<`number`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/csi-controller.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L150)

___

### instanceAdapter

• `get` **instanceAdapter**(): `ILifeCycleAdapterRun`

#### Returns

`ILifeCycleAdapterRun`

#### Defined in

[packages/host/src/lib/csi-controller.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L132)

___

### isRunning

• `get` **isRunning**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/host/src/lib/csi-controller.ts:349](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L349)

___

### lastStats

• `get` **lastStats**(): `InstanceStats`

#### Returns

`InstanceStats`

#### Defined in

[packages/host/src/lib/csi-controller.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L73)

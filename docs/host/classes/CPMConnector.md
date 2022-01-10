[@scramjet/host](../README.md) / CPMConnector

# Class: CPMConnector

## Hierarchy

- `EventEmitter`

  ↳ **`CPMConnector`**

## Table of contents

### Constructors

- [constructor](CPMConnector.md#constructor)

### Properties

- [MAX\_CONNECTION\_ATTEMPTS](CPMConnector.md#max_connection_attempts)
- [MAX\_RECONNECTION\_ATTEMPTS](CPMConnector.md#max_reconnection_attempts)
- [RECONNECT\_INTERVAL](CPMConnector.md#reconnect_interval)
- [apiServer](CPMConnector.md#apiserver)
- [communicationChannel](CPMConnector.md#communicationchannel)
- [communicationStream](CPMConnector.md#communicationstream)
- [config](CPMConnector.md#config)
- [connected](CPMConnector.md#connected)
- [connection](CPMConnector.md#connection)
- [connectionAttempts](CPMConnector.md#connectionattempts)
- [cpmURL](CPMConnector.md#cpmurl)
- [customId](CPMConnector.md#customid)
- [info](CPMConnector.md#info)
- [isReconnecting](CPMConnector.md#isreconnecting)
- [loadCheck](CPMConnector.md#loadcheck)
- [loadInterval](CPMConnector.md#loadinterval)
- [logger](CPMConnector.md#logger)
- [verserClient](CPMConnector.md#verserclient)
- [wasConnected](CPMConnector.md#wasconnected)
- [captureRejectionSymbol](CPMConnector.md#capturerejectionsymbol)
- [captureRejections](CPMConnector.md#capturerejections)
- [defaultMaxListeners](CPMConnector.md#defaultmaxlisteners)
- [errorMonitor](CPMConnector.md#errormonitor)

### Methods

- [addListener](CPMConnector.md#addlistener)
- [attachServer](CPMConnector.md#attachserver)
- [connect](CPMConnector.md#connect)
- [emit](CPMConnector.md#emit)
- [eventNames](CPMConnector.md#eventnames)
- [getId](CPMConnector.md#getid)
- [getLoad](CPMConnector.md#getload)
- [getMaxListeners](CPMConnector.md#getmaxlisteners)
- [getNetworkInfo](CPMConnector.md#getnetworkinfo)
- [getTopic](CPMConnector.md#gettopic)
- [handleConnectionClose](CPMConnector.md#handleconnectionclose)
- [init](CPMConnector.md#init)
- [listenerCount](CPMConnector.md#listenercount)
- [listeners](CPMConnector.md#listeners)
- [off](CPMConnector.md#off)
- [on](CPMConnector.md#on)
- [once](CPMConnector.md#once)
- [prependListener](CPMConnector.md#prependlistener)
- [prependOnceListener](CPMConnector.md#prependoncelistener)
- [rawListeners](CPMConnector.md#rawlisteners)
- [readInfoFile](CPMConnector.md#readinfofile)
- [reconnect](CPMConnector.md#reconnect)
- [registerChannels](CPMConnector.md#registerchannels)
- [removeAllListeners](CPMConnector.md#removealllisteners)
- [removeListener](CPMConnector.md#removelistener)
- [sendInstanceInfo](CPMConnector.md#sendinstanceinfo)
- [sendInstancesInfo](CPMConnector.md#sendinstancesinfo)
- [sendSequenceInfo](CPMConnector.md#sendsequenceinfo)
- [sendSequencesInfo](CPMConnector.md#sendsequencesinfo)
- [sendTopic](CPMConnector.md#sendtopic)
- [sendTopicInfo](CPMConnector.md#sendtopicinfo)
- [setLoadCheck](CPMConnector.md#setloadcheck)
- [setLoadCheckMessageSender](CPMConnector.md#setloadcheckmessagesender)
- [setMaxListeners](CPMConnector.md#setmaxlisteners)
- [getEventListener](CPMConnector.md#geteventlistener)
- [listenerCount](CPMConnector.md#listenercount)
- [on](CPMConnector.md#on)
- [once](CPMConnector.md#once)

## Constructors

### constructor

• **new CPMConnector**(`cpmUrl`, `config`, `server`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `cpmUrl` | `string` |
| `config` | `CPMConnectorOptions` |
| `server` | `Server` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/host/src/lib/cpm-connector.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L52)

## Properties

### MAX\_CONNECTION\_ATTEMPTS

• **MAX\_CONNECTION\_ATTEMPTS**: `number` = `100`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L30)

___

### MAX\_RECONNECTION\_ATTEMPTS

• **MAX\_RECONNECTION\_ATTEMPTS**: `number` = `100`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L31)

___

### RECONNECT\_INTERVAL

• **RECONNECT\_INTERVAL**: `number` = `2000`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L32)

___

### apiServer

• `Optional` **apiServer**: `Server`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L36)

___

### communicationChannel

• `Optional` **communicationChannel**: `Duplex`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L39)

___

### communicationStream

• `Optional` **communicationStream**: `StringStream`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L38)

___

### config

• **config**: `CPMConnectorOptions`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L35)

___

### connected

• **connected**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L37)

___

### connection

• `Optional` **connection**: `ClientRequest`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L43)

___

### connectionAttempts

• **connectionAttempts**: `number` = `0`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L46)

___

### cpmURL

• **cpmURL**: `string`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L47)

___

### customId

• **customId**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L41)

___

### info

• **info**: `STHInformation` = `{}`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L42)

___

### isReconnecting

• **isReconnecting**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L44)

___

### loadCheck

• `Optional` **loadCheck**: `LoadCheck`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L34)

___

### loadInterval

• `Optional` **loadInterval**: `Timeout`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L50)

___

### logger

• **logger**: `Console`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L40)

___

### verserClient

• **verserClient**: `VerserClient`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L48)

___

### wasConnected

• **wasConnected**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L45)

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

## Methods

### addListener

▸ **addListener**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:72

___

### attachServer

▸ **attachServer**(`server`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | `Server` & { `httpAllowHalfOpen?`: `boolean`  } |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L102)

___

### connect

▸ **connect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:153](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L153)

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

### getId

▸ **getId**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L68)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStatMessage`\>

#### Returns

`Promise`<`LoadCheckStatMessage`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:252](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L252)

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

### getNetworkInfo

▸ **getNetworkInfo**(): `Promise`<`NetworkInfo`[]\>

#### Returns

`Promise`<`NetworkInfo`[]\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:227](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L227)

___

### getTopic

▸ **getTopic**(`topic`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |

#### Returns

`Promise`<`Readable`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:324](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L324)

___

### handleConnectionClose

▸ **handleConnectionClose**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L187)

___

### init

▸ **init**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L72)

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

### off

▸ **off**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:73

___

### once

▸ **once**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:74

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:85

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

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

### readInfoFile

▸ **readInfoFile**(): `any`

#### Returns

`any`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L84)

___

### reconnect

▸ **reconnect**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:200](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L200)

___

### registerChannels

▸ **registerChannels**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L107)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:75

___

### sendInstanceInfo

▸ **sendInstanceInfo**(`instance`, `instanceStatus`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `Instance` |
| `instanceStatus` | `InstanceMessageCode` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:293](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L293)

___

### sendInstancesInfo

▸ **sendInstancesInfo**(`instances`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instances` | `Instance`[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:275](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L275)

___

### sendSequenceInfo

▸ **sendSequenceInfo**(`sequenceId`, `seqStatus`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |
| `seqStatus` | `SequenceMessageCode` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:285](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L285)

___

### sendSequencesInfo

▸ **sendSequencesInfo**(`sequences`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequences` | `GetSequencesResponse` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:265](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L265)

___

### sendTopic

▸ **sendTopic**(`topic`, `topicCfg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `topic` | `string` |
| `topicCfg` | `Object` |
| `topicCfg.contentType` | `string` |
| `topicCfg.stream` | `ReadableStream`<`any`\> \| `WritableStream`<`any`\> |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:307](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L307)

___

### sendTopicInfo

▸ **sendTopicInfo**(`data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Object` |
| `data.contentType?` | `string` |
| `data.provides?` | `string` |
| `data.requires?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:301](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L301)

___

### setLoadCheck

▸ **setLoadCheck**(`loadCheck`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `loadCheck` | `LoadCheck` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L64)

___

### setLoadCheckMessageSender

▸ **setLoadCheckMessageSender**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:241](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L241)

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

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

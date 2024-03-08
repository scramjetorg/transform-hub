[@scramjet/host](../README.md) / [Exports](../modules.md) / CPMConnector

# Class: CPMConnector

Provides communication with Manager.

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`CPMConnector`**

## Table of contents

### Properties

- [\_cpmSslCa](CPMConnector.md#_cpmsslca)
- [communicationStream](CPMConnector.md#communicationstream)
- [config](CPMConnector.md#config)
- [connected](CPMConnector.md#connected)
- [connection](CPMConnector.md#connection)
- [connectionAttempts](CPMConnector.md#connectionattempts)
- [cpmId](CPMConnector.md#cpmid)
- [customId](CPMConnector.md#customid)
- [info](CPMConnector.md#info)
- [isAbandoned](CPMConnector.md#isabandoned)
- [isReconnecting](CPMConnector.md#isreconnecting)
- [loadCheck](CPMConnector.md#loadcheck)
- [loadInterval](CPMConnector.md#loadinterval)
- [logger](CPMConnector.md#logger)
- [verserClient](CPMConnector.md#verserclient)
- [wasConnected](CPMConnector.md#wasconnected)

### Methods

- [addListener](CPMConnector.md#addlistener)
- [connect](CPMConnector.md#connect)
- [emit](CPMConnector.md#emit)
- [eventNames](CPMConnector.md#eventnames)
- [getHttpAgent](CPMConnector.md#gethttpagent)
- [getId](CPMConnector.md#getid)
- [getLoad](CPMConnector.md#getload)
- [getMaxListeners](CPMConnector.md#getmaxlisteners)
- [getNetworkInfo](CPMConnector.md#getnetworkinfo)
- [getSequence](CPMConnector.md#getsequence)
- [getTopic](CPMConnector.md#gettopic)
- [handleCommunicationRequest](CPMConnector.md#handlecommunicationrequest)
- [handleCommunicationRequestEnd](CPMConnector.md#handlecommunicationrequestend)
- [handleConnectionClose](CPMConnector.md#handleconnectionclose)
- [init](CPMConnector.md#init)
- [listenerCount](CPMConnector.md#listenercount)
- [listeners](CPMConnector.md#listeners)
- [makeHttpRequestToCpm](CPMConnector.md#makehttprequesttocpm)
- [off](CPMConnector.md#off)
- [on](CPMConnector.md#on)
- [once](CPMConnector.md#once)
- [prependListener](CPMConnector.md#prependlistener)
- [prependOnceListener](CPMConnector.md#prependoncelistener)
- [rawListeners](CPMConnector.md#rawlisteners)
- [reconnect](CPMConnector.md#reconnect)
- [removeAllListeners](CPMConnector.md#removealllisteners)
- [removeListener](CPMConnector.md#removelistener)
- [sendInstanceInfo](CPMConnector.md#sendinstanceinfo)
- [sendInstancesInfo](CPMConnector.md#sendinstancesinfo)
- [sendLoad](CPMConnector.md#sendload)
- [sendSequenceInfo](CPMConnector.md#sendsequenceinfo)
- [sendSequencesInfo](CPMConnector.md#sendsequencesinfo)
- [sendTopicInfo](CPMConnector.md#sendtopicinfo)
- [sendTopicsInfo](CPMConnector.md#sendtopicsinfo)
- [setLoadCheck](CPMConnector.md#setloadcheck)
- [setLoadCheckMessageSender](CPMConnector.md#setloadcheckmessagesender)
- [setMaxListeners](CPMConnector.md#setmaxlisteners)

### Constructors

- [constructor](CPMConnector.md#constructor)

## Properties

### \_cpmSslCa

• `Optional` **\_cpmSslCa**: `string` \| `Buffer`

Loaded certificate authority file for connecting to CPM via HTTPS

#### Defined in

[packages/host/src/lib/cpm-connector.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L145)

___

### communicationStream

• `Optional` **communicationStream**: `StringStream`

Stream used to write data to Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L71)

___

### config

• **config**: `CPMConnectorOptions`

Connector options.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L57)

___

### connected

• **connected**: `boolean` = `false`

Connection status indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L64)

___

### connection

• `Optional` **connection**: `ClientRequest`

Connection object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L97)

___

### connectionAttempts

• **connectionAttempts**: `number` = `0`

Connection attempts counter.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L114)

___

### cpmId

• **cpmId**: `string`

Id of Manager (e.g. "cpm-1").

#### Defined in

[packages/host/src/lib/cpm-connector.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L126)

___

### customId

• **customId**: `boolean` = `false`

Custom id indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L85)

___

### info

• **info**: `STHInformation` = `{}`

Host info object containing host id.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L92)

___

### isAbandoned

• **isAbandoned**: `boolean` = `false`

Message of impending abandonment received.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L119)

___

### isReconnecting

• **isReconnecting**: `boolean` = `false`

Indicator for reconnection state.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L102)

___

### loadCheck

• `Optional` **loadCheck**: `LoadCheck`

Load check instance to be used to get load check data.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L50)

___

### loadInterval

• `Optional` **loadInterval**: `Timeout`

Reference for method called in interval and sending load check data to the Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L140)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L78)

___

### verserClient

• **verserClient**: `VerserClient`

VerserClient Instance used for connecting with Verser.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L133)

___

### wasConnected

• **wasConnected**: `boolean` = `false`

True if connection to Manager has been established at least once.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L107)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### connect

▸ **connect**(): `Promise`<`void`\>

Connect to Manager using VerserClient.
Host send its id to Manager in headers. If id is not set, it will be received from Manager.
When connection is established it sets up handlers for communication channels.
If connection fails, it will try to reconnect.

#### Returns

`Promise`<`void`\>

Promise that resolves when connection is established.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:341](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L341)

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

### getHttpAgent

▸ **getHttpAgent**(): `Agent`

#### Returns

`Agent`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:329](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L329)

___

### getId

▸ **getId**(): `undefined` \| `string`

Returns hosts id.

#### Returns

`undefined` \| `string`

Host id.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:229](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L229)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStatMessage`\>

Retrieves load check data using LoadCheck module.

#### Returns

`Promise`<`LoadCheckStatMessage`\>

Promise<LoadCheckStatMessage> Promise resolving to LoadCheckStatMessage object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:519](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L519)

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

### getNetworkInfo

▸ **getNetworkInfo**(): `Promise`<`NetworkInfo`[]\>

Returns network interfaces information.

#### Returns

`Promise`<`NetworkInfo`[]\>

Promise resolving to NetworkInfo object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:461](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L461)

___

### getSequence

▸ **getSequence**(`id`): `Promise`<`IncomingMessage`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`IncomingMessage`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:647](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L647)

___

### getTopic

▸ **getTopic**(`topic`): `Promise`<`Readable`\>

Connects to Manager for topic data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name |

#### Returns

`Promise`<`Readable`\>

Promise resolving to `ReadableStream<any>` with topic data.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:636](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L636)

___

### handleCommunicationRequest

▸ **handleCommunicationRequest**(`duplex`, `_headers`): `Promise`<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `duplex` | `DuplexStream` |
| `_headers` | `IncomingHttpHeaders` |

#### Returns

`Promise`<`unknown`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L249)

___

### handleCommunicationRequestEnd

▸ **handleCommunicationRequestEnd**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:239](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L239)

___

### handleConnectionClose

▸ **handleConnectionClose**(`connectionStatusCode`): `Promise`<`void`\>

Handles connection close.
Tries to reconnect.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `connectionStatusCode` | `number` | status code |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:405](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L405)

___

### init

▸ **init**(): `void`

Initializes connector.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L236)

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

### makeHttpRequestToCpm

▸ **makeHttpRequestToCpm**(`method`, `reqPath`, `headers?`): `ClientRequest`

#### Parameters

| Name | Type |
| :------ | :------ |
| `method` | `string` |
| `reqPath` | `string` |
| `headers` | `Record`<`string`, `string`\> \| `OutgoingHttpHeaders` |

#### Returns

`ClientRequest`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:616](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L616)

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

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

### reconnect

▸ **reconnect**(): `Promise`<`void`\>

Reconnects to Manager if maximum number of connection attempts is not reached.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:429](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L429)

___

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`CPMConnector`](CPMConnector.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof `Events` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`CPMConnector`](CPMConnector.md)

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

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### sendInstanceInfo

▸ **sendInstanceInfo**(`instance`): `Promise`<`void`\>

Sends Instance information to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instance` | `Instance` | Instance details. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:585](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L585)

___

### sendInstancesInfo

▸ **sendInstancesInfo**(`instances`): `Promise`<`void`\>

Sends list of Sequences to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instances` | `Instance`[] | List of Instances to send. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:552](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L552)

___

### sendLoad

▸ **sendLoad**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:493](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L493)

___

### sendSequenceInfo

▸ **sendSequenceInfo**(`sequenceId`, `seqStatus`, `config`): `Promise`<`void`\>

Sends Sequence status to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id. |
| `seqStatus` | `SequenceMessageCode` | Sequence status. |
| `config` | `GetSequenceResponse` | - |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:569](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L569)

___

### sendSequencesInfo

▸ **sendSequencesInfo**(`sequences`): `Promise`<`void`\>

Sends list of sequence to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequences` | `GetSequencesResponse` | List of Sequences to send. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:537](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L537)

___

### sendTopicInfo

▸ **sendTopicInfo**(`data`): `Promise`<`void`\>

Notifies Manager that new topic has been added.
Topic information is send via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `STHTopicEventData` | Topic information. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:599](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L599)

___

### sendTopicsInfo

▸ **sendTopicsInfo**(`topics`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topics` | `Omit`<`STHTopicEventData`, ``"status"``\>[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:605](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L605)

___

### setLoadCheck

▸ **setLoadCheck**(`loadCheck`): `void`

Sets up load check object to be used to get load check data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `loadCheck` | `LoadCheck` | load check instance. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:220](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L220)

___

### setLoadCheckMessageSender

▸ **setLoadCheckMessageSender**(): `Promise`<`void`\>

Sets up a method sending load check data and to be called with interval

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:506](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L506)

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`CPMConnector`](CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`CPMConnector`](CPMConnector.md)

#### Inherited from

TypedEmitter.setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

## Constructors

### constructor

• **new CPMConnector**(`cpmHostname`, `cpm`, `config`, `server`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmHostname` | `string` | CPM hostname to connect to. (e.g. "localhost:8080"). |
| `cpm` | `string` | CPM id to connect to. (format: "org:manager"). |
| `config` | `CPMConnectorOptions` | CPM connector configuration. |
| `server` | `Server` | API server to handle incoming requests. |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/cpm-connector.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L154)

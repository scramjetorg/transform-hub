[@scramjet/host](../README.md) / [Exports](../modules.md) / CPMConnector

# Class: CPMConnector

Provides communication with Manager.

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`CPMConnector`**

## Table of contents

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

### Constructors

- [constructor](CPMConnector.md#constructor)

## Properties

### MAX\_CONNECTION\_ATTEMPTS

• **MAX\_CONNECTION\_ATTEMPTS**: `number` = `100`

Maximum attempts for first connection try.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L47)

___

### MAX\_RECONNECTION\_ATTEMPTS

• **MAX\_RECONNECTION\_ATTEMPTS**: `number` = `100`

Maximum retries on connection lost.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L54)

___

### RECONNECT\_INTERVAL

• **RECONNECT\_INTERVAL**: `number` = `2000`

Delay between connection attempts.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L61)

___

### apiServer

• `Optional` **apiServer**: `Server`

Server to handle request coming from Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L82)

___

### communicationChannel

• `Optional` **communicationChannel**: `Duplex`

Stream used to read and write data to Manager.
```

@type {Duplex}

#### Defined in

[packages/host/src/lib/cpm-connector.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L104)

___

### communicationStream

• `Optional` **communicationStream**: `StringStream`

Stream used to write data to Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L96)

___

### config

• **config**: `CPMConnectorOptions`

Connector options.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L75)

___

### connected

• **connected**: `boolean` = `false`

Connection status indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L89)

___

### connection

• `Optional` **connection**: `ClientRequest`

Connection object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L130)

___

### connectionAttempts

• **connectionAttempts**: `number` = `0`

Connection attempts counter

#### Defined in

[packages/host/src/lib/cpm-connector.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L147)

___

### cpmURL

• **cpmURL**: `string`

Hostname of Manager (e.g. "localhost:8080").

#### Defined in

[packages/host/src/lib/cpm-connector.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L154)

___

### customId

• **customId**: `boolean` = `false`

Custom id indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L118)

___

### info

• **info**: `STHInformation` = `{}`

Host info object containing host id.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L125)

___

### isReconnecting

• **isReconnecting**: `boolean` = `false`

Indicator for reconnection state.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L135)

___

### loadCheck

• `Optional` **loadCheck**: `LoadCheck`

Load check instance to be used to get load check data.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L68)

___

### loadInterval

• `Optional` **loadInterval**: `Timeout`

Reference for method called in interval and sending load check data to the Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:168](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L168)

___

### logger

• **logger**: `Console`

Logger instance.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L111)

___

### verserClient

• **verserClient**: `VerserClient`

VerserClient instance used for connecting with Verser.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L161)

___

### wasConnected

• **wasConnected**: `boolean` = `false`

True if connection to Manager has been established at least once.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L140)

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

### attachServer

▸ **attachServer**(`server`): `void`

Sets up server to handle incoming requests.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `server` | `Server` & { `httpAllowHalfOpen?`: `boolean`  } | Server to handle incoming requests from connected manager. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L249)

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

[packages/host/src/lib/cpm-connector.ts:313](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L313)

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

### getId

▸ **getId**(): `undefined` \| `string`

Returns hosts id.

#### Returns

`undefined` \| `string`

Host id.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:202](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L202)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStatMessage`\>

Retrieves load check data using LoadCheck module.

#### Returns

`Promise`<`LoadCheckStatMessage`\>

Promise<LoadCheckStatMessage> Promise resolving to LoadCheckStatMessage object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:435](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L435)

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

[packages/host/src/lib/cpm-connector.ts:402](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L402)

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

[packages/host/src/lib/cpm-connector.ts:548](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L548)

___

### handleConnectionClose

▸ **handleConnectionClose**(): `Promise`<`void`\>

Handles connection close.
Tries to reconnect.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:352](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L352)

___

### init

▸ **init**(): `void`

Initializes connector.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L209)

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

### readInfoFile

▸ **readInfoFile**(): `any`

Reads configuration from file.

#### Returns

`any`

Configuration object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:226](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L226)

___

### reconnect

▸ **reconnect**(): `void`

Reconnects to Manager if maximum number of connection attempts is not reached.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:370](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L370)

___

### registerChannels

▸ **registerChannels**(): `void`

Sets up handlers for specific channels on the VerserClient connection.
Channel 0 is reserved to handle control messages from Manager.
Channel 1 is reserved for log stream sent to Manager.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:259](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L259)

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

▸ **sendInstanceInfo**(`instance`, `instanceStatus`): `Promise`<`void`\>

Sends instance information to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instance` | `Instance` | Instance details. |
| `instanceStatus` | `InstanceMessageCode` | Instance status. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:498](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L498)

___

### sendInstancesInfo

▸ **sendInstancesInfo**(`instances`): `Promise`<`void`\>

Sends list of sequence to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instances` | `Instance`[] | List of instances to send. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:468](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L468)

___

### sendSequenceInfo

▸ **sendSequenceInfo**(`sequenceId`, `seqStatus`): `Promise`<`void`\>

Sends sequence status to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence id. |
| `seqStatus` | `SequenceMessageCode` | Sequence status. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:484](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L484)

___

### sendSequencesInfo

▸ **sendSequencesInfo**(`sequences`): `Promise`<`void`\>

Sends list of sequence to Manager via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequences` | `GetSequencesResponse` | List of sequences to send. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:453](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L453)

___

### sendTopic

▸ **sendTopic**(`topic`, `topicCfg`): `void`

Makes a POST request to Manager with topic data.

**`todo:`** Consider to make this request via VerserClient.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `topic` | `string` | Topic name. |
| `topicCfg` | `Object` | Topic configuration. |
| `topicCfg.contentType` | `string` | - |
| `topicCfg.stream` | `ReadableStream`<`any`\> \| `WritableStream`<`any`\> | - |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:525](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L525)

___

### sendTopicInfo

▸ **sendTopicInfo**(`data`): `Promise`<`void`\>

Notifies Manager that new topic has been added.
Topic information is send via communication channel.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `Object` | Topic information. |
| `data.contentType?` | `string` | - |
| `data.provides?` | `string` | - |
| `data.requires?` | `string` | - |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:512](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L512)

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

[packages/host/src/lib/cpm-connector.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L193)

___

### setLoadCheckMessageSender

▸ **setLoadCheckMessageSender**(): `void`

Sets up a method sending load check data and to be called with interval

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:419](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L419)

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

• **new CPMConnector**(`cpmHostname`, `config`, `server`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmHostname` | `string` | CPM hostname to connect to. (e.g. "localhost:8080"). |
| `config` | `CPMConnectorOptions` | CPM connector configuration. |
| `server` | `Server` | API server to handle incoming requests. |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/cpm-connector.ts:176](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L176)

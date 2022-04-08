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
- [\_cpmSslCa](CPMConnector.md#_cpmsslca)
- [communicationChannel](CPMConnector.md#communicationchannel)
- [communicationStream](CPMConnector.md#communicationstream)
- [config](CPMConnector.md#config)
- [connected](CPMConnector.md#connected)
- [connection](CPMConnector.md#connection)
- [connectionAttempts](CPMConnector.md#connectionattempts)
- [cpmId](CPMConnector.md#cpmid)
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
- [sendTopicInfo](CPMConnector.md#sendtopicinfo)
- [sendTopicsInfo](CPMConnector.md#sendtopicsinfo)
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

[packages/host/src/lib/cpm-connector.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L45)

___

### MAX\_RECONNECTION\_ATTEMPTS

• **MAX\_RECONNECTION\_ATTEMPTS**: `number` = `100`

Maximum retries on connection lost.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L52)

___

### RECONNECT\_INTERVAL

• **RECONNECT\_INTERVAL**: `number` = `2000`

Delay between connection attempts.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L59)

___

### \_cpmSslCa

• `Optional` **\_cpmSslCa**: `string` \| `Buffer`

Loaded certficiate authority file for connecting to CPM via HTTPS

#### Defined in

[packages/host/src/lib/cpm-connector.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L163)

___

### communicationChannel

• `Optional` **communicationChannel**: `Duplex`

Stream used to read and write data to Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L94)

___

### communicationStream

• `Optional` **communicationStream**: `StringStream`

Stream used to write data to Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L87)

___

### config

• **config**: `CPMConnectorOptions`

Connector options.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L73)

___

### connected

• **connected**: `boolean` = `false`

Connection status indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L80)

___

### connection

• `Optional` **connection**: `ClientRequest`

Connection object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L120)

___

### connectionAttempts

• **connectionAttempts**: `number` = `0`

Connection attempts counter

#### Defined in

[packages/host/src/lib/cpm-connector.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L137)

___

### cpmId

• **cpmId**: `string`

Id of Manager (e.g. "cpm-1").

#### Defined in

[packages/host/src/lib/cpm-connector.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L144)

___

### customId

• **customId**: `boolean` = `false`

Custom id indicator.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L108)

___

### info

• **info**: `STHInformation` = `{}`

Host info object containing host id.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L115)

___

### isReconnecting

• **isReconnecting**: `boolean` = `false`

Indicator for reconnection state.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L125)

___

### loadCheck

• `Optional` **loadCheck**: `LoadCheck`

Load check instance to be used to get load check data.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L66)

___

### loadInterval

• `Optional` **loadInterval**: `Timeout`

Reference for method called in interval and sending load check data to the Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:158](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L158)

___

### logger

• **logger**: `IObjectLogger`

Logger.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L101)

___

### verserClient

• **verserClient**: `VerserClient`

VerserClient instance used for connecting with Verser.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:151](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L151)

___

### wasConnected

• **wasConnected**: `boolean` = `false`

True if connection to Manager has been established at least once.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L130)

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

[packages/host/src/lib/cpm-connector.ts:336](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L336)

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

[packages/host/src/lib/cpm-connector.ts:230](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L230)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStatMessage`\>

Retrieves load check data using LoadCheck module.

#### Returns

`Promise`<`LoadCheckStatMessage`\>

Promise<LoadCheckStatMessage> Promise resolving to LoadCheckStatMessage object.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:468](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L468)

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

[packages/host/src/lib/cpm-connector.ts:435](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L435)

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

[packages/host/src/lib/cpm-connector.ts:589](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L589)

___

### handleConnectionClose

▸ **handleConnectionClose**(): `Promise`<`void`\>

Handles connection close.
Tries to reconnect.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:383](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L383)

___

### init

▸ **init**(): `void`

Initializes connector.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:237](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L237)

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

[packages/host/src/lib/cpm-connector.ts:254](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L254)

___

### reconnect

▸ **reconnect**(): `void`

Reconnects to Manager if maximum number of connection attempts is not reached.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:402](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L402)

___

### registerChannels

▸ **registerChannels**(): `void`

Sets up handlers for specific channels on the VerserClient connection.
Channel 0 is reserved to handle control messages from Manager.
Channel 1 is reserved for log stream sent to Manager.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:279](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L279)

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

[packages/host/src/lib/cpm-connector.ts:533](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L533)

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

[packages/host/src/lib/cpm-connector.ts:501](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L501)

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

[packages/host/src/lib/cpm-connector.ts:517](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L517)

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

[packages/host/src/lib/cpm-connector.ts:486](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L486)

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

[packages/host/src/lib/cpm-connector.ts:549](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L549)

___

### sendTopicsInfo

▸ **sendTopicsInfo**(`topics`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topics` | { `contentType?`: `string` ; `provides?`: `string` ; `requires?`: `string`  }[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:555](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L555)

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

[packages/host/src/lib/cpm-connector.ts:221](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L221)

___

### setLoadCheckMessageSender

▸ **setLoadCheckMessageSender**(): `void`

Sets up a method sending load check data and to be called with interval

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:452](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L452)

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

• **new CPMConnector**(`cpmHostname`, `cpmId`, `config`, `server`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmHostname` | `string` | CPM hostname to connect to. (e.g. "localhost:8080"). |
| `cpmId` | `string` | CPM id to connect to. (e.g. "CPM1"). |
| `config` | `CPMConnectorOptions` | CPM connector configuration. |
| `server` | `Server` | API server to handle incoming requests. |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/host/src/lib/cpm-connector.ts:172](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L172)

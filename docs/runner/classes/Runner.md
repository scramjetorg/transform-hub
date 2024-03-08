[@scramjet/runner](../README.md) / [Exports](../modules.md) / Runner

# Class: Runner<X\>

Runtime environment for sequence code.
Communicates with Host with data transferred to/from Sequence, health info,
reacts to control messages such as stopping etc.

## Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `AppConfig` |

## Implements

- `IComponent`

## Table of contents

### Methods

- [addStopHandlerRequest](Runner.md#addstophandlerrequest)
- [cleanup](Runner.md#cleanup)
- [controlStreamHandler](Runner.md#controlstreamhandler)
- [defineControlStream](Runner.md#definecontrolstream)
- [getSequence](Runner.md#getsequence)
- [handleDisconnect](Runner.md#handledisconnect)
- [handleKillRequest](Runner.md#handlekillrequest)
- [handleMonitoringRequest](Runner.md#handlemonitoringrequest)
- [handleSequenceEvents](Runner.md#handlesequenceevents)
- [initAppContext](Runner.md#initappcontext)
- [main](Runner.md#main)
- [premain](Runner.md#premain)
- [runSequence](Runner.md#runsequence)
- [sendHandshakeMessage](Runner.md#sendhandshakemessage)
- [sendPang](Runner.md#sendpang)
- [setInputContentType](Runner.md#setinputcontenttype)
- [waitForHandshakeResponse](Runner.md#waitforhandshakeresponse)

### Constructors

- [constructor](Runner.md#constructor)

### Accessors

- [context](Runner.md#context)

### Properties

- [handshakeResolver](Runner.md#handshakeresolver)
- [instanceOutput](Runner.md#instanceoutput)
- [logger](Runner.md#logger)

## Methods

### addStopHandlerRequest

▸ **addStopHandlerRequest**(`data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `StopSequenceMessageData` |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:363](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L363)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:526](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L526)

___

### controlStreamHandler

▸ **controlStreamHandler**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `EncodedControlMessage` |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:219](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L219)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:251](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L251)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:651](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L651)

___

### handleDisconnect

▸ **handleDisconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:314](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L314)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:345](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L345)

___

### handleMonitoringRequest

▸ **handleMonitoringRequest**(`data`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `MonitoringRateMessageData` |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:274](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L274)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:812](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L812)

___

### initAppContext

▸ **initAppContext**(`config`): `void`

initialize app context
set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `X` | Configuration for App. |

#### Returns

`void`

#### Defined in

[runner.ts:589](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L589)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:452](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L452)

___

### premain

▸ **premain**(): `Promise`<{ `appConfig`: `AppConfig` ; `args`: `any`  }\>

#### Returns

`Promise`<{ `appConfig`: `AppConfig` ; `args`: `any`  }\>

#### Defined in

[runner.ts:402](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L402)

___

### runSequence

▸ **runSequence**(`sequence`, `args?`): `Promise`<`void`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sequence` | `any`[] | `undefined` |
| `args` | `any`[] | `[]` |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:669](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L669)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:625](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L625)

___

### sendPang

▸ **sendPang**(`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | `PangMessageData` |

#### Returns

`void`

#### Defined in

[runner.ts:447](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L447)

___

### setInputContentType

▸ **setInputContentType**(`headers`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:261](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L261)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:645](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L645)

## Constructors

### constructor

• **new Runner**<`X`\>(`sequencePath`, `hostClient`, `instanceId`, `sequenceInfo`, `runnerConnectInfo`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `AppConfig` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequencePath` | `string` |
| `hostClient` | `IHostClient` |
| `instanceId` | `string` |
| `sequenceInfo` | `SequenceInfo` |
| `runnerConnectInfo` | `RunnerConnectInfo` |

#### Defined in

[runner.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L169)

## Accessors

### context

• `get` **context**(): `RunnerAppContext`<`X`, `any`\>

#### Returns

`RunnerAppContext`<`X`, `any`\>

#### Defined in

[runner.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L209)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L142)

___

### instanceOutput

• `Optional` **instanceOutput**: `void` \| `Readable` & `HasTopicInformation`

#### Defined in

[runner.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L167)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L144)

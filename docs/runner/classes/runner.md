[@scramjet/runner](../README.md) / [Exports](../modules.md) / Runner

# Class: Runner<X\>

Runtime environment for sequence code.
Communicates with Host with data transfered to/from sequence, health info,
reacts to control messages such as stopping etc.

## Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `AppConfig` |

## Implements

- `IComponent`

## Table of contents

### Methods

- [addStopHandlerRequest](runner.md#addstophandlerrequest)
- [cleanup](runner.md#cleanup)
- [controlStreamHandler](runner.md#controlstreamhandler)
- [defineControlStream](runner.md#definecontrolstream)
- [getSequence](runner.md#getsequence)
- [handleKillRequest](runner.md#handlekillrequest)
- [handleMonitoringRequest](runner.md#handlemonitoringrequest)
- [handleSequenceEvents](runner.md#handlesequenceevents)
- [initAppContext](runner.md#initappcontext)
- [main](runner.md#main)
- [runSequence](runner.md#runsequence)
- [sendHandshakeMessage](runner.md#sendhandshakemessage)
- [setInputContentType](runner.md#setinputcontenttype)
- [waitForHandshakeResponse](runner.md#waitforhandshakeresponse)

### Constructors

- [constructor](runner.md#constructor)

### Accessors

- [context](runner.md#context)

### Properties

- [handshakeResolver](runner.md#handshakeresolver)
- [logger](runner.md#logger)

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

[runner.ts:234](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L234)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L154)

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

[runner.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L110)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L144)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:418](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L418)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:218](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L218)

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

[runner.ts:192](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L192)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:570](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L570)

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

[runner.ts:384](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L384)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:267](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L267)

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

[runner.ts:430](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L430)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:406](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L406)

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

[runner.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L179)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:412](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L412)

## Constructors

### constructor

• **new Runner**<`X`\>(`sequencePath`, `hostClient`, `instanceId`)

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

#### Defined in

[runner.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L76)

## Accessors

### context

• `get` **context**(): `RunnerAppContext`<`X`, `any`\>

#### Returns

`RunnerAppContext`<`X`, `any`\>

#### Defined in

[runner.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L100)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L71)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L73)

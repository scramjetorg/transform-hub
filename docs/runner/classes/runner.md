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

[runner.ts:224](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L224)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L147)

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

[runner.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L103)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L137)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:405](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L405)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:208](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L208)

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

[runner.ts:184](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L184)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:558](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L558)

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

[runner.ts:372](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L372)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:257](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L257)

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

[runner.ts:417](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L417)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:393](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L393)

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

[runner.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L171)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:399](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L399)

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

[runner.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L74)

## Accessors

### context

• `get` **context**(): `RunnerAppContext`<`X`, `any`\>

#### Returns

`RunnerAppContext`<`X`, `any`\>

#### Defined in

[runner.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L93)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L69)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L71)

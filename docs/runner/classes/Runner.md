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
- [handleKillRequest](Runner.md#handlekillrequest)
- [handleMonitoringRequest](Runner.md#handlemonitoringrequest)
- [handleSequenceEvents](Runner.md#handlesequenceevents)
- [initAppContext](Runner.md#initappcontext)
- [main](Runner.md#main)
- [runSequence](Runner.md#runsequence)
- [sendHandshakeMessage](Runner.md#sendhandshakemessage)
- [setInputContentType](Runner.md#setinputcontenttype)
- [waitForHandshakeResponse](Runner.md#waitforhandshakeresponse)

### Constructors

- [constructor](Runner.md#constructor)

### Accessors

- [context](Runner.md#context)

### Properties

- [handshakeResolver](Runner.md#handshakeresolver)
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

[runner.ts:248](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L248)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:374](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L374)

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

[runner.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L159)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:185](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L185)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:456](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L456)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:234](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L234)

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

[runner.ts:208](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L208)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:604](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L604)

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

[runner.ts:420](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L420)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:286](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L286)

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

[runner.ts:474](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L474)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:444](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L444)

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

[runner.ts:195](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L195)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:450](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L450)

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

[runner.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L122)

## Accessors

### context

• `get` **context**(): `RunnerAppContext`<`X`, `any`\>

#### Returns

`RunnerAppContext`<`X`, `any`\>

#### Defined in

[runner.ts:149](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L149)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L115)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L117)

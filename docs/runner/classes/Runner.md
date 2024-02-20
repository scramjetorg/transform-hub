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

[runner.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L249)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:375](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L375)

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

[runner.ts:160](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L160)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:186](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L186)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:469](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L469)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:235](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L235)

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

[runner.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L209)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:617](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L617)

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

[runner.ts:421](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L421)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:287](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L287)

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

[runner.ts:487](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L487)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:457](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L457)

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

[runner.ts:196](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L196)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:463](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L463)

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

[runner.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L150)

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

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

[runner.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L236)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L156)

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

[runner.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L120)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:146](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L146)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:410](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L410)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:220](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L220)

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

[runner.ts:194](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L194)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:562](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L562)

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

[runner.ts:376](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L376)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:269](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L269)

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

[runner.ts:422](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L422)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:398](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L398)

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

[runner.ts:181](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L181)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:404](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L404)

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

[runner.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L83)

## Accessors

### context

• `get` **context**(): `RunnerAppContext`<`X`, `any`\>

#### Returns

`RunnerAppContext`<`X`, `any`\>

#### Defined in

[runner.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L110)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L76)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L78)

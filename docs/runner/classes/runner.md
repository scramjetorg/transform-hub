[@scramjet/runner](../README.md) / Runner

# Class: Runner<X\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `AppConfig` |

## Implements

- `IComponent`

## Table of contents

### Constructors

- [constructor](runner.md#constructor)

### Properties

- [handshakeResolver](runner.md#handshakeresolver)
- [logger](runner.md#logger)

### Methods

- [addStopHandlerRequest](runner.md#addstophandlerrequest)
- [cleanup](runner.md#cleanup)
- [cleanupStreams](runner.md#cleanupstreams)
- [controlStreamHandler](runner.md#controlstreamhandler)
- [defineControlStream](runner.md#definecontrolstream)
- [getSequence](runner.md#getsequence)
- [handleForceConfirmAliveRequest](runner.md#handleforceconfirmaliverequest)
- [handleKillRequest](runner.md#handlekillrequest)
- [handleMonitoringRequest](runner.md#handlemonitoringrequest)
- [handleSequenceEvents](runner.md#handlesequenceevents)
- [hookupControlStream](runner.md#hookupcontrolstream)
- [hookupFifoStreams](runner.md#hookupfifostreams)
- [hookupInputStream](runner.md#hookupinputstream)
- [hookupLoggerStream](runner.md#hookuploggerstream)
- [hookupMonitorStream](runner.md#hookupmonitorstream)
- [hookupOutputStream](runner.md#hookupoutputstream)
- [initAppContext](runner.md#initappcontext)
- [initializeLogger](runner.md#initializelogger)
- [main](runner.md#main)
- [runSequence](runner.md#runsequence)
- [sendHandshakeMessage](runner.md#sendhandshakemessage)
- [setInputContentType](runner.md#setinputcontenttype)
- [waitForHandshakeResponse](runner.md#waitforhandshakeresponse)

## Constructors

### constructor

• **new Runner**<`X`\>(`sequencePath`, `fifosPath`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `AppConfig` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequencePath` | `string` |
| `fifosPath` | `string` |

#### Defined in

[runner.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L48)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L46)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L48)

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

[runner.ts:294](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L294)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L120)

___

### cleanupStreams

▸ **cleanupStreams**(): `Promise`<`any`\>

#### Returns

`Promise`<`any`\>

#### Defined in

[runner.ts:146](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L146)

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

[runner.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L67)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L109)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:492](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L492)

___

### handleForceConfirmAliveRequest

▸ **handleForceConfirmAliveRequest**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L236)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:278](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L278)

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

[runner.ts:242](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L242)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:646](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L646)

___

### hookupControlStream

▸ **hookupControlStream**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L104)

___

### hookupFifoStreams

▸ **hookupFifoStreams**(): `Promise`<[`void`, `void`, `void`, `void`]\>

#### Returns

`Promise`<[`void`, `void`, `void`, `void`]\>

#### Defined in

[runner.ts:219](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L219)

___

### hookupInputStream

▸ **hookupInputStream**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:189](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L189)

___

### hookupLoggerStream

▸ **hookupLoggerStream**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:185](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L185)

___

### hookupMonitorStream

▸ **hookupMonitorStream**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:181](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L181)

___

### hookupOutputStream

▸ **hookupOutputStream**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:211](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L211)

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

[runner.ts:453](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L453)

___

### initializeLogger

▸ **initializeLogger**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:228](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L228)

___

### main

▸ **main**(): `Promise`<`void`\>

Initialization of runner class.
* initilize streams (fifo and std)
* send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:340](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L340)

___

### runSequence

▸ **runSequence**(`sequence`, `args?`): `Promise`<`void`\>

run sequence

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `sequence` | `any`[] | `undefined` | - |
| `args` | `any`[] | `[]` | arguments that the app will be called with |

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:509](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L509)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:480](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L480)

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

[runner.ts:198](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L198)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:486](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L486)

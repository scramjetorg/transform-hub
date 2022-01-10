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
| `hostClient` | `ICSHClient` |
| `instanceId` | `string` |

#### Defined in

[runner.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L69)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | `Function` |
| `res` | `Function` |

#### Defined in

[runner.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L64)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[runner.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L66)

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

[runner.ts:223](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L223)

___

### cleanup

▸ **cleanup**(): `Promise`<`number`\>

#### Returns

`Promise`<`number`\>

#### Defined in

[runner.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L132)

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

[runner.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L88)

___

### defineControlStream

▸ **defineControlStream**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L122)

___

### getSequence

▸ **getSequence**(): `ApplicationInterface`[]

#### Returns

`ApplicationInterface`[]

#### Defined in

[runner.ts:416](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L416)

___

### handleKillRequest

▸ **handleKillRequest**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:207](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L207)

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

[runner.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L169)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:569](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L569)

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

[runner.ts:383](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L383)

___

### main

▸ **main**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[runner.ts:262](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L262)

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

[runner.ts:428](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L428)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): `void`

#### Returns

`void`

#### Defined in

[runner.ts:404](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L404)

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

[runner.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L156)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): `Promise`<`HandshakeAcknowledgeMessageData`\>

#### Returns

`Promise`<`HandshakeAcknowledgeMessageData`\>

#### Defined in

[runner.ts:410](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/runner/src/runner.ts#L410)

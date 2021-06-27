[@scramjet/runner](../README.md) / Runner

# Class: Runner<X\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `X` | AppConfig |

## Implements

- *IComponent*

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
- [waitForHandshakeResponse](runner.md#waitforhandshakeresponse)

## Constructors

### constructor

\+ **new Runner**<X\>(`sequencePath`: *string*, `fifosPath`: *string*): [*Runner*](runner.md)<X\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | AppConfig |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequencePath` | *string* |
| `fifosPath` | *string* |

**Returns:** [*Runner*](runner.md)<X\>

Defined in: [runner.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L40)

## Properties

### handshakeResolver

• `Optional` **handshakeResolver**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rej` | Function |
| `res` | Function |

Defined in: [runner.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L38)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [runner.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L40)

## Methods

### addStopHandlerRequest

▸ **addStopHandlerRequest**(`data`: StopSequenceMessageData): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | StopSequenceMessageData |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:262](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L262)

___

### cleanup

▸ **cleanup**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L99)

___

### cleanupStreams

▸ **cleanupStreams**(): *Promise*<any\>

**Returns:** *Promise*<any\>

Defined in: [runner.ts:131](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L131)

___

### controlStreamHandler

▸ **controlStreamHandler**(`__namedParameters`: *EncodedMessage*<ControlMessageCode\>): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | *EncodedMessage*<ControlMessageCode\> |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L54)

___

### defineControlStream

▸ **defineControlStream**(): *void*

**Returns:** *void*

Defined in: [runner.ts:88](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L88)

___

### getSequence

▸ **getSequence**(): ApplicationInterface[]

**Returns:** ApplicationInterface[]

Defined in: [runner.ts:417](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L417)

___

### handleForceConfirmAliveRequest

▸ **handleForceConfirmAliveRequest**(): *void*

**Returns:** *void*

Defined in: [runner.ts:212](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L212)

___

### handleKillRequest

▸ **handleKillRequest**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:246](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L246)

___

### handleMonitoringRequest

▸ **handleMonitoringRequest**(`data`: MonitoringRateMessageData): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | MonitoringRateMessageData |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:218](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L218)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): *void*

**Returns:** *void*

Defined in: [runner.ts:535](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L535)

___

### hookupControlStream

▸ **hookupControlStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L83)

___

### hookupFifoStreams

▸ **hookupFifoStreams**(): *Promise*<[*void*, *void*, *void*, *void*, *void*]\>

**Returns:** *Promise*<[*void*, *void*, *void*, *void*, *void*]\>

Defined in: [runner.ts:194](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L194)

___

### hookupInputStream

▸ **hookupInputStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:174](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L174)

___

### hookupLoggerStream

▸ **hookupLoggerStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:170](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L170)

___

### hookupMonitorStream

▸ **hookupMonitorStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:166](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L166)

___

### hookupOutputStream

▸ **hookupOutputStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:186](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L186)

___

### initAppContext

▸ **initAppContext**(`config`: X): *void*

initialize app context
set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | X | Configuration for App. |

**Returns:** *void*

Defined in: [runner.ts:378](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L378)

___

### initializeLogger

▸ **initializeLogger**(): *void*

**Returns:** *void*

Defined in: [runner.ts:204](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L204)

___

### main

▸ **main**(): *Promise*<void\>

Initialization of runner class.
* initilize streams (fifo and std)
* send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)

**Returns:** *Promise*<void\>

Defined in: [runner.ts:308](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L308)

___

### runSequence

▸ **runSequence**(`sequence`: *any*[], `args?`: *any*[]): *Promise*<void\>

run sequence

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `sequence` | *any*[] | - | - |
| `args` | *any*[] | [] | arguments that the app will be called with |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:432](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L432)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): *void*

**Returns:** *void*

Defined in: [runner.ts:405](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L405)

___

### waitForHandshakeResponse

▸ **waitForHandshakeResponse**(): *Promise*<HandshakeAcknowledgeMessageData\>

**Returns:** *Promise*<HandshakeAcknowledgeMessageData\>

Defined in: [runner.ts:411](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/runner/src/runner.ts#L411)

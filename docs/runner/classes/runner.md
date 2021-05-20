[@scramjet/runner](../README.md) / Runner

# Class: Runner<X\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `X` | AppConfig |

## Implements

* *IComponent*

## Table of contents

### Constructors

- [constructor](runner.md#constructor)

### Properties

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
- [handleReceptionOfHandshake](runner.md#handlereceptionofhandshake)
- [handleSequenceEvents](runner.md#handlesequenceevents)
- [hookupControlStream](runner.md#hookupcontrolstream)
- [hookupFifoStreams](runner.md#hookupfifostreams)
- [hookupInputStream](runner.md#hookupinputstream)
- [hookupLoggerStream](runner.md#hookuploggerstream)
- [hookupMonitorStream](runner.md#hookupmonitorstream)
- [hookupOutputStream](runner.md#hookupoutputstream)
- [initAppContext](runner.md#initappcontext)
- [initializeLogger](runner.md#initializelogger)
- [keepAliveIssued](runner.md#keepaliveissued)
- [main](runner.md#main)
- [runSequence](runner.md#runsequence)
- [sendHandshakeMessage](runner.md#sendhandshakemessage)

## Constructors

### constructor

\+ **new Runner**<X\>(`sequencePath`: *string*, `fifosPath`: *string*): [*Runner*](runner.md)<X\>

#### Type parameters:

| Name | Type |
| :------ | :------ |
| `X` | AppConfig |

#### Parameters:

| Name | Type |
| :------ | :------ |
| `sequencePath` | *string* |
| `fifosPath` | *string* |

**Returns:** [*Runner*](runner.md)<X\>

Defined in: [runner.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L38)

## Properties

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [runner.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L38)

## Methods

### addStopHandlerRequest

▸ **addStopHandlerRequest**(`data`: StopSequenceMessageData): *Promise*<void\>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `data` | StopSequenceMessageData |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:261](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L261)

___

### cleanup

▸ **cleanup**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:102](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L102)

___

### cleanupStreams

▸ **cleanupStreams**(): *Promise*<any\>

**Returns:** *Promise*<any\>

Defined in: [runner.ts:134](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L134)

___

### controlStreamHandler

▸ **controlStreamHandler**(`__namedParameters`: EncodedControlMessage): *Promise*<void\>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `__namedParameters` | EncodedControlMessage |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L52)

___

### defineControlStream

▸ **defineControlStream**(): *void*

**Returns:** *void*

Defined in: [runner.ts:91](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L91)

___

### getSequence

▸ **getSequence**(): ApplicationInterface[]

**Returns:** ApplicationInterface[]

Defined in: [runner.ts:383](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L383)

___

### handleForceConfirmAliveRequest

▸ **handleForceConfirmAliveRequest**(): *void*

**Returns:** *void*

Defined in: [runner.ts:215](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L215)

___

### handleKillRequest

▸ **handleKillRequest**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:245](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L245)

___

### handleMonitoringRequest

▸ **handleMonitoringRequest**(`data`: MonitoringRateMessageData): *Promise*<void\>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `data` | MonitoringRateMessageData |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:221](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L221)

___

### handleReceptionOfHandshake

▸ **handleReceptionOfHandshake**(`data`: HandshakeAcknowledgeMessageData): *Promise*<void\>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `data` | HandshakeAcknowledgeMessageData |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:295](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L295)

___

### handleSequenceEvents

▸ **handleSequenceEvents**(): *void*

**Returns:** *void*

Defined in: [runner.ts:523](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L523)

___

### hookupControlStream

▸ **hookupControlStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:86](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L86)

___

### hookupFifoStreams

▸ **hookupFifoStreams**(): *Promise*<[*void*, *void*, *void*, *void*, *void*]\>

**Returns:** *Promise*<[*void*, *void*, *void*, *void*, *void*]\>

Defined in: [runner.ts:197](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L197)

___

### hookupInputStream

▸ **hookupInputStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:177](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L177)

___

### hookupLoggerStream

▸ **hookupLoggerStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:173](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L173)

___

### hookupMonitorStream

▸ **hookupMonitorStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:169](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L169)

___

### hookupOutputStream

▸ **hookupOutputStream**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:189](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L189)

___

### initAppContext

▸ **initAppContext**(`config`: X): *void*

initialize app context
set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream

#### Parameters:

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | X | Configuration for App. |

**Returns:** *void*

Defined in: [runner.ts:350](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L350)

___

### initializeLogger

▸ **initializeLogger**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [runner.ts:207](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L207)

___

### keepAliveIssued

▸ **keepAliveIssued**(): *void*

**Returns:** *void*

Defined in: [runner.ts:291](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L291)

___

### main

▸ **main**(): *Promise*<void\>

Initialization of runner class.
* initilize streams (fifo and std)
* send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)

**Returns:** *Promise*<void\>

Defined in: [runner.ts:333](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L333)

___

### runSequence

▸ **runSequence**(`args?`: *any*[]): *Promise*<void\>

run sequence

#### Parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `args` | *any*[] | [] | arguments that the app will be called with |

**Returns:** *Promise*<void\>

Defined in: [runner.ts:397](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L397)

___

### sendHandshakeMessage

▸ **sendHandshakeMessage**(): *void*

**Returns:** *void*

Defined in: [runner.ts:377](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/runner/src/runner.ts#L377)

@scramjet/model

# @scramjet/model

## Table of contents

### Classes

- [AppError](classes/apperror.md)
- [CSIControllerError](classes/csicontrollererror.md)
- [CommunicationHandler](classes/communicationhandler.md)
- [DelayedStream](classes/delayedstream.md)
- [HostError](classes/hosterror.md)
- [IDProvider](classes/idprovider.md)
- [RunnerError](classes/runnererror.md)
- [SupervisorError](classes/supervisorerror.md)

### Type aliases

- [ConfiguredMessageHandler](README.md#configuredmessagehandler)
- [DiskSpace](README.md#diskspace)
- [ICSIControllerErrorData](README.md#icsicontrollererrordata)
- [IHostErrorData](README.md#ihosterrordata)
- [IRunnerErrorData](README.md#irunnererrordata)
- [ISupervisorErrorData](README.md#isupervisorerrordata)
- [LoadCheckStat](README.md#loadcheckstat)

### Variables

- [MessageUtilities](README.md#messageutilities)

### Functions

- [checkMessage](README.md#checkmessage)
- [deserializeMessage](README.md#deserializemessage)
- [getMessage](README.md#getmessage)
- [promiseTimeout](README.md#promisetimeout)
- [serializeMessage](README.md#serializemessage)

## Type aliases

### ConfiguredMessageHandler

Ƭ **ConfiguredMessageHandler**<T\>: { `blocking`: *boolean* ; `handler`: *MonitoringMessageHandler*<T *extends* MonitoringMessageCode ? T : *never*\>  } \| { `blocking`: *boolean* ; `handler`: *ControlMessageHandler*<T *extends* ControlMessageCode ? T : *never*\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | RunnerMessageCode \| SupervisorMessageCode |

Defined in: [packages/model/src/stream-handler.ts:22](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L22)

___

### DiskSpace

Ƭ **DiskSpace**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `available` | *number* |
| `fs` | *string* |
| `size` | *number* |
| `use` | *number* |
| `used` | *number* |

Defined in: [packages/model/src/load-check-stat.ts:1](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/load-check-stat.ts#L1)

___

### ICSIControllerErrorData

Ƭ **ICSIControllerErrorData**: *any*

Defined in: [packages/model/src/errors/csi-controller-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/errors/csi-controller-error.ts#L4)

___

### IHostErrorData

Ƭ **IHostErrorData**: *any*

Defined in: [packages/model/src/errors/host-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/errors/host-error.ts#L4)

___

### IRunnerErrorData

Ƭ **IRunnerErrorData**: *any*

Defined in: [packages/model/src/errors/runner-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/errors/runner-error.ts#L4)

___

### ISupervisorErrorData

Ƭ **ISupervisorErrorData**: *any*

Defined in: [packages/model/src/errors/supervisor-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/errors/supervisor-error.ts#L4)

___

### LoadCheckStat

Ƭ **LoadCheckStat**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `avgLoad` | *number* |
| `currentLoad` | *number* |
| `fsSize` | [*DiskSpace*](README.md#diskspace)[] |
| `memFree` | *number* |
| `memUsed` | *number* |

Defined in: [packages/model/src/load-check-stat.ts:9](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/load-check-stat.ts#L9)

## Variables

### MessageUtilities

• `Const` **MessageUtilities**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `deserializeMessage` | (`msg`: *string*) => *MessageType*<RunnerMessageCode\> |
| `serializeMessage` | <T\>(`__namedParameters`: *MessageType*<T\>) => RunnerMessage \| SupervisorMessage |

Defined in: [packages/model/src/index.ts:12](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/index.ts#L12)

## Functions

### checkMessage

▸ `Const` **checkMessage**<X\>(`msgCode`: X, `msgData`: MonitoringMessageData \| DescribeSequenceMessageData \| ErrorMessageData \| SnapshotResponseMessageData \| StatusMessageData \| KeepAliveMessageData \| AcknowledgeMessageData \| HandshakeAcknowledgeMessageData \| StopSequenceMessageData \| MonitoringRateMessageData \| EmptyMessageData): *MessageDataType*<X\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | PING \| MONITORING \| DESCRIBE\_SEQUENCE \| ERROR \| SNAPSHOT\_RESPONSE \| SEQUENCE\_STOPPED \| STATUS \| ALIVE \| ACKNOWLEDGE \| SEQUENCE\_COMPLETED \| PONG \| STOP \| KILL \| MONITORING\_RATE \| FORCE\_CONFIRM\_ALIVE \| EVENT \| CONFIG |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msgCode` | X |
| `msgData` | MonitoringMessageData \| DescribeSequenceMessageData \| ErrorMessageData \| SnapshotResponseMessageData \| StatusMessageData \| KeepAliveMessageData \| AcknowledgeMessageData \| HandshakeAcknowledgeMessageData \| StopSequenceMessageData \| MonitoringRateMessageData \| EmptyMessageData |

**Returns:** *MessageDataType*<X\>

Defined in: [packages/model/src/get-message.ts:55](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/get-message.ts#L55)

___

### deserializeMessage

▸ **deserializeMessage**(`msg`: *string*): *MessageType*<RunnerMessageCode\>

Get an object of message type from serialized message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | *string* | a stringified and serialized message |

**Returns:** *MessageType*<RunnerMessageCode\>

- an object of message type

Defined in: [packages/model/src/messages-utils.ts:29](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/messages-utils.ts#L29)

___

### getMessage

▸ `Const` **getMessage**<X\>(`msgCode`: X, `msgData`: *MessageDataType*<X\>): *MessageType*<X\>

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | RunnerMessageCode |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msgCode` | X | message type code |
| `msgData` | *MessageDataType*<X\> | a message object |

**Returns:** *MessageType*<X\>

- an object of message type

Defined in: [packages/model/src/get-message.ts:102](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/get-message.ts#L102)

___

### promiseTimeout

▸ `Const` **promiseTimeout**(`endOfSequence`: *Promise*<any\>, `timeout`: *number*): *Promise*<any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `endOfSequence` | *Promise*<any\> |
| `timeout` | *number* |

**Returns:** *Promise*<any\>

Defined in: [packages/model/src/utils/promiseTimout.ts:4](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/utils/promiseTimout.ts#L4)

___

### serializeMessage

▸ **serializeMessage**<T\>(`__namedParameters`: *MessageType*<T\>): RunnerMessage \| SupervisorMessage

Serizalized message.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | PING \| MONITORING \| DESCRIBE\_SEQUENCE \| ERROR \| SNAPSHOT\_RESPONSE \| SEQUENCE\_STOPPED \| STATUS \| ALIVE \| ACKNOWLEDGE \| SEQUENCE\_COMPLETED \| PONG \| STOP \| KILL \| MONITORING\_RATE \| FORCE\_CONFIRM\_ALIVE \| EVENT \| CONFIG |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | *MessageType*<T\> |

**Returns:** RunnerMessage \| SupervisorMessage

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

Defined in: [packages/model/src/messages-utils.ts:14](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/messages-utils.ts#L14)

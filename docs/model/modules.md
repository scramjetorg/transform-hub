[@scramjet/model](README.md) / Exports

# @scramjet/model

## Table of contents

### Enumerations

- [RunnerMessageCode](enums/runnermessagecode.md)

### Classes

- [AppError](classes/apperror.md)
- [CommunicationHandler](classes/communicationhandler.md)

### Type aliases

- [AcknowledgeMessage](modules.md#acknowledgemessage)
- [AcknowledgeMessageData](modules.md#acknowledgemessagedata)
- [ConfirmHealthMessage](modules.md#confirmhealthmessage)
- [ControlMessageHandler](modules.md#controlmessagehandler)
- [DescribeSequenceMessage](modules.md#describesequencemessage)
- [DescribeSequenceMessageData](modules.md#describesequencemessagedata)
- [EmptyMessageData](modules.md#emptymessagedata)
- [ErrorMessage](modules.md#errormessage)
- [ErrorMessageData](modules.md#errormessagedata)
- [EventMessage](modules.md#eventmessage)
- [EventMessageData](modules.md#eventmessagedata)
- [HandshakeAcknowledgeMessage](modules.md#handshakeacknowledgemessage)
- [HandshakeAcknowledgeMessageData](modules.md#handshakeacknowledgemessagedata)
- [HandshakeMessage](modules.md#handshakemessage)
- [KeepAliveMessage](modules.md#keepalivemessage)
- [KeepAliveMessageData](modules.md#keepalivemessagedata)
- [KillSequenceMessage](modules.md#killsequencemessage)
- [Message](modules.md#message)
- [MessageDataType](modules.md#messagedatatype)
- [MessageType](modules.md#messagetype)
- [MonitoringMessage](modules.md#monitoringmessage)
- [MonitoringMessageData](modules.md#monitoringmessagedata)
- [MonitoringMessageHandler](modules.md#monitoringmessagehandler)
- [MonitoringRateMessage](modules.md#monitoringratemessage)
- [MonitoringRateMessageData](modules.md#monitoringratemessagedata)
- [RunnerMessage](modules.md#runnermessage)
- [SnapshotResponseMessage](modules.md#snapshotresponsemessage)
- [SnapshotResponseMessageData](modules.md#snapshotresponsemessagedata)
- [StatusMessage](modules.md#statusmessage)
- [StatusMessageData](modules.md#statusmessagedata)
- [StopSequenceMessage](modules.md#stopsequencemessage)
- [StopSequenceMessageData](modules.md#stopsequencemessagedata)

### Variables

- [MessageUtilities](modules.md#messageutilities)

### Functions

- [checkMessage](modules.md#checkmessage)
- [deserializeMessage](modules.md#deserializemessage)
- [getMessage](modules.md#getmessage)
- [serializeMessage](modules.md#serializemessage)

## Type aliases

### AcknowledgeMessage

Ƭ **AcknowledgeMessage**: { `msgCode`: [*ACKNOWLEDGE*](enums/runnermessagecode.md#acknowledge)  } & [*AcknowledgeMessageData*](modules.md#acknowledgemessagedata)

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

Defined in: [model/src/messages/acknowledge.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/acknowledge.ts#L22)

___

### AcknowledgeMessageData

Ƭ **AcknowledgeMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`acknowledged` | *boolean* | Indicates whether a message was received.   |
`errorMsg`? | [*ErrorMessage*](modules.md#errormessage) | Describes an error message if error was thrown after performing a requested operation.   |
`status`? | *number* | Indicates status of the performed operation.   |

Defined in: [model/src/messages/acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/acknowledge.ts#L4)

___

### ConfirmHealthMessage

Ƭ **ConfirmHealthMessage**: *object*

Message forcing Runner to emit a keep alive message.
It is used when Supervisor does not receive a keep alive message from Runner withih a specified time frame.
It forces Runner to emit a keep alive message to confirm it is still active.
This message type is sent from Supervisor.

#### Type declaration:

Name | Type |
:------ | :------ |
`msgCode` | [*FORCE\_CONFIRM\_ALIVE*](enums/runnermessagecode.md#force_confirm_alive) |

Defined in: [model/src/messages/confirm-health.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/confirm-health.ts#L9)

___

### ControlMessageHandler

Ƭ **ControlMessageHandler**<T\>: (`msg`: *EncodedMessage*<T\>) => *MaybePromise*<EncodedMessage<T\>\>

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | ControlMessageCode |

#### Type declaration:

▸ (`msg`: *EncodedMessage*<T\>): *MaybePromise*<EncodedMessage<T\>\>

#### Parameters:

Name | Type |
:------ | :------ |
`msg` | *EncodedMessage*<T\> |

**Returns:** *MaybePromise*<EncodedMessage<T\>\>

Defined in: [model/src/stream-handler.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L24)

___

### DescribeSequenceMessage

Ƭ **DescribeSequenceMessage**: { `msgCode`: [*DESCRIBE\_SEQUENCE*](enums/runnermessagecode.md#describe_sequence)  } & [*DescribeSequenceMessageData*](modules.md#describesequencemessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

Defined in: [model/src/messages/describe-sequence.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/describe-sequence.ts#L15)

___

### DescribeSequenceMessageData

Ƭ **DescribeSequenceMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`definition`? | FunctionDefinition[] | Provides the definition of each subsequence.   |

Defined in: [model/src/messages/describe-sequence.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/describe-sequence.ts#L4)

___

### EmptyMessageData

Ƭ **EmptyMessageData**: *object*

#### Type declaration:

Defined in: [model/src/messages/message.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/message.ts#L16)

___

### ErrorMessage

Ƭ **ErrorMessage**: { `msgCode`: [*ERROR*](enums/runnermessagecode.md#error)  } & [*ErrorMessageData*](modules.md#errormessagedata)

A general purpose error message.
This message type is sent from Runner.

Defined in: [model/src/messages/error.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/error.ts#L22)

___

### ErrorMessageData

Ƭ **ErrorMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`errorCode` | *number* | Error's status code   |
`exitCode` | *number* | The operation's exit code.   |
`message` | *string* | Error message.   |
`stack` | *string* | Error stack trace.   |

Defined in: [model/src/messages/error.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/error.ts#L3)

___

### EventMessage

Ƭ **EventMessage**: { `msgCode`: [*EVENT*](enums/runnermessagecode.md#event)  } & [*EventMessageData*](modules.md#eventmessagedata)

TODO update
Event message emitted by sequence and handeled in the context.

Defined in: [model/src/messages/event.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/event.ts#L16)

___

### EventMessageData

Ƭ **EventMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`eventName` | *string* | Name of the event.   |
`message` | *any* | TODO update Informs if keepAlive can be called to prolong the running of the Sequence.   |

Defined in: [model/src/messages/event.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/event.ts#L3)

___

### HandshakeAcknowledgeMessage

Ƭ **HandshakeAcknowledgeMessage**: { `msgCode`: [*PONG*](enums/runnermessagecode.md#pong)  } & [*HandshakeAcknowledgeMessageData*](modules.md#handshakeacknowledgemessagedata)

Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
the received handshake message (PING).
The message includes the Sequence configuration information.

Defined in: [model/src/messages/handshake-acknowledge.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/handshake-acknowledge.ts#L16)

___

### HandshakeAcknowledgeMessageData

Ƭ **HandshakeAcknowledgeMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`appConfig` | AppConfig | Sequence configuration passed to the Sequence when it is started by the Runner.   |
`arguments`? | *any*[] | - |

Defined in: [model/src/messages/handshake-acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/handshake-acknowledge.ts#L4)

___

### HandshakeMessage

Ƭ **HandshakeMessage**: *object*

Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
Runner is then waiting to receive the handshake acknowledge message back (PONG)
from the CSH to start the Sequence.

#### Type declaration:

Name | Type |
:------ | :------ |
`msgCode` | [*PING*](enums/runnermessagecode.md#ping) |

Defined in: [model/src/messages/handshake.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/handshake.ts#L8)

___

### KeepAliveMessage

Ƭ **KeepAliveMessage**: { `msgCode`: [*ALIVE*](enums/runnermessagecode.md#alive)  } & [*KeepAliveMessageData*](modules.md#keepalivemessagedata)

Message instrucing how much longer to keep Sequence alive.
This message type is sent from Runner.

Defined in: [model/src/messages/keep-alive.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/keep-alive.ts#L13)

___

### KeepAliveMessageData

Ƭ **KeepAliveMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`keepAlive` | *number* | Information on how much longer the Sequence will be active (in miliseconds).   |

Defined in: [model/src/messages/keep-alive.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/keep-alive.ts#L3)

___

### KillSequenceMessage

Ƭ **KillSequenceMessage**: *object*

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from Supervisor.

#### Type declaration:

Name | Type |
:------ | :------ |
`msgCode` | [*KILL*](enums/runnermessagecode.md#kill) |

Defined in: [model/src/messages/kill-sequence.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/kill-sequence.ts#L8)

___

### Message

Ƭ **Message**: *object*

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`msgCode` | [*RunnerMessageCode*](enums/runnermessagecode.md) | Message type code from RunnerMessageCode enumeration.   |

Defined in: [model/src/messages/message.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/message.ts#L10)

___

### MessageDataType

Ƭ **MessageDataType**<T\>: T *extends* [*ACKNOWLEDGE*](enums/runnermessagecode.md#acknowledge) ? [*AcknowledgeMessageData*](modules.md#acknowledgemessagedata) : T *extends* [*ALIVE*](enums/runnermessagecode.md#alive) ? [*KeepAliveMessageData*](modules.md#keepalivemessagedata) : T *extends* [*DESCRIBE\_SEQUENCE*](enums/runnermessagecode.md#describe_sequence) ? [*DescribeSequenceMessageData*](modules.md#describesequencemessagedata) : T *extends* [*STATUS*](enums/runnermessagecode.md#status) ? [*StatusMessageData*](modules.md#statusmessagedata) : T *extends* [*ERROR*](enums/runnermessagecode.md#error) ? [*ErrorMessageData*](modules.md#errormessagedata) : T *extends* [*FORCE\_CONFIRM\_ALIVE*](enums/runnermessagecode.md#force_confirm_alive) ? [*EmptyMessageData*](modules.md#emptymessagedata) : T *extends* [*KILL*](enums/runnermessagecode.md#kill) \| [*FORCE\_CONFIRM\_ALIVE*](enums/runnermessagecode.md#force_confirm_alive) ? [*EmptyMessageData*](modules.md#emptymessagedata) : T *extends* [*MONITORING*](enums/runnermessagecode.md#monitoring) ? [*MonitoringMessageData*](modules.md#monitoringmessagedata) : T *extends* [*MONITORING\_RATE*](enums/runnermessagecode.md#monitoring_rate) ? [*MonitoringRateMessageData*](modules.md#monitoringratemessagedata) : T *extends* [*STOP*](enums/runnermessagecode.md#stop) ? [*StopSequenceMessageData*](modules.md#stopsequencemessagedata) : T *extends* [*PING*](enums/runnermessagecode.md#ping) ? [*EmptyMessageData*](modules.md#emptymessagedata) : T *extends* [*PONG*](enums/runnermessagecode.md#pong) ? [*HandshakeAcknowledgeMessageData*](modules.md#handshakeacknowledgemessagedata) : T *extends* [*SNAPSHOT\_RESPONSE*](enums/runnermessagecode.md#snapshot_response) ? [*SnapshotResponseMessageData*](modules.md#snapshotresponsemessagedata) : *never*

#### Type parameters:

Name |
:------ |
`T` |

Defined in: [types/src/message-streams.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/types/src/message-streams.ts#L48)

___

### MessageType

Ƭ **MessageType**<T\>: T *extends* [*ACKNOWLEDGE*](enums/runnermessagecode.md#acknowledge) ? [*AcknowledgeMessage*](modules.md#acknowledgemessage) : T *extends* [*ALIVE*](enums/runnermessagecode.md#alive) ? [*KeepAliveMessage*](modules.md#keepalivemessage) : T *extends* [*DESCRIBE\_SEQUENCE*](enums/runnermessagecode.md#describe_sequence) ? [*DescribeSequenceMessage*](modules.md#describesequencemessage) : T *extends* [*STATUS*](enums/runnermessagecode.md#status) ? [*StatusMessage*](modules.md#statusmessage) : T *extends* [*ERROR*](enums/runnermessagecode.md#error) ? [*ErrorMessage*](modules.md#errormessage) : T *extends* [*FORCE\_CONFIRM\_ALIVE*](enums/runnermessagecode.md#force_confirm_alive) ? [*ConfirmHealthMessage*](modules.md#confirmhealthmessage) : T *extends* [*KILL*](enums/runnermessagecode.md#kill) ? [*KillSequenceMessage*](modules.md#killsequencemessage) : T *extends* [*MONITORING*](enums/runnermessagecode.md#monitoring) ? [*MonitoringMessage*](modules.md#monitoringmessage) : T *extends* [*MONITORING\_RATE*](enums/runnermessagecode.md#monitoring_rate) ? [*MonitoringRateMessage*](modules.md#monitoringratemessage) : T *extends* [*STOP*](enums/runnermessagecode.md#stop) ? [*StopSequenceMessage*](modules.md#stopsequencemessage) : T *extends* [*PING*](enums/runnermessagecode.md#ping) ? [*HandshakeMessage*](modules.md#handshakemessage) : T *extends* [*PONG*](enums/runnermessagecode.md#pong) ? [*HandshakeAcknowledgeMessage*](modules.md#handshakeacknowledgemessage) : T *extends* [*SNAPSHOT\_RESPONSE*](enums/runnermessagecode.md#snapshot_response) ? [*SnapshotResponseMessage*](modules.md#snapshotresponsemessage) : *never*

#### Type parameters:

Name |
:------ |
`T` |

Defined in: [types/src/message-streams.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/types/src/message-streams.ts#L31)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `msgCode`: [*MONITORING*](enums/runnermessagecode.md#monitoring)  } & [*MonitoringMessageData*](modules.md#monitoringmessagedata)

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

Defined in: [model/src/messages/monitoring.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/monitoring.ts#L32)

___

### MonitoringMessageData

Ƭ **MonitoringMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`cpu`? | *number* | CPU usage   |
`healthy` | *boolean* | Calculated backpressure: processing * throughput / buffer.   |
`memoryFree`? | *number* | The amount of free RAM.   |
`memoryUsed`? | *number* | The amount of RAM in use.   |
`sequences`? | FunctionStatus[] | How many items are processed by the Sequence per second.   |
`swapFree`? | *number* | The amount of free swap memory.   |
`swapUsed`? | *number* | The amount of swap memory in use.   |

Defined in: [model/src/messages/monitoring.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/monitoring.ts#L4)

___

### MonitoringMessageHandler

Ƭ **MonitoringMessageHandler**<T\>: (`msg`: *EncodedMessage*<T\>) => *MaybePromise*<EncodedMessage<T\>\>

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | MonitoringMessageCode |

#### Type declaration:

▸ (`msg`: *EncodedMessage*<T\>): *MaybePromise*<EncodedMessage<T\>\>

#### Parameters:

Name | Type |
:------ | :------ |
`msg` | *EncodedMessage*<T\> |

**Returns:** *MaybePromise*<EncodedMessage<T\>\>

Defined in: [model/src/stream-handler.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L22)

___

### MonitoringRateMessage

Ƭ **MonitoringRateMessage**: { `msgCode`: [*MONITORING\_RATE*](enums/runnermessagecode.md#monitoring_rate)  } & [*MonitoringRateMessageData*](modules.md#monitoringratemessagedata)

Message instructing Runner how often to emit monitoring messages.
This message type is sent from Supervisor.

Defined in: [model/src/messages/monitor-rate.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/monitor-rate.ts#L13)

___

### MonitoringRateMessageData

Ƭ **MonitoringRateMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`monitoringRate` | *number* | Indicates how frequently should monitoring messages be emitted (in miliseconds).   |

Defined in: [model/src/messages/monitor-rate.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/monitor-rate.ts#L3)

___

### RunnerMessage

Ƭ **RunnerMessage**: [[*RunnerMessageCode*](enums/runnermessagecode.md), *object*]

Defined in: [model/src/runner-message.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/runner-message.ts#L20)

___

### SnapshotResponseMessage

Ƭ **SnapshotResponseMessage**: { `msgCode`: [*SNAPSHOT\_RESPONSE*](enums/runnermessagecode.md#snapshot_response)  } & [*SnapshotResponseMessageData*](modules.md#snapshotresponsemessagedata)

Information about the url of the container snapshot created.
This message type is sent from the LifeCycle Controller.

Defined in: [model/src/messages/snapshot-response.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/snapshot-response.ts#L13)

___

### SnapshotResponseMessageData

Ƭ **SnapshotResponseMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`url` | *string* | The url of container snapshot created.   |

Defined in: [model/src/messages/snapshot-response.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/snapshot-response.ts#L3)

___

### StatusMessage

Ƭ **StatusMessage**: { `msgCode`: [*STATUS*](enums/runnermessagecode.md#status)  } & [*StatusMessageData*](modules.md#statusmessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

Defined in: [model/src/messages/status.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/status.ts#L15)

___

### StatusMessageData

Ƭ **StatusMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`definition`? | FunctionDefinition[] | Provides the definition of each subsequence.   |

Defined in: [model/src/messages/status.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/status.ts#L4)

___

### StopSequenceMessage

Ƭ **StopSequenceMessage**: { `msgCode`: [*STOP*](enums/runnermessagecode.md#stop)  } & [*StopSequenceMessageData*](modules.md#stopsequencemessagedata)

Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
It gives Sequence and Runner time to perform a cleanup.
This message type is sent from Supervisor.

Defined in: [model/src/messages/stop-sequence.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/stop-sequence.ts#L17)

___

### StopSequenceMessageData

Ƭ **StopSequenceMessageData**: *object*

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`canCallKeepalive` | *boolean* | Informs if keepAlive can be called to prolong the running of the Sequence.   |
`timeout` | *number* | The number of milliseconds before the Sequence will be killed.   |

Defined in: [model/src/messages/stop-sequence.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages/stop-sequence.ts#L3)

## Variables

### MessageUtilities

• `Const` **MessageUtilities**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`deserializeMessage` | (`msg`: *string*) => [*MessageType*](modules.md#messagetype)<[*RunnerMessageCode*](enums/runnermessagecode.md)\> |
`serializeMessage` | <T\>(`\_\_namedParameters`: [*MessageType*](modules.md#messagetype)<T\>) => [*RunnerMessage*](modules.md#runnermessage) |

Defined in: [model/src/index.ts:2](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/index.ts#L2)

## Functions

### checkMessage

▸ `Const`**checkMessage**<X\>(`msgCode`: X, `msgData`: [*HandshakeAcknowledgeMessageData*](modules.md#handshakeacknowledgemessagedata) \| [*MonitoringMessageData*](modules.md#monitoringmessagedata) \| [*DescribeSequenceMessageData*](modules.md#describesequencemessagedata) \| [*ErrorMessageData*](modules.md#errormessagedata) \| [*SnapshotResponseMessageData*](modules.md#snapshotresponsemessagedata) \| [*StatusMessageData*](modules.md#statusmessagedata) \| [*KeepAliveMessageData*](modules.md#keepalivemessagedata) \| [*AcknowledgeMessageData*](modules.md#acknowledgemessagedata) \| [*StopSequenceMessageData*](modules.md#stopsequencemessagedata) \| [*MonitoringRateMessageData*](modules.md#monitoringratemessagedata) \| [*EmptyMessageData*](modules.md#emptymessagedata)): [*MessageDataType*](modules.md#messagedatatype)<X\>

#### Type parameters:

Name | Type |
:------ | :------ |
`X` | [*RunnerMessageCode*](enums/runnermessagecode.md) |

#### Parameters:

Name | Type |
:------ | :------ |
`msgCode` | X |
`msgData` | [*HandshakeAcknowledgeMessageData*](modules.md#handshakeacknowledgemessagedata) \| [*MonitoringMessageData*](modules.md#monitoringmessagedata) \| [*DescribeSequenceMessageData*](modules.md#describesequencemessagedata) \| [*ErrorMessageData*](modules.md#errormessagedata) \| [*SnapshotResponseMessageData*](modules.md#snapshotresponsemessagedata) \| [*StatusMessageData*](modules.md#statusmessagedata) \| [*KeepAliveMessageData*](modules.md#keepalivemessagedata) \| [*AcknowledgeMessageData*](modules.md#acknowledgemessagedata) \| [*StopSequenceMessageData*](modules.md#stopsequencemessagedata) \| [*MonitoringRateMessageData*](modules.md#monitoringratemessagedata) \| [*EmptyMessageData*](modules.md#emptymessagedata) |

**Returns:** [*MessageDataType*](modules.md#messagedatatype)<X\>

Defined in: [model/src/get-message.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/get-message.ts#L47)

___

### deserializeMessage

▸ **deserializeMessage**(`msg`: *string*): [*MessageType*](modules.md#messagetype)<[*RunnerMessageCode*](enums/runnermessagecode.md)\>

Get an object of message type from serialized message.

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`msg` | *string* | a stringified and serialized message   |

**Returns:** [*MessageType*](modules.md#messagetype)<[*RunnerMessageCode*](enums/runnermessagecode.md)\>

- an object of message type

Defined in: [model/src/messages-utils.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages-utils.ts#L30)

___

### getMessage

▸ `Const`**getMessage**<X\>(`msgCode`: X, `msgData`: [*MessageDataType*](modules.md#messagedatatype)<X\>): [*MessageType*](modules.md#messagetype)<X\>

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Type parameters:

Name | Type |
:------ | :------ |
`X` | [*RunnerMessageCode*](enums/runnermessagecode.md) |

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`msgCode` | X | message type code   |
`msgData` | [*MessageDataType*](modules.md#messagedatatype)<X\> | a message object   |

**Returns:** [*MessageType*](modules.md#messagetype)<X\>

- an object of message type

Defined in: [model/src/get-message.ts:88](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/get-message.ts#L88)

___

### serializeMessage

▸ **serializeMessage**<T\>(`__namedParameters`: [*MessageType*](modules.md#messagetype)<T\>): [*RunnerMessage*](modules.md#runnermessage)

Serizalized message.

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | [*RunnerMessageCode*](enums/runnermessagecode.md) |

#### Parameters:

Name | Type |
:------ | :------ |
`__namedParameters` | [*MessageType*](modules.md#messagetype)<T\> |

**Returns:** [*RunnerMessage*](modules.md#runnermessage)

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

Defined in: [model/src/messages-utils.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/messages-utils.ts#L16)

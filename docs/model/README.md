@scramjet/model

# @scramjet/model

## Table of contents

### Classes

- [AppError](classes/apperror.md)
- [CSIControllerError](classes/csicontrollererror.md)
- [CommunicationHandler](classes/communicationhandler.md)
- [DelayedStream](classes/delayedstream.md)
- [HostError](classes/hosterror.md)
- [RunnerError](classes/runnererror.md)
- [SupervisorError](classes/supervisorerror.md)

### Type aliases

- [AcknowledgeMessage](README.md#acknowledgemessage)
- [AcknowledgeMessageData](README.md#acknowledgemessagedata)
- [ConfiguredMessageHandler](README.md#configuredmessagehandler)
- [ConfirmHealthMessage](README.md#confirmhealthmessage)
- [ControlMessageHandler](README.md#controlmessagehandler)
- [DescribeSequenceMessage](README.md#describesequencemessage)
- [DescribeSequenceMessageData](README.md#describesequencemessagedata)
- [EmptyMessageData](README.md#emptymessagedata)
- [ErrorMessage](README.md#errormessage)
- [ErrorMessageData](README.md#errormessagedata)
- [EventMessage](README.md#eventmessage)
- [EventMessageData](README.md#eventmessagedata)
- [HandshakeAcknowledgeMessage](README.md#handshakeacknowledgemessage)
- [HandshakeAcknowledgeMessageData](README.md#handshakeacknowledgemessagedata)
- [HandshakeMessage](README.md#handshakemessage)
- [ICSIControllerErrorData](README.md#icsicontrollererrordata)
- [IHostErrorData](README.md#ihosterrordata)
- [IRunnerErrorData](README.md#irunnererrordata)
- [ISupervisorErrorData](README.md#isupervisorerrordata)
- [InstanceConfigMessage](README.md#instanceconfigmessage)
- [InstanceConfigMessageData](README.md#instanceconfigmessagedata)
- [KeepAliveMessage](README.md#keepalivemessage)
- [KeepAliveMessageData](README.md#keepalivemessagedata)
- [KillSequenceMessage](README.md#killsequencemessage)
- [Message](README.md#message)
- [MonitoringMessage](README.md#monitoringmessage)
- [MonitoringMessageData](README.md#monitoringmessagedata)
- [MonitoringMessageFromRunnerData](README.md#monitoringmessagefromrunnerdata)
- [MonitoringMessageHandler](README.md#monitoringmessagehandler)
- [MonitoringRateMessage](README.md#monitoringratemessage)
- [MonitoringRateMessageData](README.md#monitoringratemessagedata)
- [SequenceCompleteMessage](README.md#sequencecompletemessage)
- [SequenceEndMessage](README.md#sequenceendmessage)
- [SequenceEndMessageData](README.md#sequenceendmessagedata)
- [SnapshotResponseMessage](README.md#snapshotresponsemessage)
- [SnapshotResponseMessageData](README.md#snapshotresponsemessagedata)
- [StatusMessage](README.md#statusmessage)
- [StatusMessageData](README.md#statusmessagedata)
- [StopSequenceMessage](README.md#stopsequencemessage)
- [StopSequenceMessageData](README.md#stopsequencemessagedata)

### Variables

- [MessageUtilities](README.md#messageutilities)

### Functions

- [checkMessage](README.md#checkmessage)
- [deserializeMessage](README.md#deserializemessage)
- [getMessage](README.md#getmessage)
- [promiseTimeout](README.md#promisetimeout)
- [serializeMessage](README.md#serializemessage)

## Type aliases

### AcknowledgeMessage

Ƭ **AcknowledgeMessage**: { `msgCode`: RunnerMessageCode.ACKNOWLEDGE  } & [*AcknowledgeMessageData*](README.md#acknowledgemessagedata)

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/acknowledge.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/acknowledge.ts#L22)

___

### AcknowledgeMessageData

Ƭ **AcknowledgeMessageData**: { `acknowledged`: *boolean* ; `errorMsg?`: [*ErrorMessage*](README.md#errormessage) ; `status?`: *number*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`acknowledged` | *boolean* | Indicates whether a message was received.   |
`errorMsg?` | [*ErrorMessage*](README.md#errormessage) | Describes an error message if error was thrown after performing a requested operation.   |
`status?` | *number* | Indicates status of the performed operation.   |

Defined in: [packages/model/src/messages/acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/acknowledge.ts#L4)

___

### ConfiguredMessageHandler

Ƭ **ConfiguredMessageHandler**<T\>: { `blocking`: *boolean* ; `handler`: [*MonitoringMessageHandler*](README.md#monitoringmessagehandler)<T *extends* MonitoringMessageCode ? T : *never*\>  } \| { `blocking`: *boolean* ; `handler`: [*ControlMessageHandler*](README.md#controlmessagehandler)<T *extends* ControlMessageCode ? T : *never*\>  }

#### Type parameters:

Name | Type |
------ | ------ |
`T` | RunnerMessageCode \| SupervisorMessageCode |

Defined in: [packages/model/src/stream-handler.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L25)

___

### ConfirmHealthMessage

Ƭ **ConfirmHealthMessage**: { `msgCode`: RunnerMessageCode.FORCE\_CONFIRM\_ALIVE  }

Message forcing Runner to emit a keep alive message.
It is used when Supervisor does not receive a keep alive message from Runner withih a specified time frame.
It forces Runner to emit a keep alive message to confirm it is still active.
This message type is sent from Supervisor.

#### Type declaration:

Name | Type |
------ | ------ |
`msgCode` | RunnerMessageCode.FORCE\_CONFIRM\_ALIVE |

Defined in: [packages/model/src/messages/confirm-health.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/confirm-health.ts#L9)

___

### ControlMessageHandler

Ƭ **ControlMessageHandler**<T\>: (`msg`: *EncodedMessage*<T\>) => *MaybePromise*<*EncodedMessage*<T\> \| *null*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | ControlMessageCode |

Defined in: [packages/model/src/stream-handler.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L23)

___

### DescribeSequenceMessage

Ƭ **DescribeSequenceMessage**: { `msgCode`: RunnerMessageCode.DESCRIBE\_SEQUENCE  } & [*DescribeSequenceMessageData*](README.md#describesequencemessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/describe-sequence.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/describe-sequence.ts#L15)

___

### DescribeSequenceMessageData

Ƭ **DescribeSequenceMessageData**: { `definition?`: FunctionDefinition[]  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`definition?` | FunctionDefinition[] | Provides the definition of each subsequence.   |

Defined in: [packages/model/src/messages/describe-sequence.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/describe-sequence.ts#L4)

___

### EmptyMessageData

Ƭ **EmptyMessageData**: {}

Defined in: [packages/model/src/messages/message.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/message.ts#L16)

___

### ErrorMessage

Ƭ **ErrorMessage**: { `msgCode`: RunnerMessageCode.ERROR  } & [*ErrorMessageData*](README.md#errormessagedata)

A general purpose error message.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/error.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/error.ts#L22)

___

### ErrorMessageData

Ƭ **ErrorMessageData**: { `errorCode`: *number* ; `exitCode`: *number* ; `message`: *string* ; `stack`: *string*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`errorCode` | *number* | Error's status code   |
`exitCode` | *number* | The operation's exit code.   |
`message` | *string* | Error message.   |
`stack` | *string* | Error stack trace.   |

Defined in: [packages/model/src/messages/error.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/error.ts#L3)

___

### EventMessage

Ƭ **EventMessage**: { `msgCode`: RunnerMessageCode.EVENT  } & [*EventMessageData*](README.md#eventmessagedata)

TODO update
Event message emitted by sequence and handeled in the context.

Defined in: [packages/model/src/messages/event.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/event.ts#L16)

___

### EventMessageData

Ƭ **EventMessageData**: { `eventName`: *string* ; `message`: *any*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`eventName` | *string* | Name of the event.   |
`message` | *any* | TODO update Informs if keepAlive can be called to prolong the running of the Sequence.   |

Defined in: [packages/model/src/messages/event.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/event.ts#L3)

___

### HandshakeAcknowledgeMessage

Ƭ **HandshakeAcknowledgeMessage**: { `msgCode`: RunnerMessageCode.PONG  } & [*HandshakeAcknowledgeMessageData*](README.md#handshakeacknowledgemessagedata)

Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
the received handshake message (PING).
The message includes the Sequence configuration information.

Defined in: [packages/model/src/messages/handshake-acknowledge.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/handshake-acknowledge.ts#L16)

___

### HandshakeAcknowledgeMessageData

Ƭ **HandshakeAcknowledgeMessageData**: { `appConfig`: AppConfig ; `arguments?`: *any*[]  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`appConfig` | AppConfig | Sequence configuration passed to the Sequence when it is started by the Runner.   |
`arguments?` | *any*[] | - |

Defined in: [packages/model/src/messages/handshake-acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/handshake-acknowledge.ts#L4)

___

### HandshakeMessage

Ƭ **HandshakeMessage**: { `msgCode`: RunnerMessageCode.PING  }

Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
Runner is then waiting to receive the handshake acknowledge message back (PONG)
from the CSH to start the Sequence.

#### Type declaration:

Name | Type |
------ | ------ |
`msgCode` | RunnerMessageCode.PING |

Defined in: [packages/model/src/messages/handshake.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/handshake.ts#L8)

___

### ICSIControllerErrorData

Ƭ **ICSIControllerErrorData**: *any*

Defined in: [packages/model/src/errors/csi-controller-error.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/errors/csi-controller-error.ts#L4)

___

### IHostErrorData

Ƭ **IHostErrorData**: *any*

Defined in: [packages/model/src/errors/host-error.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/errors/host-error.ts#L4)

___

### IRunnerErrorData

Ƭ **IRunnerErrorData**: *any*

Defined in: [packages/model/src/errors/runner-error.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/errors/runner-error.ts#L4)

___

### ISupervisorErrorData

Ƭ **ISupervisorErrorData**: *any*

Defined in: [packages/model/src/errors/supervisor-error.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/errors/supervisor-error.ts#L4)

___

### InstanceConfigMessage

Ƭ **InstanceConfigMessage**: { `msgCode`: SupervisorMessageCode.CONFIG  } & [*InstanceConfigMessageData*](README.md#instanceconfigmessagedata)

Defined in: [packages/model/src/messages/instance-config.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/instance-config.ts#L8)

___

### InstanceConfigMessageData

Ƭ **InstanceConfigMessageData**: { `config`: RunnerConfig  }

#### Type declaration:

Name | Type |
------ | ------ |
`config` | RunnerConfig |

Defined in: [packages/model/src/messages/instance-config.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/instance-config.ts#L4)

___

### KeepAliveMessage

Ƭ **KeepAliveMessage**: { `msgCode`: RunnerMessageCode.ALIVE  } & [*KeepAliveMessageData*](README.md#keepalivemessagedata)

Message instrucing how much longer to keep Sequence alive.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/keep-alive.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/keep-alive.ts#L13)

___

### KeepAliveMessageData

Ƭ **KeepAliveMessageData**: { `keepAlive`: *number*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`keepAlive` | *number* | Information on how much longer the Sequence will be active (in miliseconds).   |

Defined in: [packages/model/src/messages/keep-alive.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/keep-alive.ts#L3)

___

### KillSequenceMessage

Ƭ **KillSequenceMessage**: { `msgCode`: RunnerMessageCode.KILL  }

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from Supervisor.

#### Type declaration:

Name | Type |
------ | ------ |
`msgCode` | RunnerMessageCode.KILL |

Defined in: [packages/model/src/messages/kill-sequence.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/kill-sequence.ts#L8)

___

### Message

Ƭ **Message**: { `msgCode`: RunnerMessageCode  }

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`msgCode` | RunnerMessageCode | Message type code from RunnerMessageCode enumeration.   |

Defined in: [packages/model/src/messages/message.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/message.ts#L10)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `msgCode`: RunnerMessageCode.MONITORING  } & [*MonitoringMessageData*](README.md#monitoringmessagedata)

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/monitoring.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/monitoring.ts#L38)

___

### MonitoringMessageData

Ƭ **MonitoringMessageData**: [*MonitoringMessageFromRunnerData*](README.md#monitoringmessagefromrunnerdata) & { `cpuTotalUsage?`: *number* ; `limit?`: *number* ; `memoryMaxUsage?`: *number* ; `memoryUsage?`: *number* ; `networkRx?`: *number* ; `networkTx?`: *number*  }

Defined in: [packages/model/src/messages/monitoring.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/monitoring.ts#L13)

___

### MonitoringMessageFromRunnerData

Ƭ **MonitoringMessageFromRunnerData**: { `healthy`: *boolean* ; `sequences?`: FunctionStatus[]  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`healthy` | *boolean* | Calculated backpressure: processing * throughput / buffer.   |
`sequences?` | FunctionStatus[] | How many items are processed by the Sequence per second.   |

Defined in: [packages/model/src/messages/monitoring.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/monitoring.ts#L4)

___

### MonitoringMessageHandler

Ƭ **MonitoringMessageHandler**<T\>: (`msg`: *EncodedMessage*<T\>) => *MaybePromise*<*EncodedMessage*<T\> \| *null*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | MonitoringMessageCode |

Defined in: [packages/model/src/stream-handler.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L21)

___

### MonitoringRateMessage

Ƭ **MonitoringRateMessage**: { `msgCode`: RunnerMessageCode.MONITORING\_RATE  } & [*MonitoringRateMessageData*](README.md#monitoringratemessagedata)

Message instructing Runner how often to emit monitoring messages.
This message type is sent from Supervisor.

Defined in: [packages/model/src/messages/monitor-rate.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/monitor-rate.ts#L13)

___

### MonitoringRateMessageData

Ƭ **MonitoringRateMessageData**: { `monitoringRate`: *number*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`monitoringRate` | *number* | Indicates how frequently should monitoring messages be emitted (in miliseconds).   |

Defined in: [packages/model/src/messages/monitor-rate.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/monitor-rate.ts#L3)

___

### SequenceCompleteMessage

Ƭ **SequenceCompleteMessage**: { `msgCode`: RunnerMessageCode.SEQUENCE\_COMPLETED  } & [*EmptyMessageData*](README.md#emptymessagedata)

Message from the Runner indicating that the sequence has completed sending it's data
and now can be asked to exit with high probability of accepting the exit gracefully.

Defined in: [packages/model/src/messages/sequence-complete.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/sequence-complete.ts#L8)

___

### SequenceEndMessage

Ƭ **SequenceEndMessage**: { `msgCode`: RunnerMessageCode.SEQUENCE\_COMPLETED  } & [*SequenceEndMessageData*](README.md#sequenceendmessagedata)

Message from the Runner indicating that the sequence has called the end method
on context and it should be safe to terminate it without additional waiting,
unless it exits correctly itself.

Defined in: [packages/model/src/messages/sequence-end.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/sequence-end.ts#L13)

___

### SequenceEndMessageData

Ƭ **SequenceEndMessageData**: { `err`: Error  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`err` | Error | The url of container snapshot created.   |

Defined in: [packages/model/src/messages/sequence-end.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/sequence-end.ts#L3)

___

### SnapshotResponseMessage

Ƭ **SnapshotResponseMessage**: { `msgCode`: RunnerMessageCode.SNAPSHOT\_RESPONSE  } & [*SnapshotResponseMessageData*](README.md#snapshotresponsemessagedata)

Information about the url of the container snapshot created.
This message type is sent from the LifeCycle Controller.

Defined in: [packages/model/src/messages/snapshot-response.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/snapshot-response.ts#L13)

___

### SnapshotResponseMessageData

Ƭ **SnapshotResponseMessageData**: { `url`: *string*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`url` | *string* | The url of container snapshot created.   |

Defined in: [packages/model/src/messages/snapshot-response.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/snapshot-response.ts#L3)

___

### StatusMessage

Ƭ **StatusMessage**: { `msgCode`: RunnerMessageCode.STATUS  } & [*StatusMessageData*](README.md#statusmessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

Defined in: [packages/model/src/messages/status.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/status.ts#L15)

___

### StatusMessageData

Ƭ **StatusMessageData**: { `definition?`: FunctionDefinition[]  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`definition?` | FunctionDefinition[] | Provides the definition of each subsequence.   |

Defined in: [packages/model/src/messages/status.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/status.ts#L4)

___

### StopSequenceMessage

Ƭ **StopSequenceMessage**: { `msgCode`: RunnerMessageCode.STOP  } & [*StopSequenceMessageData*](README.md#stopsequencemessagedata)

Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
It gives Sequence and Runner time to perform a cleanup.
This message type is sent from Supervisor.

Defined in: [packages/model/src/messages/stop-sequence.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/stop-sequence.ts#L17)

___

### StopSequenceMessageData

Ƭ **StopSequenceMessageData**: { `canCallKeepalive`: *boolean* ; `timeout`: *number*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`canCallKeepalive` | *boolean* | Informs if keepAlive can be called to prolong the running of the Sequence.   |
`timeout` | *number* | The number of milliseconds before the Sequence will be killed.   |

Defined in: [packages/model/src/messages/stop-sequence.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages/stop-sequence.ts#L3)

## Variables

### MessageUtilities

• `Const` **MessageUtilities**: *object*

#### Type declaration:

Name | Type |
------ | ------ |
`deserializeMessage` | (`msg`: *string*) => *MessageType*<RunnerMessageCode\> |
`serializeMessage` | <T\>(`\_\_namedParameters`: *MessageType*<T\>) => RunnerMessage \| SupervisorMessage |

Defined in: [packages/model/src/index.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/index.ts#L29)

## Functions

### checkMessage

▸ `Const`**checkMessage**<X\>(`msgCode`: X, `msgData`: [*MonitoringMessageData*](README.md#monitoringmessagedata) \| [*DescribeSequenceMessageData*](README.md#describesequencemessagedata) \| [*ErrorMessageData*](README.md#errormessagedata) \| [*SnapshotResponseMessageData*](README.md#snapshotresponsemessagedata) \| [*StatusMessageData*](README.md#statusmessagedata) \| [*KeepAliveMessageData*](README.md#keepalivemessagedata) \| [*AcknowledgeMessageData*](README.md#acknowledgemessagedata) \| [*HandshakeAcknowledgeMessageData*](README.md#handshakeacknowledgemessagedata) \| [*StopSequenceMessageData*](README.md#stopsequencemessagedata) \| [*MonitoringRateMessageData*](README.md#monitoringratemessagedata) \| [*EmptyMessageData*](README.md#emptymessagedata)): *MessageDataType*<X\>

#### Type parameters:

Name | Type |
------ | ------ |
`X` | PING \| MONITORING \| DESCRIBE\_SEQUENCE \| ERROR \| SNAPSHOT\_RESPONSE \| SEQUENCE\_STOPPED \| STATUS \| ALIVE \| ACKNOWLEDGE \| SEQUENCE\_COMPLETED \| PONG \| STOP \| KILL \| MONITORING\_RATE \| FORCE\_CONFIRM\_ALIVE \| EVENT \| CONFIG |

#### Parameters:

Name | Type |
------ | ------ |
`msgCode` | X |
`msgData` | [*MonitoringMessageData*](README.md#monitoringmessagedata) \| [*DescribeSequenceMessageData*](README.md#describesequencemessagedata) \| [*ErrorMessageData*](README.md#errormessagedata) \| [*SnapshotResponseMessageData*](README.md#snapshotresponsemessagedata) \| [*StatusMessageData*](README.md#statusmessagedata) \| [*KeepAliveMessageData*](README.md#keepalivemessagedata) \| [*AcknowledgeMessageData*](README.md#acknowledgemessagedata) \| [*HandshakeAcknowledgeMessageData*](README.md#handshakeacknowledgemessagedata) \| [*StopSequenceMessageData*](README.md#stopsequencemessagedata) \| [*MonitoringRateMessageData*](README.md#monitoringratemessagedata) \| [*EmptyMessageData*](README.md#emptymessagedata) |

**Returns:** *MessageDataType*<X\>

Defined in: [packages/model/src/get-message.ts:55](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/get-message.ts#L55)

___

### deserializeMessage

▸ **deserializeMessage**(`msg`: *string*): *MessageType*<RunnerMessageCode\>

Get an object of message type from serialized message.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`msg` | *string* | a stringified and serialized message   |

**Returns:** *MessageType*<RunnerMessageCode\>

- an object of message type

Defined in: [packages/model/src/messages-utils.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages-utils.ts#L29)

___

### getMessage

▸ `Const`**getMessage**<X\>(`msgCode`: X, `msgData`: *MessageDataType*<X\>): *MessageType*<X\>

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Type parameters:

Name | Type |
------ | ------ |
`X` | RunnerMessageCode |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`msgCode` | X | message type code   |
`msgData` | *MessageDataType*<X\> | a message object   |

**Returns:** *MessageType*<X\>

- an object of message type

Defined in: [packages/model/src/get-message.ts:102](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/get-message.ts#L102)

___

### promiseTimeout

▸ `Const`**promiseTimeout**(`endOfSequence`: *Promise*<*any*\>, `timeout`: *number*): *Promise*<*any*\>

#### Parameters:

Name | Type |
------ | ------ |
`endOfSequence` | *Promise*<*any*\> |
`timeout` | *number* |

**Returns:** *Promise*<*any*\>

Defined in: [packages/model/src/utils/promiseTimout.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/utils/promiseTimout.ts#L4)

___

### serializeMessage

▸ **serializeMessage**<T\>(`__namedParameters`: *MessageType*<T\>): RunnerMessage \| SupervisorMessage

Serizalized message.

#### Type parameters:

Name | Type |
------ | ------ |
`T` | PING \| MONITORING \| DESCRIBE\_SEQUENCE \| ERROR \| SNAPSHOT\_RESPONSE \| SEQUENCE\_STOPPED \| STATUS \| ALIVE \| ACKNOWLEDGE \| SEQUENCE\_COMPLETED \| PONG \| STOP \| KILL \| MONITORING\_RATE \| FORCE\_CONFIRM\_ALIVE \| EVENT \| CONFIG |

#### Parameters:

• **__namedParameters**: *MessageType*<T\>

**Returns:** RunnerMessage \| SupervisorMessage

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

Defined in: [packages/model/src/messages-utils.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/messages-utils.ts#L14)

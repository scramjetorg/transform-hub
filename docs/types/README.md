@scramjet/types

# @scramjet/types

## Table of contents

### Namespaces

- [MessageCodes](modules/messagecodes.md)

### Interfaces

- [APIBase](interfaces/apibase.md)
- [APIError](interfaces/apierror.md)
- [APIExpose](interfaces/apiexpose.md)
- [APIRoute](interfaces/apiroute.md)
- [AppContext](interfaces/appcontext.md)
- [ICSHClient](interfaces/icshclient.md)
- [ICommunicationHandler](interfaces/icommunicationhandler.md)
- [IComponent](interfaces/icomponent.md)
- [ILifeCycleAdapter](interfaces/ilifecycleadapter.md)
- [ILifeCycleAdapterIdentify](interfaces/ilifecycleadapteridentify.md)
- [ILifeCycleAdapterMain](interfaces/ilifecycleadaptermain.md)
- [ILifeCycleAdapterRun](interfaces/ilifecycleadapterrun.md)
- [ReadableStream](interfaces/readablestream.md)
- [WritableStream](interfaces/writablestream.md)

### Type aliases

- [AppConfig](README.md#appconfig)
- [AppError](README.md#apperror)
- [AppErrorCode](README.md#apperrorcode)
- [AppErrorConstructor](README.md#apperrorconstructor)
- [Application](README.md#application)
- [ApplicationExpose](README.md#applicationexpose)
- [ApplicationFunction](README.md#applicationfunction)
- [ApplicationInterface](README.md#applicationinterface)
- [CSIControllerErrorCode](README.md#csicontrollererrorcode)
- [ControlMessageCode](README.md#controlmessagecode)
- [DockerRunnerConfig](README.md#dockerrunnerconfig)
- [DownstreamStreamsConfig](README.md#downstreamstreamsconfig)
- [DuplexStream](README.md#duplexstream)
- [EncodedControlMessage](README.md#encodedcontrolmessage)
- [EncodedMessage](README.md#encodedmessage)
- [EncodedMonitoringMessage](README.md#encodedmonitoringmessage)
- [EncodedSerializedControlMessage](README.md#encodedserializedcontrolmessage)
- [EncodedSerializedMonitoringMessage](README.md#encodedserializedmonitoringmessage)
- [ExitCode](README.md#exitcode)
- [FunctionDefinition](README.md#functiondefinition)
- [FunctionStatus](README.md#functionstatus)
- [GetResolver](README.md#getresolver)
- [HostErrorCode](README.md#hosterrorcode)
- [InertApp](README.md#inertapp)
- [InertSequence](README.md#inertsequence)
- [KillHandler](README.md#killhandler)
- [LifeCycleConfig](README.md#lifecycleconfig)
- [LifeCycleError](README.md#lifecycleerror)
- [Logger](README.md#logger)
- [LoggerOptions](README.md#loggeroptions)
- [LoggerOutput](README.md#loggeroutput)
- [MessageCode](README.md#messagecode)
- [MessageDataType](README.md#messagedatatype)
- [MessageType](README.md#messagetype)
- [Middleware](README.md#middleware)
- [MonitoringHandler](README.md#monitoringhandler)
- [MonitoringMessage](README.md#monitoringmessage)
- [MonitoringMessageCode](README.md#monitoringmessagecode)
- [NextCallback](README.md#nextcallback)
- [OpResolver](README.md#opresolver)
- [PassThoughStream](README.md#passthoughstream)
- [PassThroughStreamsConfig](README.md#passthroughstreamsconfig)
- [RFunction](README.md#rfunction)
- [ReadFunction](README.md#readfunction)
- [ReadSequence](README.md#readsequence)
- [ReadableApp](README.md#readableapp)
- [RunnerConfig](README.md#runnerconfig)
- [RunnerErrorCode](README.md#runnererrorcode)
- [RunnerMessage](README.md#runnermessage)
- [RunnerOptions](README.md#runneroptions)
- [StopHandler](README.md#stophandler)
- [StreamConfig](README.md#streamconfig)
- [StreamInput](README.md#streaminput)
- [StreamOutput](README.md#streamoutput)
- [Streamable](README.md#streamable)
- [SupervisorErrorCode](README.md#supervisorerrorcode)
- [SupervisorMessage](README.md#supervisormessage)
- [SynchronousStreamable](README.md#synchronousstreamable)
- [TFunction](README.md#tfunction)
- [TFunctionChain](README.md#tfunctionchain)
- [TranformFunction](README.md#tranformfunction)
- [TransformApp](README.md#transformapp)
- [TransformAppAcceptableSequence](README.md#transformappacceptablesequence)
- [TransformSeqence](README.md#transformseqence)
- [UpstreamStreamsConfig](README.md#upstreamstreamsconfig)
- [WFunction](README.md#wfunction)
- [WritableApp](README.md#writableapp)
- [WriteFunction](README.md#writefunction)
- [WriteSequence](README.md#writesequence)

## Type aliases

### AppConfig

Ƭ **AppConfig**: { [key: string]: *null* \| *string* \| *number* \| *boolean* \| [*AppConfig*](README.md#appconfig);  }

App configuration primitive.

Defined in: [packages/types/src/application.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L12)

___

### AppError

Ƭ **AppError**: Error & { `code`: [*AppErrorCode*](README.md#apperrorcode) ; `exitcode?`: *number*  }

Application error class

Defined in: [packages/types/src/error-codes/app-error.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/app-error.ts#L19)

___

### AppErrorCode

Ƭ **AppErrorCode**: *GENERAL_ERROR* \| *COMPILE_ERROR* \| *CONTEXT_NOT_INITIALIZED* \| *SEQUENCE_RUN_BEFORE_INIT* \| *SEQUENCE_MISCONFIGURED* \| [*HostErrorCode*](README.md#hosterrorcode) \| [*SupervisorErrorCode*](README.md#supervisorerrorcode) \| [*RunnerErrorCode*](README.md#runnererrorcode)

Acceptable error codes

Defined in: [packages/types/src/error-codes/app-error.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/app-error.ts#L6)

___

### AppErrorConstructor

Ƭ **AppErrorConstructor**: (`code`: [*AppErrorCode*](README.md#apperrorcode), `message?`: *string*) => [*AppError*](README.md#apperror)

Constructs an AppError

**`param`** One of the predefined error codes

**`param`** Optional additional explanatory message

Defined in: [packages/types/src/error-codes/app-error.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/app-error.ts#L30)

___

### Application

Ƭ **Application**<Consumes, Produces, Z, S, AppConfigType\>: [*TransformApp*](README.md#transformapp)<Consumes, Produces, Z, S, AppConfigType\> \| [*ReadableApp*](README.md#readableapp)<Produces, Z, S, AppConfigType\> \| [*WritableApp*](README.md#writableapp)<Consumes, Z, S, AppConfigType\> \| [*InertApp*](README.md#inertapp)<Z, S\>

Application is an acceptable input for the runner.

**`interface`**

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |

Defined in: [packages/types/src/application.ts:98](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L98)

___

### ApplicationExpose

Ƭ **ApplicationExpose**<Consumes, Produces, Z, S, AppConfigType\>: { `[exposeSequenceSymbol]`: [*Application*](README.md#application)<Consumes, Produces, Z, S, AppConfigType\>  }

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |

#### Type declaration:

Name | Type |
------ | ------ |
`[exposeSequenceSymbol]` | [*Application*](README.md#application)<Consumes, Produces, Z, S, AppConfigType\> |

Defined in: [packages/types/src/application.ts:81](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L81)

___

### ApplicationFunction

Ƭ **ApplicationFunction**: [*ReadableApp*](README.md#readableapp) \| [*WritableApp*](README.md#writableapp) \| [*TransformApp*](README.md#transformapp) \| [*InertApp*](README.md#inertapp)

Defined in: [packages/types/src/application.ts:79](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L79)

___

### ApplicationInterface

Ƭ **ApplicationInterface**: (`this`: [*AppContext*](interfaces/appcontext.md)<[*AppConfig*](README.md#appconfig), *any*\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<*any*\>, ...`argv`: *any*[]) => *MaybePromise*<[*Streamable*](README.md#streamable)<*any*\> \| *void*\>

Defined in: [packages/types/src/application.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L14)

___

### CSIControllerErrorCode

Ƭ **CSIControllerErrorCode**: *UNINITIALIZED_STREAM* \| *UNATTACHED_STREAMS*

Defined in: [packages/types/src/error-codes/csi-controller-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/csi-controller-error.ts#L1)

___

### ControlMessageCode

Ƭ **ControlMessageCode**: RunnerMessageCode.FORCE\_CONFIRM\_ALIVE \| RunnerMessageCode.KILL \| RunnerMessageCode.MONITORING\_RATE \| RunnerMessageCode.STOP \| RunnerMessageCode.EVENT \| RunnerMessageCode.PONG \| SupervisorMessageCode.CONFIG

Defined in: [packages/types/src/message-streams.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L70)

___

### DockerRunnerConfig

Ƭ **DockerRunnerConfig**: [*RunnerConfig*](README.md#runnerconfig) & { `config`: { `volumesFrom`: *string*  }  }

Defined in: [packages/types/src/lifecycle-adapters.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L22)

___

### DownstreamStreamsConfig

Ƭ **DownstreamStreamsConfig**<serialized\>: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>, control: WritableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: ReadableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: WritableStream<any\>, output: ReadableStream<any\>, log: ReadableStream<any\>, pkg?: WritableStream<Buffer\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`serialized` | *boolean* | *true* |

Defined in: [packages/types/src/message-streams.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L89)

___

### DuplexStream

Ƭ **DuplexStream**<Consumes, Produces\>: [*WritableStream*](interfaces/writablestream.md)<Consumes\> & [*ReadableStream*](interfaces/readablestream.md)<Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [packages/types/src/utils.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/utils.ts#L65)

___

### EncodedControlMessage

Ƭ **EncodedControlMessage**: [*EncodedMessage*](README.md#encodedmessage)<[*ControlMessageCode*](README.md#controlmessagecode)\>

Defined in: [packages/types/src/message-streams.ts:76](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L76)

___

### EncodedMessage

Ƭ **EncodedMessage**<T\>: [T, [*MessageDataType*](README.md#messagedatatype)<T\>]

#### Type parameters:

Name | Type |
------ | ------ |
`T` | RunnerMessageCode \| SupervisorMessageCode |

Defined in: [packages/types/src/message-streams.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L69)

___

### EncodedMonitoringMessage

Ƭ **EncodedMonitoringMessage**: [*EncodedMessage*](README.md#encodedmessage)<[*MonitoringMessageCode*](README.md#monitoringmessagecode)\>

Defined in: [packages/types/src/message-streams.ts:87](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L87)

___

### EncodedSerializedControlMessage

Ƭ **EncodedSerializedControlMessage**: *string*

Defined in: [packages/types/src/message-streams.ts:84](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L84)

___

### EncodedSerializedMonitoringMessage

Ƭ **EncodedSerializedMonitoringMessage**: *string*

Defined in: [packages/types/src/message-streams.ts:85](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L85)

___

### ExitCode

Ƭ **ExitCode**: *number*

Defined in: [packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L26)

___

### FunctionDefinition

Ƭ **FunctionDefinition**: { `description?`: *string* ; `mode`: *buffer* \| *object* \| *reference* ; `name?`: *string* ; `scalability?`: { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  }  }

Definition that informs the platform of the details of a single function.

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`description?` | *string* | Addtional description of the function   |
`mode` | *buffer* \| *object* \| *reference* | Stream mode:  * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets * object - carries any type of object, that is serializable via JSON or analogue * reference - carries non-serializable object references that should not be passed outside of a single process    |
`name?` | *string* | Optional name for the function (which will be shown in UI/CLI)   |
`scalability?` | { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  } | Describes how head (readable side) and tail (writable side) of this Function can be scaled to other machines.   |

Defined in: [packages/types/src/runner.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L16)

___

### FunctionStatus

Ƭ **FunctionStatus**: { `buffer`: *number* ; `pressure`: *number* ; `processing`: *number* ; `throughput`: *number*  }

Provides basic function status information

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`buffer` | *number* | The amount of stream entries that this function will accept in queue for processing before `pause` is called (i.e. highWaterMark - processing)   |
`pressure` | *number* | Calculated backpressure: processing * throughput / buffer   |
`processing` | *number* | The number of stream entries currently being processed.   |
`throughput` | *number* | Average number of stream entries passing that specific function over the duration of 1 second during the last 10 seconds.   |

Defined in: [packages/types/src/runner.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L52)

___

### GetResolver

Ƭ **GetResolver**: (`req`: IncomingMessage) => *MaybePromise*<*any*\>

Defined in: [packages/types/src/api-expose.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L10)

___

### HostErrorCode

Ƭ **HostErrorCode**: *UNINITIALIZED_STREAM* \| *UNATTACHED_STREAMS* \| *UNKNOWN_CHANNEL* \| *LOG_NOT_AVAILABLE*

Defined in: [packages/types/src/error-codes/host-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/host-error.ts#L1)

___

### InertApp

Ƭ **InertApp**<Z, S, AppConfigType, VoidType\>: [*TransformApp*](README.md#transformapp)<VoidType, VoidType, Z, S, AppConfigType, *void*\>

An Inert App is an app that doesn't accept data from the platform and doesn't output it.

**`interface`**

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |
`VoidType` | - | *void* |

Defined in: [packages/types/src/application.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L72)

___

### InertSequence

Ƭ **InertSequence**<Z, Y, X\>: [*TFunctionChain*](README.md#tfunctionchain)<Y, Z, X\>

Minimal type of Sequence that doesn't read anything from the outside, doesn't
write anything to outside. It may be doing anything, but it's not able to report
the progress via streaming.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | - | *any* |
`Y` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [packages/types/src/sequence.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/sequence.ts#L9)

___

### KillHandler

Ƭ **KillHandler**: () => *void*

Defined in: [packages/types/src/app-context.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/app-context.ts#L19)

___

### LifeCycleConfig

Ƭ **LifeCycleConfig**: { `makeSnapshotOnError`: *boolean*  }

#### Type declaration:

Name | Type |
------ | ------ |
`makeSnapshotOnError` | *boolean* |

Defined in: [packages/types/src/lifecycle-adapters.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L18)

___

### LifeCycleError

Ƭ **LifeCycleError**: *any* \| Error & { `errorMessage?`: *string* ; `exitCode?`: *number*  }

Defined in: [packages/types/src/lifecycle-adapters.ts:82](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L82)

___

### Logger

Ƭ **Logger**: Console

Defined in: [packages/types/src/logger.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/logger.ts#L15)

___

### LoggerOptions

Ƭ **LoggerOptions**: { `useCallsite?`: *boolean*  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`useCallsite?` | *boolean* | Should we show callsites to show originating line   |

Defined in: [packages/types/src/logger.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/logger.ts#L10)

___

### LoggerOutput

Ƭ **LoggerOutput**: { `err?`: [*WritableStream*](interfaces/writablestream.md)<*any*\> ; `out`: [*WritableStream*](interfaces/writablestream.md)<*any*\>  }

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`err?` | [*WritableStream*](interfaces/writablestream.md)<*any*\> | Errror stream   |
`out` | [*WritableStream*](interfaces/writablestream.md)<*any*\> | Output stream   |

Defined in: [packages/types/src/logger.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/logger.ts#L3)

___

### MessageCode

Ƭ **MessageCode**: [*ANY*](modules/messagecodes.md#any)

Defined in: [packages/types/src/runner.ts:101](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L101)

___

### MessageDataType

Ƭ **MessageDataType**<T\>: T *extends* RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessageData : T *extends* RunnerMessageCode.ALIVE ? KeepAliveMessageData : T *extends* RunnerMessageCode.DESCRIBE\_SEQUENCE ? DescribeSequenceMessageData : T *extends* RunnerMessageCode.STATUS ? StatusMessageData : T *extends* RunnerMessageCode.ERROR ? ErrorMessageData : T *extends* RunnerMessageCode.FORCE\_CONFIRM\_ALIVE ? EmptyMessageData : T *extends* RunnerMessageCode.KILL \| RunnerMessageCode.FORCE\_CONFIRM\_ALIVE ? EmptyMessageData : T *extends* RunnerMessageCode.MONITORING ? MonitoringMessageData : T *extends* RunnerMessageCode.MONITORING\_RATE ? MonitoringRateMessageData : T *extends* RunnerMessageCode.STOP ? StopSequenceMessageData : T *extends* RunnerMessageCode.PING ? EmptyMessageData : T *extends* RunnerMessageCode.PONG ? HandshakeAcknowledgeMessageData : T *extends* RunnerMessageCode.SNAPSHOT\_RESPONSE ? SnapshotResponseMessageData : T *extends* SupervisorMessageCode.CONFIG ? InstanceConfigMessageData : *never*

#### Type parameters:

Name |
------ |
`T` |

Defined in: [packages/types/src/message-streams.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L51)

___

### MessageType

Ƭ **MessageType**<T\>: T *extends* RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage : T *extends* RunnerMessageCode.ALIVE ? KeepAliveMessage : T *extends* RunnerMessageCode.DESCRIBE\_SEQUENCE ? DescribeSequenceMessage : T *extends* RunnerMessageCode.STATUS ? StatusMessage : T *extends* RunnerMessageCode.ERROR ? ErrorMessage : T *extends* RunnerMessageCode.FORCE\_CONFIRM\_ALIVE ? ConfirmHealthMessage : T *extends* RunnerMessageCode.KILL ? KillSequenceMessage : T *extends* RunnerMessageCode.MONITORING ? MonitoringMessage : T *extends* RunnerMessageCode.MONITORING\_RATE ? MonitoringRateMessage : T *extends* RunnerMessageCode.STOP ? StopSequenceMessage : T *extends* RunnerMessageCode.PING ? HandshakeMessage : T *extends* RunnerMessageCode.PONG ? HandshakeAcknowledgeMessage : T *extends* RunnerMessageCode.SNAPSHOT\_RESPONSE ? SnapshotResponseMessage : T *extends* SupervisorMessageCode.CONFIG ? InstanceConfigMessage : *never*

#### Type parameters:

Name |
------ |
`T` |

Defined in: [packages/types/src/message-streams.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L33)

___

### Middleware

Ƭ **Middleware**: (`req`: IncomingMessage, `res`: ServerResponse, `next`: [*NextCallback*](README.md#nextcallback)) => *void*

Defined in: [packages/types/src/api-expose.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L14)

___

### MonitoringHandler

Ƭ **MonitoringHandler**: (`resp`: MonitoringMessageFromRunnerData) => *MaybePromise*<MonitoringMessageFromRunnerData\>

A handler for the monitoring message.

**`param`** passed if the system was able to determine monitoring message by itself.

**`returns`** the monitoring information

Defined in: [packages/types/src/app-context.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/app-context.ts#L27)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `healthy?`: *boolean* ; `sequences?`: [*FunctionStatus*](README.md#functionstatus)[]  }

The response an Sequence sends as monitoring responses

#### Type declaration:

Name | Type |
------ | ------ |
`healthy?` | *boolean* |
`sequences?` | [*FunctionStatus*](README.md#functionstatus)[] |

Defined in: [packages/types/src/runner.ts:76](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L76)

___

### MonitoringMessageCode

Ƭ **MonitoringMessageCode**: RunnerMessageCode.ACKNOWLEDGE \| RunnerMessageCode.DESCRIBE\_SEQUENCE \| RunnerMessageCode.STATUS \| RunnerMessageCode.ALIVE \| RunnerMessageCode.ERROR \| RunnerMessageCode.MONITORING \| RunnerMessageCode.EVENT \| RunnerMessageCode.PING \| RunnerMessageCode.SNAPSHOT\_RESPONSE \| RunnerMessageCode.SEQUENCE\_STOPPED \| RunnerMessageCode.SEQUENCE\_COMPLETED

Defined in: [packages/types/src/message-streams.ts:78](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L78)

___

### NextCallback

Ƭ **NextCallback**: (`err?`: Error) => *void*

Defined in: [packages/types/src/api-expose.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L13)

___

### OpResolver

Ƭ **OpResolver**: (`req`: IncomingMessage, `res?`: ServerResponse) => *MaybePromise*<*any*\>

Defined in: [packages/types/src/api-expose.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L11)

___

### PassThoughStream

Ƭ **PassThoughStream**<Passes\>: [*DuplexStream*](README.md#duplexstream)<Passes, Passes\>

#### Type parameters:

Name |
------ |
`Passes` |

Defined in: [packages/types/src/utils.ts:66](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/utils.ts#L66)

___

### PassThroughStreamsConfig

Ƭ **PassThroughStreamsConfig**<serialized\>: [stdin: PassThoughStream<string\>, stdout: PassThoughStream<string\>, stderr: PassThoughStream<string\>, control: PassThoughStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: PassThoughStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: PassThoughStream<any\>, output: PassThoughStream<any\>, log: PassThoughStream<any\>, pkg: PassThoughStream<Buffer\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`serialized` | *boolean* | *true* |

Defined in: [packages/types/src/message-streams.ts:113](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L113)

___

### RFunction

Ƭ **RFunction**<Produces\>: [*Streamable*](README.md#streamable)<Produces\> \| [*ReadFunction*](README.md#readfunction)<Produces\>

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [packages/types/src/functions.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L22)

___

### ReadFunction

Ƭ **ReadFunction**<Produces\>: (`stream`: [*ReadableStream*](interfaces/readablestream.md)<*never*\>, ...`parameters`: *any*[]) => [*Streamable*](README.md#streamable)<Produces\>

A Function that returns a streamable result is a read function

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [packages/types/src/functions.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L13)

___

### ReadSequence

Ƭ **ReadSequence**<Produces, Y, Z\>: [[*RFunction*](README.md#rfunction)<Produces\>] \| [[*RFunction*](README.md#rfunction)<Z\>, ...TFunctionChain<Z, Produces, Y\>]

A sequence of functions reads input from a source and outputs it after
a chain of transforms.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [packages/types/src/sequence.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/sequence.ts#L23)

___

### ReadableApp

Ƭ **ReadableApp**<Produces, Z, S, AppConfigType, VoidType\>: [*TransformApp*](README.md#transformapp)<VoidType, Produces, Z, S, AppConfigType\>

A Readable App is an app that obtains the data by it's own means and preforms
0 to any number of transforms on that data before returning it.

**`interface`**

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |
`VoidType` | - | *void* |

Defined in: [packages/types/src/application.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L45)

___

### RunnerConfig

Ƭ **RunnerConfig**: { `config?`: *any* ; `engines`: { [key: string]: *string*;  } ; `image`: *string* ; `packageVolumeId?`: *string* ; `sequencePath`: *string* ; `version`: *string*  }

#### Type declaration:

Name | Type |
------ | ------ |
`config?` | *any* |
`engines` | { [key: string]: *string*;  } |
`image` | *string* |
`packageVolumeId?` | *string* |
`sequencePath` | *string* |
`version` | *string* |

Defined in: [packages/types/src/lifecycle-adapters.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L7)

___

### RunnerErrorCode

Ƭ **RunnerErrorCode**: *SEQUENCE_ENDED_PREMATURE* \| *SEQUENCE_RUNTIME_ERROR* \| *UNINITIALIZED_STREAMS* \| *UNKNOWN_MESSAGE_CODE* \| *NO_MONITORING* \| *UNINITIALIZED_CONTEXT*

Defined in: [packages/types/src/error-codes/runner-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/runner-error.ts#L1)

___

### RunnerMessage

Ƭ **RunnerMessage**: [RunnerMessageCode, *object*]

Defined in: [packages/types/src/runner.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L107)

___

### RunnerOptions

Ƭ **RunnerOptions**: { `monitoringInterval?`: *number*  }

#### Type declaration:

Name | Type |
------ | ------ |
`monitoringInterval?` | *number* |

Defined in: [packages/types/src/runner.ts:103](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L103)

___

### StopHandler

Ƭ **StopHandler**: (`timeout`: *number*, `canCallKeepalive`: *boolean*) => *MaybePromise*<*void*\>

A callback that will be called when the sequence is being stopped gracefully.

**`param`** the number of seconds before the operation will be killed

**`param`** informs if @{link AutoAppContext.keepAlive | keepalive} can be called
to prolong the operation

**`returns`** the returned value can be a promise, once it's resolved the system will
         assume that it's safe to terminate the process.

Defined in: [packages/types/src/app-context.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/app-context.ts#L17)

___

### StreamConfig

Ƭ **StreamConfig**: { `encoding?`: BufferEncoding ; `end?`: *boolean* ; `json?`: *boolean* ; `text?`: *boolean*  }

Configuration options for streaming endpoionts

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`encoding?` | BufferEncoding | Encoding used in the stream   |
`end?` | *boolean* | Should request end also end the stream or can the endpoint accept subsequent connections   |
`json?` | *boolean* | Is the stream a JSON stream?   |
`text?` | *boolean* | Is the stream a text stream?   |

Defined in: [packages/types/src/api-expose.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L19)

___

### StreamInput

Ƭ **StreamInput**: (`req`: IncomingMessage) => *MaybePromise*<Readable\> \| *MaybePromise*<Readable\>

Defined in: [packages/types/src/api-expose.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L8)

___

### StreamOutput

Ƭ **StreamOutput**: (`req`: IncomingMessage, `res`: ServerResponse) => *MaybePromise*<*void*\> \| *MaybePromise*<Writable\>

Defined in: [packages/types/src/api-expose.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L9)

___

### Streamable

Ƭ **Streamable**<Produces\>: *MaybePromise*<[*SynchronousStreamable*](README.md#synchronousstreamable)<Produces\>\>

Represents all readable stream types that will be accepted as return values
from {@see TFunction}

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [packages/types/src/utils.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/utils.ts#L83)

___

### SupervisorErrorCode

Ƭ **SupervisorErrorCode**: *INVALID_CONFIGURATION* \| *UNINITIALIZED_STREAMS* \| *GENERAL_ERROR* \| *SEQUENCE_RUN_BEFORE_INIT* \| *RUNNER_ERROR* \| *RUNNER_NON_ZERO_EXITCODE* \| *RUNNER_NOT_STARTED* \| *DOCKER_ERROR* \| *PRERUNNER_ERROR*

Defined in: [packages/types/src/error-codes/supervisor-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/error-codes/supervisor-error.ts#L1)

___

### SupervisorMessage

Ƭ **SupervisorMessage**: [SupervisorMessageCode, *object*]

Defined in: [packages/types/src/runner.ts:112](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/runner.ts#L112)

___

### SynchronousStreamable

Ƭ **SynchronousStreamable**<Produces\>: *PipeableStream*<Produces\> \| *AsyncGen*<Produces, Produces\> \| *Gen*<Produces, *void*\> \| *Iterable*<Produces\> \| *AsyncIterable*<Produces\>

Delayed stream - stream with lazy initialization
in first phase PassThrough stream is created by calling getStream() method
is second phase the stream is piped from external stream by running run() method.

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [packages/types/src/utils.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/utils.ts#L74)

___

### TFunction

Ƭ **TFunction**<Consumes, Produces\>: *AsyncGen*<Produces, Consumes\> \| *Gen*<Produces, Consumes\> \| [*TranformFunction*](README.md#tranformfunction)<Consumes, Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [packages/types/src/functions.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L23)

___

### TFunctionChain

Ƭ **TFunctionChain**<Consumes, Produces, Z\>: [[*TFunction*](README.md#tfunction)<Consumes, Produces\>] \| [...MulMulTFunction<Consumes, Produces, Z\>]

#### Type parameters:

Name | Type |
------ | ------ |
`Consumes` | - |
`Produces` | - |
`Z` | *any*[] |

Defined in: [packages/types/src/functions.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L43)

___

### TranformFunction

Ƭ **TranformFunction**<Consumes, Produces\>: (`stream`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`parameters`: *any*[]) => *StreambleMaybeFunction*<Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [packages/types/src/functions.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L17)

___

### TransformApp

Ƭ **TransformApp**<Consumes, Produces, Z, S, AppConfigType, ReturnType\>: (`this`: [*AppContext*](interfaces/appcontext.md)<AppConfigType, S\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`args`: Z) => *MaybePromise*<ReturnType\>

A Transformation App that accepts data from the platform, performs operations on the data,
and returns the data to the platforms for further use.

Has both active readable and writable sides.

**`interface`**

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |
`ReturnType` | - | [*Streamable*](README.md#streamable)<Produces\> |

Defined in: [packages/types/src/application.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L26)

___

### TransformAppAcceptableSequence

Ƭ **TransformAppAcceptableSequence**<Consumes, Produces\>: [*TFunction*](README.md#tfunction)<Consumes, Produces\> \| [*InertSequence*](README.md#inertsequence) \| [*TransformSeqence*](README.md#transformseqence)<Consumes, Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [packages/types/src/sequence.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/sequence.ts#L35)

___

### TransformSeqence

Ƭ **TransformSeqence**<Consumes, Produces, Z, X\>: [[*TFunction*](README.md#tfunction)<Consumes, Produces\>] \| [...TFunctionChain<Consumes, Z, X\>, [*TFunction*](README.md#tfunction)<Z, Produces\>]

A Transform Sequence is a sequence that accept input, perform operations on it, and
outputs the result.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Produces` | - | - |
`Z` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [packages/types/src/sequence.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/sequence.ts#L31)

___

### UpstreamStreamsConfig

Ƭ **UpstreamStreamsConfig**<serialized\>: [stdin: ReadableStream<string\>, stdout: WritableStream<string\>, stderr: WritableStream<string\>, control: ReadableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: WritableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: ReadableStream<any\>, output: WritableStream<any\>, log: WritableStream<any\>, pkg?: ReadableStream<Buffer\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`serialized` | *boolean* | *true* |

Defined in: [packages/types/src/message-streams.ts:101](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/message-streams.ts#L101)

___

### WFunction

Ƭ **WFunction**<Consumes\>: [*TFunction*](README.md#tfunction)<Consumes, *never*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [packages/types/src/functions.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L27)

___

### WritableApp

Ƭ **WritableApp**<Consumes, Z, S, AppConfigType, VoidType\>: [*TransformApp*](README.md#transformapp)<Consumes, VoidType, Z, S, AppConfigType, *void*\>

A Writable App is an app that accepts the data from the platform, performs any number
of transforms and then saves it to the data destination by it's own means.

**`interface`**

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](README.md#appconfig) | [*AppConfig*](README.md#appconfig) |
`VoidType` | - | *void* |

Defined in: [packages/types/src/application.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/application.ts#L59)

___

### WriteFunction

Ƭ **WriteFunction**<Consumes\>: (`stream`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`parameters`: *any*[]) => *MaybePromise*<*void*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [packages/types/src/functions.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/functions.ts#L15)

___

### WriteSequence

Ƭ **WriteSequence**<Consumes, Y, Z\>: [[*WFunction*](README.md#wfunction)<Consumes\>] \| [...TFunctionChain<Consumes, Z, Y\>, [*WFunction*](README.md#wfunction)<Z\>]

A Sequence of functions that accept some input, transforms it through
a number of functions and writes to some destination.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [packages/types/src/sequence.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/sequence.ts#L15)

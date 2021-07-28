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
- [ISequence](interfaces/isequence.md)
- [ISequenceStore](interfaces/isequencestore.md)
- [ReadableStream](interfaces/readablestream.md)
- [WritableStream](interfaces/writablestream.md)

### Type aliases

- [AcknowledgeMessage](README.md#acknowledgemessage)
- [AcknowledgeMessageData](README.md#acknowledgemessagedata)
- [AppConfig](README.md#appconfig)
- [AppError](README.md#apperror)
- [AppErrorCode](README.md#apperrorcode)
- [AppErrorConstructor](README.md#apperrorconstructor)
- [Application](README.md#application)
- [ApplicationExpose](README.md#applicationexpose)
- [ApplicationFunction](README.md#applicationfunction)
- [ApplicationInterface](README.md#applicationinterface)
- [CPMMessage](README.md#cpmmessage)
- [CPMMessageSTHID](README.md#cpmmessagesthid)
- [CSIControllerErrorCode](README.md#csicontrollererrorcode)
- [ConfirmHealthMessage](README.md#confirmhealthmessage)
- [ContainerConfiguration](README.md#containerconfiguration)
- [ControlMessageCode](README.md#controlmessagecode)
- [ControlMessageHandler](README.md#controlmessagehandler)
- [DeepPartial](README.md#deeppartial)
- [DescribeSequenceMessage](README.md#describesequencemessage)
- [DescribeSequenceMessageData](README.md#describesequencemessagedata)
- [DiskSpace](README.md#diskspace)
- [DockerRunnerConfig](README.md#dockerrunnerconfig)
- [DownstreamStreamsConfig](README.md#downstreamstreamsconfig)
- [DuplexStream](README.md#duplexstream)
- [EmptyMessageData](README.md#emptymessagedata)
- [EncodedControlMessage](README.md#encodedcontrolmessage)
- [EncodedMessage](README.md#encodedmessage)
- [EncodedMonitoringMessage](README.md#encodedmonitoringmessage)
- [EncodedSerializedControlMessage](README.md#encodedserializedcontrolmessage)
- [EncodedSerializedMonitoringMessage](README.md#encodedserializedmonitoringmessage)
- [ErrorMessage](README.md#errormessage)
- [ErrorMessageData](README.md#errormessagedata)
- [EventMessage](README.md#eventmessage)
- [EventMessageData](README.md#eventmessagedata)
- [ExitCode](README.md#exitcode)
- [FunctionDefinition](README.md#functiondefinition)
- [FunctionStatus](README.md#functionstatus)
- [GetResolver](README.md#getresolver)
- [HandshakeAcknowledgeMessage](README.md#handshakeacknowledgemessage)
- [HandshakeAcknowledgeMessageData](README.md#handshakeacknowledgemessagedata)
- [HandshakeMessage](README.md#handshakemessage)
- [HostConfig](README.md#hostconfig)
- [HostErrorCode](README.md#hosterrorcode)
- [HttpMethod](README.md#httpmethod)
- [InertApp](README.md#inertapp)
- [InertSequence](README.md#inertsequence)
- [InstanceConfigMessage](README.md#instanceconfigmessage)
- [InstanceConfigMessageData](README.md#instanceconfigmessagedata)
- [KeepAliveMessage](README.md#keepalivemessage)
- [KeepAliveMessageData](README.md#keepalivemessagedata)
- [KillHandler](README.md#killhandler)
- [KillSequenceMessage](README.md#killsequencemessage)
- [LifeCycleConfig](README.md#lifecycleconfig)
- [LifeCycleError](README.md#lifecycleerror)
- [LoadCheckStat](README.md#loadcheckstat)
- [LoadCheckStatMessage](README.md#loadcheckstatmessage)
- [Logger](README.md#logger)
- [LoggerOptions](README.md#loggeroptions)
- [LoggerOutput](README.md#loggeroutput)
- [Message](README.md#message)
- [MessageCode](README.md#messagecode)
- [MessageDataType](README.md#messagedatatype)
- [MessageType](README.md#messagetype)
- [Middleware](README.md#middleware)
- [MonitoringHandler](README.md#monitoringhandler)
- [MonitoringMessage](README.md#monitoringmessage)
- [MonitoringMessageCode](README.md#monitoringmessagecode)
- [MonitoringMessageData](README.md#monitoringmessagedata)
- [MonitoringMessageFromRunnerData](README.md#monitoringmessagefromrunnerdata)
- [MonitoringMessageHandler](README.md#monitoringmessagehandler)
- [MonitoringRateMessage](README.md#monitoringratemessage)
- [MonitoringRateMessageData](README.md#monitoringratemessagedata)
- [MutatingMonitoringMessageHandler](README.md#mutatingmonitoringmessagehandler)
- [NetworkInfo](README.md#networkinfo)
- [NetworkInfoMessage](README.md#networkinfomessage)
- [NextCallback](README.md#nextcallback)
- [OpResolver](README.md#opresolver)
- [ParsedMessage](README.md#parsedmessage)
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
- [STHConfiguration](README.md#sthconfiguration)
- [STHIDMessageData](README.md#sthidmessagedata)
- [SequenceCompleteMessage](README.md#sequencecompletemessage)
- [SequenceEndMessage](README.md#sequenceendmessage)
- [SequenceEndMessageData](README.md#sequenceendmessagedata)
- [SnapshotResponseMessage](README.md#snapshotresponsemessage)
- [SnapshotResponseMessageData](README.md#snapshotresponsemessagedata)
- [StatusMessage](README.md#statusmessage)
- [StatusMessageData](README.md#statusmessagedata)
- [StopHandler](README.md#stophandler)
- [StopSequenceMessage](README.md#stopsequencemessage)
- [StopSequenceMessageData](README.md#stopsequencemessagedata)
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

### AcknowledgeMessage

Ƭ **AcknowledgeMessage**: { `msgCode`: `RunnerMessageCode.ACKNOWLEDGE`  } & [`AcknowledgeMessageData`](README.md#acknowledgemessagedata)

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/acknowledge.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/acknowledge.ts#L22)

___

### AcknowledgeMessageData

Ƭ **AcknowledgeMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `acknowledged` | `boolean` | Indicates whether a message was received. |
| `errorMsg?` | [`ErrorMessage`](README.md#errormessage) | Describes an error message if error was thrown after performing a requested operation. |
| `status?` | `number` | Indicates status of the performed operation. |

#### Defined in

[packages/types/src/messages/acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/acknowledge.ts#L4)

___

### AppConfig

Ƭ **AppConfig**: `Object`

App configuration primitive.

#### Index signature

▪ [key: `string`]: ``null`` \| `string` \| `number` \| `boolean` \| [`AppConfig`](README.md#appconfig)

#### Defined in

[packages/types/src/app-config.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/app-config.ts#L6)

___

### AppError

Ƭ **AppError**: `Error` & { `code`: [`AppErrorCode`](README.md#apperrorcode) ; `exitcode?`: `number`  }

Application error class

#### Defined in

[packages/types/src/error-codes/app-error.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/app-error.ts#L23)

___

### AppErrorCode

Ƭ **AppErrorCode**: ``"GENERAL_ERROR"`` \| ``"COMPILE_ERROR"`` \| ``"CONTEXT_NOT_INITIALIZED"`` \| ``"SEQUENCE_RUN_BEFORE_INIT"`` \| ``"SEQUENCE_MISCONFIGURED"`` \| [`CSIControllerErrorCode`](README.md#csicontrollererrorcode) \| [`HostErrorCode`](README.md#hosterrorcode) \| [`SupervisorErrorCode`](README.md#supervisorerrorcode) \| [`RunnerErrorCode`](README.md#runnererrorcode)

Acceptable error codes

#### Defined in

[packages/types/src/error-codes/app-error.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/app-error.ts#L9)

___

### AppErrorConstructor

Ƭ **AppErrorConstructor**: (`code`: [`AppErrorCode`](README.md#apperrorcode), `message?`: `string`) => [`AppError`](README.md#apperror)

#### Type declaration

• (`code`, `message?`)

Constructs an AppError

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `code` | [`AppErrorCode`](README.md#apperrorcode) | One of the predefined error codes |
| `message?` | `string` | Optional additional explanatory message |

#### Defined in

[packages/types/src/error-codes/app-error.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/app-error.ts#L34)

___

### Application

Ƭ **Application**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\>: [`TransformApp`](README.md#transformapp)<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\> \| [`ReadableApp`](README.md#readableapp)<`Produces`, `Z`, `S`, `AppConfigType`\> \| [`WritableApp`](README.md#writableapp)<`Consumes`, `Z`, `S`, `AppConfigType`\> \| [`InertApp`](README.md#inertapp)<`Z`, `S`\>

Application is an acceptable input for the runner.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |

#### Defined in

[packages/types/src/application.ts:91](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L91)

___

### ApplicationExpose

Ƭ **ApplicationExpose**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `[exposeSequenceSymbol]` | [`Application`](README.md#application)<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\> |

#### Defined in

[packages/types/src/application.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L74)

___

### ApplicationFunction

Ƭ **ApplicationFunction**: [`ReadableApp`](README.md#readableapp) \| [`WritableApp`](README.md#writableapp) \| [`TransformApp`](README.md#transformapp) \| [`InertApp`](README.md#inertapp)

#### Defined in

[packages/types/src/application.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L72)

___

### ApplicationInterface

Ƭ **ApplicationInterface**: (`this`: [`AppContext`](interfaces/appcontext.md)<[`AppConfig`](README.md#appconfig), `any`\>, `source`: [`ReadableStream`](interfaces/readablestream.md)<`any`\>, ...`argv`: `any`[]) => `MaybePromise`<[`Streamable`](README.md#streamable)<`any`\> \| `void`\>

#### Type declaration

▸ (`this`, `source`, ...`argv`): `MaybePromise`<[`Streamable`](README.md#streamable)<`any`\> \| `void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`AppContext`](interfaces/appcontext.md)<[`AppConfig`](README.md#appconfig), `any`\> |
| `source` | [`ReadableStream`](interfaces/readablestream.md)<`any`\> |
| `...argv` | `any`[] |

##### Returns

`MaybePromise`<[`Streamable`](README.md#streamable)<`any`\> \| `void`\>

#### Defined in

[packages/types/src/application.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L7)

___

### CPMMessage

Ƭ **CPMMessage**: [`CPMMessageCode`, `object`]

#### Defined in

[packages/types/src/runner.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L59)

___

### CPMMessageSTHID

Ƭ **CPMMessageSTHID**: { `msgCode`: `CPMMessageCode.STH_ID`  } & [`STHIDMessageData`](README.md#sthidmessagedata)

#### Defined in

[packages/types/src/messages/sth-id.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/sth-id.ts#L7)

___

### CSIControllerErrorCode

Ƭ **CSIControllerErrorCode**: ``"UNINITIALIZED_STREAM"`` \| ``"UNATTACHED_STREAMS"`` \| ``"NO_CHILD_PROCESS"``

#### Defined in

[packages/types/src/error-codes/csi-controller-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/csi-controller-error.ts#L1)

___

### ConfirmHealthMessage

Ƭ **ConfirmHealthMessage**: `Object`

Message forcing Runner to emit a keep alive message.
It is used when Supervisor does not receive a keep alive message from Runner withih a specified time frame.
It forces Runner to emit a keep alive message to confirm it is still active.
This message type is sent from Supervisor.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | `RunnerMessageCode.FORCE_CONFIRM_ALIVE` |

#### Defined in

[packages/types/src/messages/confirm-health.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/confirm-health.ts#L9)

___

### ContainerConfiguration

Ƭ **ContainerConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `image` | `string` | Docker image to use. |
| `maxMem` | `number` | Maximum memory container can allocate. |

#### Defined in

[packages/types/src/sth-configuration.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sth-configuration.ts#L1)

___

### ControlMessageCode

Ƭ **ControlMessageCode**: `RunnerMessageCode.FORCE_CONFIRM_ALIVE` \| `RunnerMessageCode.KILL` \| `RunnerMessageCode.MONITORING_RATE` \| `RunnerMessageCode.STOP` \| `RunnerMessageCode.EVENT` \| `RunnerMessageCode.PONG` \| `SupervisorMessageCode.CONFIG` \| `CPMMessageCode.STH_ID`

#### Defined in

[packages/types/src/message-streams.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L89)

___

### ControlMessageHandler

Ƭ **ControlMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](README.md#encodedmessage)<`T`\>) => `MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](README.md#controlmessagecode) |

#### Type declaration

▸ (`msg`): `MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](README.md#encodedmessage)<`T`\> |

##### Returns

`MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

#### Defined in

[packages/types/src/communication-handler.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L14)

___

### DeepPartial

Ƭ **DeepPartial**<`T`\>: { [K in keyof T]?: DeepPartial<T[K]\>}

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/utils.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/utils.ts#L99)

___

### DescribeSequenceMessage

Ƭ **DescribeSequenceMessage**: { `msgCode`: `RunnerMessageCode.DESCRIBE_SEQUENCE`  } & [`DescribeSequenceMessageData`](README.md#describesequencemessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/describe-sequence.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L60)

___

### DescribeSequenceMessageData

Ƭ **DescribeSequenceMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `definition?` | [`FunctionDefinition`](README.md#functiondefinition)[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L49)

___

### DiskSpace

Ƭ **DiskSpace**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `available` | `number` |
| `fs` | `string` |
| `size` | `number` |
| `use` | `number` |
| `used` | `number` |

#### Defined in

[packages/types/src/load-check-stat.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/load-check-stat.ts#L1)

___

### DockerRunnerConfig

Ƭ **DockerRunnerConfig**: [`RunnerConfig`](README.md#runnerconfig) & { `config`: { `volumesFrom`: `string`  }  }

#### Defined in

[packages/types/src/lifecycle-adapters.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L11)

___

### DownstreamStreamsConfig

Ƭ **DownstreamStreamsConfig**<`serialized`\>: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>, control: WritableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: ReadableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: WritableStream<any\>, output: ReadableStream<any\>, log: ReadableStream<any\>, pkg?: WritableStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean```true`` |

#### Defined in

[packages/types/src/message-streams.ts:109](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L109)

___

### DuplexStream

Ƭ **DuplexStream**<`Consumes`, `Produces`\>: [`WritableStream`](interfaces/writablestream.md)<`Consumes`\> & [`ReadableStream`](interfaces/readablestream.md)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/utils.ts#L65)

___

### EmptyMessageData

Ƭ **EmptyMessageData**: `Object`

#### Defined in

[packages/types/src/messages/message.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/message.ts#L16)

___

### EncodedControlMessage

Ƭ **EncodedControlMessage**: [`EncodedMessage`](README.md#encodedmessage)<[`ControlMessageCode`](README.md#controlmessagecode)\>

#### Defined in

[packages/types/src/message-streams.ts:96](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L96)

___

### EncodedMessage

Ƭ **EncodedMessage**<`T`\>: [`T`, [`MessageDataType`](README.md#messagedatatype)<`T`\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `SupervisorMessageCode` \| `CPMMessageCode` |

#### Defined in

[packages/types/src/message-streams.ts:85](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L85)

___

### EncodedMonitoringMessage

Ƭ **EncodedMonitoringMessage**: [`EncodedMessage`](README.md#encodedmessage)<[`MonitoringMessageCode`](README.md#monitoringmessagecode)\>

#### Defined in

[packages/types/src/message-streams.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L107)

___

### EncodedSerializedControlMessage

Ƭ **EncodedSerializedControlMessage**: `string`

#### Defined in

[packages/types/src/message-streams.ts:104](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L104)

___

### EncodedSerializedMonitoringMessage

Ƭ **EncodedSerializedMonitoringMessage**: `string`

#### Defined in

[packages/types/src/message-streams.ts:105](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L105)

___

### ErrorMessage

Ƭ **ErrorMessage**: { `msgCode`: `RunnerMessageCode.ERROR`  } & [`ErrorMessageData`](README.md#errormessagedata)

A general purpose error message.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/error.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/error.ts#L22)

___

### ErrorMessageData

Ƭ **ErrorMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `errorCode` | `number` | Error's status code |
| `exitCode` | `number` | The operation's exit code. |
| `message` | `string` | Error message. |
| `stack` | `string` | Error stack trace. |

#### Defined in

[packages/types/src/messages/error.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/error.ts#L3)

___

### EventMessage

Ƭ **EventMessage**: { `msgCode`: `RunnerMessageCode.EVENT`  } & [`EventMessageData`](README.md#eventmessagedata)

TODO update
Event message emitted by sequence and handeled in the context.

#### Defined in

[packages/types/src/messages/event.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/event.ts#L16)

___

### EventMessageData

Ƭ **EventMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Name of the event. |
| `message` | `any` | TODO update Informs if keepAlive can be called to prolong the running of the Sequence. |

#### Defined in

[packages/types/src/messages/event.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/event.ts#L3)

___

### ExitCode

Ƭ **ExitCode**: `number`

#### Defined in

[packages/types/src/lifecycle-adapters.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L15)

___

### FunctionDefinition

Ƭ **FunctionDefinition**: `Object`

Definition that informs the platform of the details of a single function.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `description?` | `string` | Addtional description of the function |
| `mode` | ``"buffer"`` \| ``"object"`` \| ``"reference"`` | Stream mode:  * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets * object - carries any type of object, that is serializable via JSON or analogue * reference - carries non-serializable object references that should not be passed outside of a single process |
| `name?` | `string` | Optional name for the function (which will be shown in UI/CLI) |
| `scalability?` | `Object` | Describes how head (readable side) and tail (writable side) of this Function can be scaled to other machines. |
| `scalability.head?` | `ScalabilityOptions` | Writable side scalability |
| `scalability.tail?` | `ScalabilityOptions` | Readable side scalability |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L16)

___

### FunctionStatus

Ƭ **FunctionStatus**: `Object`

Provides basic function status information

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `buffer` | `number` | The amount of stream entries that this function will accept in queue for processing before `pause` is called (i.e. highWaterMark - processing) |
| `pressure` | `number` | Calculated backpressure: processing * throughput / buffer |
| `processing` | `number` | The number of stream entries currently being processed. |
| `throughput` | `number` | Average number of stream entries passing that specific function over the duration of 1 second during the last 10 seconds. |

#### Defined in

[packages/types/src/runner.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L6)

___

### GetResolver

Ƭ **GetResolver**: (`req`: [`ParsedMessage`](README.md#parsedmessage)) => `MaybePromise`<`any`\>

#### Type declaration

▸ (`req`): `MaybePromise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`ParsedMessage`](README.md#parsedmessage) |

##### Returns

`MaybePromise`<`any`\>

#### Defined in

[packages/types/src/api-expose.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L15)

___

### HandshakeAcknowledgeMessage

Ƭ **HandshakeAcknowledgeMessage**: { `msgCode`: `RunnerMessageCode.PONG`  } & [`HandshakeAcknowledgeMessageData`](README.md#handshakeacknowledgemessagedata)

Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
the received handshake message (PING).
The message includes the Sequence configuration information.

#### Defined in

[packages/types/src/messages/handshake-acknowledge.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/handshake-acknowledge.ts#L16)

___

### HandshakeAcknowledgeMessageData

Ƭ **HandshakeAcknowledgeMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `appConfig` | [`AppConfig`](README.md#appconfig) | Sequence configuration passed to the Sequence when it is started by the Runner. |
| `args?` | `any`[] | - |

#### Defined in

[packages/types/src/messages/handshake-acknowledge.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/handshake-acknowledge.ts#L4)

___

### HandshakeMessage

Ƭ **HandshakeMessage**: `Object`

Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
Runner is then waiting to receive the handshake acknowledge message back (PONG)
from the CSH to start the Sequence.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | `RunnerMessageCode.PING` |

#### Defined in

[packages/types/src/messages/handshake.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/handshake.ts#L8)

___

### HostConfig

Ƭ **HostConfig**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiBase` | `string` | API URL. |
| `hostname` | `string` | Hostname. |
| `port` | `number` | API port. |
| `socketPath` | `string` | Socket name for connecting supervisors. |

#### Defined in

[packages/types/src/sth-configuration.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sth-configuration.ts#L12)

___

### HostErrorCode

Ƭ **HostErrorCode**: ``"UNINITIALIZED_STREAM"`` \| ``"UNATTACHED_STREAMS"`` \| ``"UNKNOWN_CHANNEL"`` \| ``"LOG_NOT_AVAILABLE"`` \| ``"SEQUENCE_IDENTIFICATION_FAILED"`` \| ``"UNKNOWN_SEQUENCE"`` \| ``"UNKNOWN_INSTANCE"`` \| ``"EVENT_NAME_MISSING"`` \| ``"CONTROLLER_ERROR"`` \| ``"SOCKET_TAKEN"`` \| ``"API_CONFIGURATION_ERROR"``

#### Defined in

[packages/types/src/error-codes/host-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/host-error.ts#L1)

___

### HttpMethod

Ƭ **HttpMethod**: ``"get"`` \| ``"head"`` \| ``"post"`` \| ``"put"`` \| ``"delete"`` \| ``"connect"`` \| ``"trace"`` \| ``"patch"``

#### Defined in

[packages/types/src/api-expose.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L9)

___

### InertApp

Ƭ **InertApp**<`Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](README.md#transformapp)<`VoidType`, `VoidType`, `Z`, `S`, `AppConfigType`, `void`\>

An Inert App is an app that doesn't accept data from the platform and doesn't output it.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L65)

___

### InertSequence

Ƭ **InertSequence**<`Z`, `Y`, `X`\>: [`TFunctionChain`](README.md#tfunctionchain)<`Y`, `Z`, `X`\>

Minimal type of Sequence that doesn't read anything from the outside, doesn't
write anything to outside. It may be doing anything, but it's not able to report
the progress via streaming.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | `any` |
| `Y` | `any` |
| `X` | extends `any`[]`any`[] |

#### Defined in

[packages/types/src/sequence.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sequence.ts#L9)

___

### InstanceConfigMessage

Ƭ **InstanceConfigMessage**: { `msgCode`: `SupervisorMessageCode.CONFIG`  } & [`InstanceConfigMessageData`](README.md#instanceconfigmessagedata)

#### Defined in

[packages/types/src/messages/instance-config.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/instance-config.ts#L8)

___

### InstanceConfigMessageData

Ƭ **InstanceConfigMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | [`RunnerConfig`](README.md#runnerconfig) |

#### Defined in

[packages/types/src/messages/instance-config.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/instance-config.ts#L4)

___

### KeepAliveMessage

Ƭ **KeepAliveMessage**: { `msgCode`: `RunnerMessageCode.ALIVE`  } & [`KeepAliveMessageData`](README.md#keepalivemessagedata)

Message instrucing how much longer to keep Sequence alive.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/keep-alive.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/keep-alive.ts#L13)

___

### KeepAliveMessageData

Ƭ **KeepAliveMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `keepAlive` | `number` | Information on how much longer the Sequence will be active (in miliseconds). |

#### Defined in

[packages/types/src/messages/keep-alive.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/keep-alive.ts#L3)

___

### KillHandler

Ƭ **KillHandler**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/types/src/app-context.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/app-context.ts#L20)

___

### KillSequenceMessage

Ƭ **KillSequenceMessage**: `Object`

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from Supervisor.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | `RunnerMessageCode.KILL` |

#### Defined in

[packages/types/src/messages/kill-sequence.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/kill-sequence.ts#L8)

___

### LifeCycleConfig

Ƭ **LifeCycleConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `makeSnapshotOnError` | `boolean` |

#### Defined in

[packages/types/src/lifecycle-adapters.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L7)

___

### LifeCycleError

Ƭ **LifeCycleError**: `any` \| `Error` & { `errorMessage?`: `string` ; `exitCode?`: `number`  }

#### Defined in

[packages/types/src/lifecycle-adapters.ts:77](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L77)

___

### LoadCheckStat

Ƭ **LoadCheckStat**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `avgLoad` | `number` |
| `currentLoad` | `number` |
| `fsSize` | [`DiskSpace`](README.md#diskspace)[] |
| `memFree` | `number` |
| `memUsed` | `number` |

#### Defined in

[packages/types/src/load-check-stat.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/load-check-stat.ts#L9)

___

### LoadCheckStatMessage

Ƭ **LoadCheckStatMessage**: { `msgCode`: `CPMMessageCode.LOAD`  } & [`LoadCheckStat`](README.md#loadcheckstat)

#### Defined in

[packages/types/src/messages/load.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/load.ts#L4)

___

### Logger

Ƭ **Logger**: `Console`

#### Defined in

[packages/types/src/logger.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/logger.ts#L15)

___

### LoggerOptions

Ƭ **LoggerOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `useCallsite?` | `boolean` | Should we show callsites to show originating line |

#### Defined in

[packages/types/src/logger.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/logger.ts#L10)

___

### LoggerOutput

Ƭ **LoggerOutput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `err?` | [`WritableStream`](interfaces/writablestream.md)<`any`\> | Errror stream |
| `out` | [`WritableStream`](interfaces/writablestream.md)<`any`\> | Output stream |

#### Defined in

[packages/types/src/logger.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/logger.ts#L3)

___

### Message

Ƭ **Message**: `Object`

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `msgCode` | `RunnerMessageCode` | Message type code from RunnerMessageCode enumeration. |

#### Defined in

[packages/types/src/messages/message.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/message.ts#L10)

___

### MessageCode

Ƭ **MessageCode**: [`ANY`](modules/messagecodes.md#any)

#### Defined in

[packages/types/src/runner.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L43)

___

### MessageDataType

Ƭ **MessageDataType**<`T`\>: `T` extends `RunnerMessageCode.ACKNOWLEDGE` ? [`AcknowledgeMessageData`](README.md#acknowledgemessagedata) : `T` extends `RunnerMessageCode.ALIVE` ? [`KeepAliveMessageData`](README.md#keepalivemessagedata) : `T` extends `RunnerMessageCode.DESCRIBE_SEQUENCE` ? [`DescribeSequenceMessageData`](README.md#describesequencemessagedata) : `T` extends `RunnerMessageCode.STATUS` ? [`StatusMessageData`](README.md#statusmessagedata) : `T` extends `RunnerMessageCode.ERROR` ? [`ErrorMessageData`](README.md#errormessagedata) : `T` extends `RunnerMessageCode.FORCE_CONFIRM_ALIVE` ? [`EmptyMessageData`](README.md#emptymessagedata) : `T` extends `RunnerMessageCode.KILL` \| `RunnerMessageCode.FORCE_CONFIRM_ALIVE` ? [`EmptyMessageData`](README.md#emptymessagedata) : `T` extends `RunnerMessageCode.MONITORING` ? [`MonitoringMessageData`](README.md#monitoringmessagedata) : `T` extends `RunnerMessageCode.MONITORING_RATE` ? [`MonitoringRateMessageData`](README.md#monitoringratemessagedata) : `T` extends `RunnerMessageCode.STOP` ? [`StopSequenceMessageData`](README.md#stopsequencemessagedata) : `T` extends `RunnerMessageCode.PING` ? [`EmptyMessageData`](README.md#emptymessagedata) : `T` extends `RunnerMessageCode.PONG` ? [`HandshakeAcknowledgeMessageData`](README.md#handshakeacknowledgemessagedata) : `T` extends `RunnerMessageCode.SNAPSHOT_RESPONSE` ? [`SnapshotResponseMessageData`](README.md#snapshotresponsemessagedata) : `T` extends `SupervisorMessageCode.CONFIG` ? [`InstanceConfigMessageData`](README.md#instanceconfigmessagedata) : `T` extends `CPMMessageCode.STH_ID` ? [`STHIDMessageData`](README.md#sthidmessagedata) : `T` extends `CPMMessageCode.LOAD` ? [`LoadCheckStat`](README.md#loadcheckstat) : `T` extends `CPMMessageCode.NETWORK_INFO` ? [`NetworkInfo`](README.md#networkinfo)[] : `never`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:64](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L64)

___

### MessageType

Ƭ **MessageType**<`T`\>: `T` extends `RunnerMessageCode.ACKNOWLEDGE` ? [`AcknowledgeMessage`](README.md#acknowledgemessage) : `T` extends `RunnerMessageCode.ALIVE` ? [`KeepAliveMessage`](README.md#keepalivemessage) : `T` extends `RunnerMessageCode.DESCRIBE_SEQUENCE` ? [`DescribeSequenceMessage`](README.md#describesequencemessage) : `T` extends `RunnerMessageCode.STATUS` ? [`StatusMessage`](README.md#statusmessage) : `T` extends `RunnerMessageCode.ERROR` ? [`ErrorMessage`](README.md#errormessage) : `T` extends `RunnerMessageCode.FORCE_CONFIRM_ALIVE` ? [`ConfirmHealthMessage`](README.md#confirmhealthmessage) : `T` extends `RunnerMessageCode.KILL` ? [`KillSequenceMessage`](README.md#killsequencemessage) : `T` extends `RunnerMessageCode.MONITORING` ? [`MonitoringMessage`](README.md#monitoringmessage) : `T` extends `RunnerMessageCode.MONITORING_RATE` ? [`MonitoringRateMessage`](README.md#monitoringratemessage) : `T` extends `RunnerMessageCode.STOP` ? [`StopSequenceMessage`](README.md#stopsequencemessage) : `T` extends `RunnerMessageCode.PING` ? [`HandshakeMessage`](README.md#handshakemessage) : `T` extends `RunnerMessageCode.PONG` ? [`HandshakeAcknowledgeMessage`](README.md#handshakeacknowledgemessage) : `T` extends `RunnerMessageCode.SNAPSHOT_RESPONSE` ? [`SnapshotResponseMessage`](README.md#snapshotresponsemessage) : `T` extends `SupervisorMessageCode.CONFIG` ? [`InstanceConfigMessage`](README.md#instanceconfigmessage) : `T` extends `CPMMessageCode.STH_ID` ? [`CPMMessageSTHID`](README.md#cpmmessagesthid) : `T` extends `CPMMessageCode.LOAD` ? [`LoadCheckStatMessage`](README.md#loadcheckstatmessage) : `T` extends `CPMMessageCode.NETWORK_INFO` ? [`NetworkInfoMessage`](README.md#networkinfomessage) : `never`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L43)

___

### Middleware

Ƭ **Middleware**: (`req`: `IncomingMessage`, `res`: `ServerResponse`, `next`: [`NextCallback`](README.md#nextcallback)) => `void`

#### Type declaration

▸ (`req`, `res`, `next`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |
| `next` | [`NextCallback`](README.md#nextcallback) |

##### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L19)

___

### MonitoringHandler

Ƭ **MonitoringHandler**: (`resp`: [`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata)) => `MaybePromise`<[`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata)\>

#### Type declaration

▸ (`resp`): `MaybePromise`<[`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata)\>

A handler for the monitoring message.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resp` | [`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata) | passed if the system was able to determine monitoring message by itself. |

##### Returns

`MaybePromise`<[`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata)\>

the monitoring information

#### Defined in

[packages/types/src/app-context.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/app-context.ts#L28)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `msgCode`: `RunnerMessageCode.MONITORING`  } & [`MonitoringMessageData`](README.md#monitoringmessagedata)

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/monitoring.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/monitoring.ts#L40)

___

### MonitoringMessageCode

Ƭ **MonitoringMessageCode**: `RunnerMessageCode.ACKNOWLEDGE` \| `RunnerMessageCode.DESCRIBE_SEQUENCE` \| `RunnerMessageCode.STATUS` \| `RunnerMessageCode.ALIVE` \| `RunnerMessageCode.ERROR` \| `RunnerMessageCode.MONITORING` \| `RunnerMessageCode.EVENT` \| `RunnerMessageCode.PING` \| `RunnerMessageCode.SNAPSHOT_RESPONSE` \| `RunnerMessageCode.SEQUENCE_STOPPED` \| `RunnerMessageCode.SEQUENCE_COMPLETED` \| `CPMMessageCode.LOAD` \| `CPMMessageCode.NETWORK_INFO`

#### Defined in

[packages/types/src/message-streams.ts:98](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L98)

___

### MonitoringMessageData

Ƭ **MonitoringMessageData**: [`MonitoringMessageFromRunnerData`](README.md#monitoringmessagefromrunnerdata) & { `containerId?`: `string` ; `cpuTotalUsage?`: `number` ; `limit?`: `number` ; `memoryMaxUsage?`: `number` ; `memoryUsage?`: `number` ; `networkRx?`: `number` ; `networkTx?`: `number`  }

#### Defined in

[packages/types/src/messages/monitoring.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/monitoring.ts#L13)

___

### MonitoringMessageFromRunnerData

Ƭ **MonitoringMessageFromRunnerData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `healthy` | `boolean` | Calculated backpressure: processing * throughput / buffer. |
| `sequences?` | [`FunctionStatus`](README.md#functionstatus)[] | How many items are processed by the Sequence per second. |

#### Defined in

[packages/types/src/messages/monitoring.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/monitoring.ts#L4)

___

### MonitoringMessageHandler

Ƭ **MonitoringMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](README.md#encodedmessage)<`T`\>) => `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](README.md#monitoringmessagecode) |

#### Type declaration

▸ (`msg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](README.md#encodedmessage)<`T`\> |

##### Returns

`void`

#### Defined in

[packages/types/src/communication-handler.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L10)

___

### MonitoringRateMessage

Ƭ **MonitoringRateMessage**: { `msgCode`: `RunnerMessageCode.MONITORING_RATE`  } & [`MonitoringRateMessageData`](README.md#monitoringratemessagedata)

Message instructing Runner how often to emit monitoring messages.
This message type is sent from Supervisor.

#### Defined in

[packages/types/src/messages/monitor-rate.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/monitor-rate.ts#L13)

___

### MonitoringRateMessageData

Ƭ **MonitoringRateMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `monitoringRate` | `number` | Indicates how frequently should monitoring messages be emitted (in miliseconds). |

#### Defined in

[packages/types/src/messages/monitor-rate.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/monitor-rate.ts#L3)

___

### MutatingMonitoringMessageHandler

Ƭ **MutatingMonitoringMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](README.md#encodedmessage)<`T`\>) => `MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](README.md#monitoringmessagecode) |

#### Type declaration

▸ (`msg`): `MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](README.md#encodedmessage)<`T`\> |

##### Returns

`MaybePromise`<[`EncodedMessage`](README.md#encodedmessage)<`T`\> \| ``null``\>

#### Defined in

[packages/types/src/communication-handler.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L12)

___

### NetworkInfo

Ƭ **NetworkInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `dhcp` | `boolean` |
| `iface` | `string` |
| `ifaceName` | `string` |
| `ip4` | `string` |
| `ip4subnet` | `string` |
| `ip6` | `string` |
| `ip6subnet` | `string` |
| `mac` | `string` |

#### Defined in

[packages/types/src/network-info.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/network-info.ts#L1)

___

### NetworkInfoMessage

Ƭ **NetworkInfoMessage**: { `msgCode`: `CPMMessageCode.NETWORK_INFO`  } & [`NetworkInfo`](README.md#networkinfo)[]

#### Defined in

[packages/types/src/messages/network-info.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/network-info.ts#L4)

___

### NextCallback

Ƭ **NextCallback**: (`err?`: `Error`) => `void`

#### Type declaration

▸ (`err?`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `err?` | `Error` |

##### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L18)

___

### OpResolver

Ƭ **OpResolver**: (`req`: [`ParsedMessage`](README.md#parsedmessage), `res?`: `ServerResponse`) => `MaybePromise`<`any`\>

#### Type declaration

▸ (`req`, `res?`): `MaybePromise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`ParsedMessage`](README.md#parsedmessage) |
| `res?` | `ServerResponse` |

##### Returns

`MaybePromise`<`any`\>

#### Defined in

[packages/types/src/api-expose.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L16)

___

### ParsedMessage

Ƭ **ParsedMessage**: `IncomingMessage` & { `body?`: `any` ; `params`: { [key: string]: `any`;  } \| `undefined`  }

#### Defined in

[packages/types/src/api-expose.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L8)

___

### PassThoughStream

Ƭ **PassThoughStream**<`Passes`\>: [`DuplexStream`](README.md#duplexstream)<`Passes`, `Passes`\>

#### Type parameters

| Name |
| :------ |
| `Passes` |

#### Defined in

[packages/types/src/utils.ts:66](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/utils.ts#L66)

___

### PassThroughStreamsConfig

Ƭ **PassThroughStreamsConfig**<`serialized`\>: [stdin: PassThoughStream<string\>, stdout: PassThoughStream<string\>, stderr: PassThoughStream<string\>, control: PassThoughStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: PassThoughStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: PassThoughStream<any\>, output: PassThoughStream<any\>, log: PassThoughStream<any\>, pkg?: PassThoughStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean```true`` |

#### Defined in

[packages/types/src/message-streams.ts:133](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L133)

___

### RFunction

Ƭ **RFunction**<`Produces`\>: [`Streamable`](README.md#streamable)<`Produces`\> \| [`ReadFunction`](README.md#readfunction)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L22)

___

### ReadFunction

Ƭ **ReadFunction**<`Produces`\>: (`stream`: [`ReadableStream`](interfaces/readablestream.md)<`never`\>, ...`parameters`: `any`[]) => [`Streamable`](README.md#streamable)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Type declaration

▸ (`stream`, ...`parameters`): [`Streamable`](README.md#streamable)<`Produces`\>

A Function that returns a streamable result is a read function

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/readablestream.md)<`never`\> |
| `...parameters` | `any`[] |

##### Returns

[`Streamable`](README.md#streamable)<`Produces`\>

#### Defined in

[packages/types/src/functions.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L13)

___

### ReadSequence

Ƭ **ReadSequence**<`Produces`, `Y`, `Z`\>: [[`RFunction`](README.md#rfunction)<`Produces`\>] \| [[`RFunction`](README.md#rfunction)<`Z`\>, ...TFunctionChain<Z, Produces, Y\>]

A sequence of functions reads input from a source and outputs it after
a chain of transforms.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | `Produces` |
| `Y` | extends `any`[]`any`[] |
| `Z` | `any` |

#### Defined in

[packages/types/src/sequence.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sequence.ts#L23)

___

### ReadableApp

Ƭ **ReadableApp**<`Produces`, `Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](README.md#transformapp)<`VoidType`, `Produces`, `Z`, `S`, `AppConfigType`\>

A Readable App is an app that obtains the data by it's own means and preforms
0 to any number of transforms on that data before returning it.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | `any` |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L38)

___

### RunnerConfig

Ƭ **RunnerConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config?` | `any` |
| `container` | [`ContainerConfiguration`](README.md#containerconfiguration) |
| `engines` | `Object` |
| `error?` | `string` |
| `name` | `string` |
| `packageVolumeId` | `string` |
| `sequencePath` | `string` |
| `version` | `string` |

#### Defined in

[packages/types/src/runner-config.ts:5](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner-config.ts#L5)

___

### RunnerErrorCode

Ƭ **RunnerErrorCode**: ``"SEQUENCE_ENDED_PREMATURE"`` \| ``"SEQUENCE_RUNTIME_ERROR"`` \| ``"UNINITIALIZED_STREAMS"`` \| ``"UNKNOWN_MESSAGE_CODE"`` \| ``"NO_MONITORING"`` \| ``"UNINITIALIZED_CONTEXT"``

#### Defined in

[packages/types/src/error-codes/runner-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/runner-error.ts#L1)

___

### RunnerMessage

Ƭ **RunnerMessage**: [`RunnerMessageCode`, `object`]

#### Defined in

[packages/types/src/runner.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L49)

___

### RunnerOptions

Ƭ **RunnerOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `monitoringInterval?` | `number` |

#### Defined in

[packages/types/src/runner.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L45)

___

### STHConfiguration

Ƭ **STHConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmUrl` | `string` | - |
| `docker` | `Object` | Docker related configuration. |
| `docker.prerunner` | [`ContainerConfiguration`](README.md#containerconfiguration) | - |
| `docker.runner` | [`ContainerConfiguration`](README.md#containerconfiguration) | - |
| `host` | [`HostConfig`](README.md#hostconfig) | Host configuration. |
| `identifyExisting` | `boolean` | Should we identify existing sequences |
| `instanceRequirements` | `Object` | - |
| `instanceRequirements.cpuLoad` | `number` | Required free CPU. In percentage. |
| `instanceRequirements.freeMem` | `number` | Free memory required to start instance. In megabytes. |
| `instanceRequirements.freeSpace` | `number` | Free disk space required to start instance. In megabytes. |
| `safeOperationLimit` | `number` | The amount of memory that must remain free. |

#### Defined in

[packages/types/src/sth-configuration.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sth-configuration.ts#L31)

___

### STHIDMessageData

Ƭ **STHIDMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/messages/sth-id.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/sth-id.ts#L3)

___

### SequenceCompleteMessage

Ƭ **SequenceCompleteMessage**: { `msgCode`: `RunnerMessageCode.SEQUENCE_COMPLETED`  } & [`EmptyMessageData`](README.md#emptymessagedata)

Message from the Runner indicating that the sequence has completed sending it's data
and now can be asked to exit with high probability of accepting the exit gracefully.

#### Defined in

[packages/types/src/messages/sequence-complete.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/sequence-complete.ts#L8)

___

### SequenceEndMessage

Ƭ **SequenceEndMessage**: { `msgCode`: `RunnerMessageCode.SEQUENCE_COMPLETED`  } & [`SequenceEndMessageData`](README.md#sequenceendmessagedata)

Message from the Runner indicating that the sequence has called the end method
on context and it should be safe to terminate it without additional waiting,
unless it exits correctly itself.

#### Defined in

[packages/types/src/messages/sequence-end.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/sequence-end.ts#L13)

___

### SequenceEndMessageData

Ƭ **SequenceEndMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `err` | `Error` | The url of container snapshot created. |

#### Defined in

[packages/types/src/messages/sequence-end.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/sequence-end.ts#L3)

___

### SnapshotResponseMessage

Ƭ **SnapshotResponseMessage**: { `msgCode`: `RunnerMessageCode.SNAPSHOT_RESPONSE`  } & [`SnapshotResponseMessageData`](README.md#snapshotresponsemessagedata)

Information about the url of the container snapshot created.
This message type is sent from the LifeCycle Controller.

#### Defined in

[packages/types/src/messages/snapshot-response.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/snapshot-response.ts#L13)

___

### SnapshotResponseMessageData

Ƭ **SnapshotResponseMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The url of container snapshot created. |

#### Defined in

[packages/types/src/messages/snapshot-response.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/snapshot-response.ts#L3)

___

### StatusMessage

Ƭ **StatusMessage**: { `msgCode`: `RunnerMessageCode.STATUS`  } & [`StatusMessageData`](README.md#statusmessagedata)

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/status.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/status.ts#L15)

___

### StatusMessageData

Ƭ **StatusMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `definition?` | [`FunctionDefinition`](README.md#functiondefinition)[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/status.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/status.ts#L4)

___

### StopHandler

Ƭ **StopHandler**: (`timeout`: `number`, `canCallKeepalive`: `boolean`) => `MaybePromise`<`void`\>

#### Type declaration

▸ (`timeout`, `canCallKeepalive`): `MaybePromise`<`void`\>

A callback that will be called when the sequence is being stopped gracefully.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | the number of seconds before the operation will be killed |
| `canCallKeepalive` | `boolean` | informs if @{link AutoAppContext.keepAlive \| keepalive} can be called to prolong the operation |

##### Returns

`MaybePromise`<`void`\>

the returned value can be a promise, once it's resolved the system will
         assume that it's safe to terminate the process.

#### Defined in

[packages/types/src/app-context.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/app-context.ts#L18)

___

### StopSequenceMessage

Ƭ **StopSequenceMessage**: { `msgCode`: `RunnerMessageCode.STOP`  } & [`StopSequenceMessageData`](README.md#stopsequencemessagedata)

Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
It gives Sequence and Runner time to perform a cleanup.
This message type is sent from Supervisor.

#### Defined in

[packages/types/src/messages/stop-sequence.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/stop-sequence.ts#L17)

___

### StopSequenceMessageData

Ƭ **StopSequenceMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `canCallKeepalive` | `boolean` | Informs if keepAlive can be called to prolong the running of the Sequence. |
| `timeout` | `number` | The number of milliseconds before the Sequence will be killed. |

#### Defined in

[packages/types/src/messages/stop-sequence.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/messages/stop-sequence.ts#L3)

___

### StreamConfig

Ƭ **StreamConfig**: `Object`

Configuration options for streaming endpoionts

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `encoding?` | `BufferEncoding` | Encoding used in the stream |
| `end?` | `boolean` | Should request end also end the stream or can the endpoint accept subsequent connections |
| `json?` | `boolean` | Is the stream a JSON stream? |
| `text?` | `boolean` | Is the stream a text stream? |

#### Defined in

[packages/types/src/api-expose.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L24)

___

### StreamInput

Ƭ **StreamInput**: (`req`: [`ParsedMessage`](README.md#parsedmessage), `res`: `ServerResponse`) => `MaybePromise`<`Readable`\> \| `MaybePromise`<`Readable`\>

#### Defined in

[packages/types/src/api-expose.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L11)

___

### StreamOutput

Ƭ **StreamOutput**: (`req`: `IncomingMessage`, `res`: `ServerResponse`) => `MaybePromise`<`any`\> \| `MaybePromise`<`Writable`\>

#### Defined in

[packages/types/src/api-expose.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L13)

___

### Streamable

Ƭ **Streamable**<`Produces`\>: `MaybePromise`<[`SynchronousStreamable`](README.md#synchronousstreamable)<`Produces`\>\>

Represents all readable stream types that will be accepted as return values
from {@see TFunction}

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/utils.ts#L83)

___

### SupervisorErrorCode

Ƭ **SupervisorErrorCode**: ``"INVALID_CONFIGURATION"`` \| ``"UNINITIALIZED_STREAMS"`` \| ``"GENERAL_ERROR"`` \| ``"SEQUENCE_RUN_BEFORE_INIT"`` \| ``"RUNNER_ERROR"`` \| ``"RUNNER_NON_ZERO_EXITCODE"`` \| ``"RUNNER_NOT_STARTED"`` \| ``"DOCKER_ERROR"`` \| ``"PRERUNNER_ERROR"``

#### Defined in

[packages/types/src/error-codes/supervisor-error.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/error-codes/supervisor-error.ts#L1)

___

### SupervisorMessage

Ƭ **SupervisorMessage**: [`SupervisorMessageCode`, `object`]

#### Defined in

[packages/types/src/runner.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/runner.ts#L54)

___

### SynchronousStreamable

Ƭ **SynchronousStreamable**<`Produces`\>: `PipeableStream`<`Produces`\> \| `AsyncGen`<`Produces`, `Produces`\> \| `Gen`<`Produces`, `void`\> \| `Iterable`<`Produces`\> \| `AsyncIterable`<`Produces`\>

Delayed stream - stream with lazy initialization
in first phase PassThrough stream is created by calling getStream() method
is second phase the stream is piped from external stream by running run() method.

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/utils.ts#L74)

___

### TFunction

Ƭ **TFunction**<`Consumes`, `Produces`\>: `AsyncGen`<`Produces`, `Consumes`\> \| `Gen`<`Produces`, `Consumes`\> \| [`TranformFunction`](README.md#tranformfunction)<`Consumes`, `Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L23)

___

### TFunctionChain

Ƭ **TFunctionChain**<`Consumes`, `Produces`, `Z`\>: [[`TFunction`](README.md#tfunction)<`Consumes`, `Produces`\>] \| [...MulMulTFunction<Consumes, Produces, Z\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | extends `any`[] |

#### Defined in

[packages/types/src/functions.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L43)

___

### TranformFunction

Ƭ **TranformFunction**<`Consumes`, `Produces`\>: (`stream`: [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\>, ...`parameters`: `any`[]) => `StreambleMaybeFunction`<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Type declaration

▸ (`stream`, ...`parameters`): `StreambleMaybeFunction`<`Produces`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\> |
| `...parameters` | `any`[] |

##### Returns

`StreambleMaybeFunction`<`Produces`\>

#### Defined in

[packages/types/src/functions.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L17)

___

### TransformApp

Ƭ **TransformApp**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`, `ReturnType`\>: (`this`: [`AppContext`](interfaces/appcontext.md)<`AppConfigType`, `S`\>, `source`: [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\>, ...`args`: `Z`) => `MaybePromise`<`ReturnType`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |
| `ReturnType` | [`Streamable`](README.md#streamable)<`Produces`\> |

#### Type declaration

▸ (`this`, `source`, ...`args`): `MaybePromise`<`ReturnType`\>

A Transformation App that accepts data from the platform, performs operations on the data,
and returns the data to the platforms for further use.

Has both active readable and writable sides.

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`AppContext`](interfaces/appcontext.md)<`AppConfigType`, `S`\> |
| `source` | [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\> |
| `...args` | `Z` |

##### Returns

`MaybePromise`<`ReturnType`\>

#### Defined in

[packages/types/src/application.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L19)

___

### TransformAppAcceptableSequence

Ƭ **TransformAppAcceptableSequence**<`Consumes`, `Produces`\>: [`TFunction`](README.md#tfunction)<`Consumes`, `Produces`\> \| [`InertSequence`](README.md#inertsequence) \| [`TransformSeqence`](README.md#transformseqence)<`Consumes`, `Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/sequence.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sequence.ts#L35)

___

### TransformSeqence

Ƭ **TransformSeqence**<`Consumes`, `Produces`, `Z`, `X`\>: [[`TFunction`](README.md#tfunction)<`Consumes`, `Produces`\>] \| [...TFunctionChain<Consumes, Z, X\>, [`TFunction`](README.md#tfunction)<`Z`, `Produces`\>]

A Transform Sequence is a sequence that accept input, perform operations on it, and
outputs the result.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | `any` |
| `X` | extends `any`[]`any`[] |

#### Defined in

[packages/types/src/sequence.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sequence.ts#L31)

___

### UpstreamStreamsConfig

Ƭ **UpstreamStreamsConfig**<`serialized`\>: [stdin: ReadableStream<string\>, stdout: WritableStream<string\>, stderr: WritableStream<string\>, control: ReadableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: WritableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: ReadableStream<any\>, output: WritableStream<any\>, log: WritableStream<any\>, pkg?: ReadableStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean```true`` |

#### Defined in

[packages/types/src/message-streams.ts:121](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/message-streams.ts#L121)

___

### WFunction

Ƭ **WFunction**<`Consumes`\>: [`TFunction`](README.md#tfunction)<`Consumes`, `never`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Defined in

[packages/types/src/functions.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L27)

___

### WritableApp

Ƭ **WritableApp**<`Consumes`, `Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](README.md#transformapp)<`Consumes`, `VoidType`, `Z`, `S`, `AppConfigType`, `void`\>

A Writable App is an app that accepts the data from the platform, performs any number
of transforms and then saves it to the data destination by it's own means.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Z` | extends `any`[]`any`[] |
| `S` | extends `any``any` |
| `AppConfigType` | extends [`AppConfig`](README.md#appconfig)[`AppConfig`](README.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/application.ts#L52)

___

### WriteFunction

Ƭ **WriteFunction**<`Consumes`\>: (`stream`: [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\>, ...`parameters`: `any`[]) => `MaybePromise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Type declaration

▸ (`stream`, ...`parameters`): `MaybePromise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/readablestream.md)<`Consumes`\> |
| `...parameters` | `any`[] |

##### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/functions.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/functions.ts#L15)

___

### WriteSequence

Ƭ **WriteSequence**<`Consumes`, `Y`, `Z`\>: [[`WFunction`](README.md#wfunction)<`Consumes`\>] \| [...TFunctionChain<Consumes, Z, Y\>, [`WFunction`](README.md#wfunction)<`Z`\>]

A Sequence of functions that accept some input, transforms it through
a number of functions and writes to some destination.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Y` | extends `any`[]`any`[] |
| `Z` | `any` |

#### Defined in

[packages/types/src/sequence.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/sequence.ts#L15)

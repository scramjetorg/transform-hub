[@scramjet/types](README.md) / Exports

# @scramjet/types

## Table of contents

### Interfaces

- [APIBase](undefined)
- [APIError](undefined)
- [APIExpose](undefined)
- [APIRoute](undefined)
- [AppContext](undefined)
- [ICommunicationHandler](undefined)
- [IComponent](undefined)
- [IHostClient](undefined)
- [ILifeCycleAdapter](undefined)
- [ILifeCycleAdapterMain](undefined)
- [ILifeCycleAdapterRun](undefined)
- [IObjectLogger](undefined)
- [ISequenceAdapter](undefined)
- [ReadableStream](undefined)
- [WritableStream](undefined)

### Type aliases

- [AcknowledgeMessage](undefined)
- [AcknowledgeMessageData](undefined)
- [AppConfig](undefined)
- [AppError](undefined)
- [AppErrorCode](undefined)
- [AppErrorConstructor](undefined)
- [Application](undefined)
- [ApplicationExpose](undefined)
- [ApplicationFunction](undefined)
- [ApplicationInterface](undefined)
- [CPMConnectorOptions](undefined)
- [CPMMessage](undefined)
- [CPMMessageSTHID](undefined)
- [CSIControllerErrorCode](undefined)
- [ContainerConfiguration](undefined)
- [ContainerConfigurationWithExposedPorts](undefined)
- [ControlMessageCode](undefined)
- [ControlMessageHandler](undefined)
- [Decorator](undefined)
- [DeepPartial](undefined)
- [DescribeSequenceMessage](undefined)
- [DescribeSequenceMessageData](undefined)
- [DiskSpace](undefined)
- [DockerSequenceConfig](undefined)
- [DownstreamStdioConfig](undefined)
- [DownstreamStreamsConfig](undefined)
- [DuplexStream](undefined)
- [EmptyMessageData](undefined)
- [EncodedCPMSTHMessage](undefined)
- [EncodedControlMessage](undefined)
- [EncodedMessage](undefined)
- [EncodedMonitoringMessage](undefined)
- [EncodedSerializedControlMessage](undefined)
- [EncodedSerializedMonitoringMessage](undefined)
- [ErrorMessage](undefined)
- [ErrorMessageData](undefined)
- [EventMessage](undefined)
- [EventMessageData](undefined)
- [ExitCode](undefined)
- [FunctionDefinition](undefined)
- [FunctionStatus](undefined)
- [GetResolver](undefined)
- [HandshakeAcknowledgeMessage](undefined)
- [HandshakeAcknowledgeMessageData](undefined)
- [HandshakeMessage](undefined)
- [HasTopicInformation](undefined)
- [HostConfig](undefined)
- [HostErrorCode](undefined)
- [HttpMethod](undefined)
- [InertApp](undefined)
- [InertSequence](undefined)
- [Instance](undefined)
- [InstanceAdapterErrorCode](undefined)
- [InstanceBulkMessage](undefined)
- [InstanceConifg](undefined)
- [InstanceId](undefined)
- [InstanceMessage](undefined)
- [InstanceMessageData](undefined)
- [K8SAdapterConfiguration](undefined)
- [KeepAliveMessage](undefined)
- [KeepAliveMessageData](undefined)
- [KillHandler](undefined)
- [KillSequenceMessage](undefined)
- [KubernetesSequenceConfig](undefined)
- [LifeCycleError](undefined)
- [LoadCheckConfig](undefined)
- [LoadCheckContstants](undefined)
- [LoadCheckStat](undefined)
- [LoadCheckStatMessage](undefined)
- [LogEntry](undefined)
- [LogLevel](undefined)
- [Logger](undefined)
- [LoggerOptions](undefined)
- [LoggerOutput](undefined)
- [Message](undefined)
- [MessageCode](undefined)
- [MessageDataType](undefined)
- [MessageType](undefined)
- [Middleware](undefined)
- [MonitoringHandler](undefined)
- [MonitoringMessage](undefined)
- [MonitoringMessageCode](undefined)
- [MonitoringMessageData](undefined)
- [MonitoringMessageFromRunnerData](undefined)
- [MonitoringMessageHandler](undefined)
- [MonitoringRateMessage](undefined)
- [MonitoringRateMessageData](undefined)
- [MutatingMonitoringMessageHandler](undefined)
- [NetworkInfo](undefined)
- [NetworkInfoMessage](undefined)
- [NextCallback](undefined)
- [OpResolver](undefined)
- [PangMessageData](undefined)
- [ParsedMessage](undefined)
- [PassThoughStream](undefined)
- [PassThroughStreamsConfig](undefined)
- [PingMessageData](undefined)
- [PortConfig](undefined)
- [PreRunnerContainerConfiguration](undefined)
- [ProcessSequenceConfig](undefined)
- [RFunction](undefined)
- [ReadFunction](undefined)
- [ReadSequence](undefined)
- [ReadableApp](undefined)
- [RunnerContainerConfiguration](undefined)
- [RunnerErrorCode](undefined)
- [RunnerMessage](undefined)
- [RunnerOptions](undefined)
- [STHConfiguration](undefined)
- [STHIDMessageData](undefined)
- [SequenceAdapterErrorCode](undefined)
- [SequenceBulkMessage](undefined)
- [SequenceCompleteMessage](undefined)
- [SequenceConfig](undefined)
- [SequenceEndMessage](undefined)
- [SequenceEndMessageData](undefined)
- [SequenceInfo](undefined)
- [SequenceMessage](undefined)
- [SequenceMessageData](undefined)
- [SequencePackageJSON](undefined)
- [SequencePackageJSONScramjetConfig](undefined)
- [SequencePackageJSONScramjetSection](undefined)
- [SequenceStoppedMessageData](undefined)
- [StatusMessage](undefined)
- [StatusMessageData](undefined)
- [StopHandler](undefined)
- [StopSequenceMessage](undefined)
- [StopSequenceMessageData](undefined)
- [StreamConfig](undefined)
- [StreamInput](undefined)
- [StreamOutput](undefined)
- [Streamable](undefined)
- [SynchronousStreamable](undefined)
- [SynchronousStreamablePayload](undefined)
- [TFunction](undefined)
- [TFunctionChain](undefined)
- [TranformFunction](undefined)
- [TransformApp](undefined)
- [TransformAppAcceptableSequence](undefined)
- [TransformSeqence](undefined)
- [UpstreamStreamsConfig](undefined)
- [WFunction](undefined)
- [WritableApp](undefined)
- [WriteFunction](undefined)
- [WriteSequence](undefined)

### Namespaces

- [MessageCodes](undefined)
- [STHRestAPI](undefined)

## Interfaces

### APIBase

• **APIBase**: Interface APIBase

#### Defined in

[packages/types/src/api-expose.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L64)

___

### APIError

• **APIError**: Interface APIError

#### Defined in

[packages/types/src/api-expose.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L49)

___

### APIExpose

• **APIExpose**: Interface APIExpose

#### Defined in

[packages/types/src/api-expose.ts:146](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L146)

___

### APIRoute

• **APIRoute**: Interface APIRoute

#### Defined in

[packages/types/src/api-expose.ts:155](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L155)

___

### AppContext

• **AppContext**: Interface AppContext<AppConfigType, State\>

Object of this interface is passed to Application context and allows it to communicate
with the Platform to ensure that it's in operation and should be kept alive without
interruption.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `AppConfigType` | extends AppConfig |
| `State` | extends any |

#### Defined in

[packages/types/src/app-context.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L36)

___

### ICommunicationHandler

• **ICommunicationHandler**: Interface ICommunicationHandler

#### Defined in

[packages/types/src/communication-handler.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L18)

___

### IComponent

• **IComponent**: Interface IComponent

#### Defined in

[packages/types/src/component.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/component.ts#L3)

___

### IHostClient

• **IHostClient**: Interface IHostClient

#### Defined in

[packages/types/src/csh-connector.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L6)

___

### ILifeCycleAdapter

• **ILifeCycleAdapter**: Interface ILifeCycleAdapter

#### Defined in

[packages/types/src/lifecycle.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle.ts#L10)

___

### ILifeCycleAdapterMain

• **ILifeCycleAdapterMain**: Interface ILifeCycleAdapterMain

#### Defined in

[packages/types/src/lifecycle-adapters.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L8)

___

### ILifeCycleAdapterRun

• **ILifeCycleAdapterRun**: Interface ILifeCycleAdapterRun

#### Defined in

[packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L26)

___

### IObjectLogger

• **IObjectLogger**: Interface IObjectLogger

#### Defined in

[packages/types/src/object-logger.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L48)

___

### ISequenceAdapter

• **ISequenceAdapter**: Interface ISequenceAdapter

#### Defined in

[packages/types/src/sequence-adapter.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L11)

___

### ReadableStream

• **ReadableStream**: Interface ReadableStream<Produces\>

A readable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L44)

___

### WritableStream

• **WritableStream**: Interface WritableStream<Consumes\>

Writable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Defined in

[packages/types/src/utils.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L54)

## Type aliases

### AcknowledgeMessage

Ƭ **AcknowledgeMessage**: Object & AcknowledgeMessageData

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/acknowledge.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/acknowledge.ts#L22)

___

### AcknowledgeMessageData

Ƭ **AcknowledgeMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `acknowledged` | boolean | Indicates whether a message was received. |
| `errorMsg?` | ErrorMessage | Describes an error message if error was thrown after performing a requested operation. |
| `status?` | number | Indicates status of the performed operation. |

#### Defined in

[packages/types/src/messages/acknowledge.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/acknowledge.ts#L4)

___

### AppConfig

Ƭ **AppConfig**: Object

App configuration primitive.

#### Index signature

▪ [key: string]: null \| string \| number \| boolean \| AppConfig

#### Defined in

[packages/types/src/app-config.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-config.ts#L5)

___

### AppError

Ƭ **AppError**: Error & Object

Application error class

#### Defined in

[packages/types/src/error-codes/app-error.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L25)

___

### AppErrorCode

Ƭ **AppErrorCode**: "GENERAL\_ERROR" \| "COMPILE\_ERROR" \| "CONTEXT\_NOT\_INITIALIZED" \| "SEQUENCE\_RUN\_BEFORE\_INIT" \| "SEQUENCE\_MISCONFIGURED" \| CSIControllerErrorCode \| HostErrorCode \| InstanceAdapterErrorCode \| SequenceAdapterErrorCode \| RunnerErrorCode

Acceptable error codes

#### Defined in

[packages/types/src/error-codes/app-error.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L10)

___

### AppErrorConstructor

Ƭ **AppErrorConstructor**: Function

#### Type declaration

• (`code`, `message?`)

Constructs an AppError

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `code` | AppErrorCode | One of the predefined error codes |
| `message?` | string | Optional additional explanatory message |

#### Defined in

[packages/types/src/error-codes/app-error.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L36)

___

### Application

Ƭ **Application**: TransformApp<Consumes, Produces, Z, S, AppConfigType\> \| ReadableApp<Produces, Z, S, AppConfigType\> \| WritableApp<Consumes, Z, S, AppConfigType\> \| InertApp<Z, S\>

Application is an acceptable input for the runner.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | any |
| `Produces` | any |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |

#### Defined in

[packages/types/src/application.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L79)

___

### ApplicationExpose

Ƭ **ApplicationExpose**: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | any |
| `Produces` | any |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `[exposeSequenceSymbol]` | Application<Consumes, Produces, Z, S, AppConfigType\> |

#### Defined in

[packages/types/src/application.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L91)

___

### ApplicationFunction

Ƭ **ApplicationFunction**: ReadableApp \| WritableApp \| TransformApp \| InertApp

#### Defined in

[packages/types/src/application.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L71)

___

### ApplicationInterface

Ƭ **ApplicationInterface**: Function

#### Type declaration

▸ (`this`, `source`, ...`argv`): MaybePromise<Streamable<any\> \| void\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | AppContext<AppConfig, any\> |
| `source` | ReadableStream<any\> |
| `...argv` | any[] |

##### Returns

MaybePromise<Streamable<any\> \| void\>

#### Defined in

[packages/types/src/application.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L6)

___

### CPMConnectorOptions

Ƭ **CPMConnectorOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | STHConfiguration["host"]["id"] |
| `infoFilePath` | STHConfiguration["host"]["infoFilePath"] |

#### Defined in

[packages/types/src/cpm-connector.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/cpm-connector.ts#L3)

___

### CPMMessage

Ƭ **CPMMessage**: [CPMMessageCode, object]

#### Defined in

[packages/types/src/runner.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L53)

___

### CPMMessageSTHID

Ƭ **CPMMessageSTHID**: Object & STHIDMessageData

#### Defined in

[packages/types/src/messages/sth-id.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sth-id.ts#L7)

___

### CSIControllerErrorCode

Ƭ **CSIControllerErrorCode**: "UNINITIALIZED\_STREAM" \| "UNATTACHED\_STREAMS" \| "NO\_CHILD\_PROCESS"

#### Defined in

[packages/types/src/error-codes/csi-controller-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/csi-controller-error.ts#L1)

___

### ContainerConfiguration

Ƭ **ContainerConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `image` | string | Docker image to use. |
| `maxMem` | number | Maximum memory container can allocate (megabytes). |

#### Defined in

[packages/types/src/sth-configuration.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L3)

___

### ContainerConfigurationWithExposedPorts

Ƭ **ContainerConfigurationWithExposedPorts**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `exposePortsRange` | [number, number] | Host port number that the container's port is mapped to. |
| `hostIp` | string | Host IP address that the container's port is mapped to. |

#### Defined in

[packages/types/src/sth-configuration.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L15)

___

### ControlMessageCode

Ƭ **ControlMessageCode**: RunnerMessageCode.KILL \| RunnerMessageCode.MONITORING\_RATE \| RunnerMessageCode.STOP \| RunnerMessageCode.EVENT \| RunnerMessageCode.PONG \| CPMMessageCode.STH\_ID \| RunnerMessageCode.INPUT\_CONTENT\_TYPE

#### Defined in

[packages/types/src/message-streams.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L93)

___

### ControlMessageHandler

Ƭ **ControlMessageHandler**: Function

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ControlMessageCode |

#### Type declaration

▸ (`msg`): MaybePromise<EncodedMessage<T\> \| null\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | EncodedMessage<T\> |

##### Returns

MaybePromise<EncodedMessage<T\> \| null\>

#### Defined in

[packages/types/src/communication-handler.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L15)

___

### Decorator

Ƭ **Decorator**: Function

#### Type declaration

▸ (`req`): void

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | IncomingMessage |

##### Returns

void

#### Defined in

[packages/types/src/api-expose.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L20)

___

### DeepPartial

Ƭ **DeepPartial**: { [K in keyof T]?: DeepPartial<T[K]\> }

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/utils.ts:105](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L105)

___

### DescribeSequenceMessage

Ƭ **DescribeSequenceMessage**: Object & DescribeSequenceMessageData

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/describe-sequence.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L60)

___

### DescribeSequenceMessageData

Ƭ **DescribeSequenceMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `definition?` | FunctionDefinition[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L49)

___

### DiskSpace

Ƭ **DiskSpace**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `available` | number |
| `fs` | string |
| `size` | number |
| `use` | number |
| `used` | number |

#### Defined in

[packages/types/src/load-check-stat.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L1)

___

### DockerSequenceConfig

Ƭ **DockerSequenceConfig**: CommonSequenceConfig & Object

#### Defined in

[packages/types/src/runner-config.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L18)

___

### DownstreamStdioConfig

Ƭ **DownstreamStdioConfig**: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>]

#### Defined in

[packages/types/src/message-streams.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L127)

___

### DownstreamStreamsConfig

Ƭ **DownstreamStreamsConfig**: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>, control: WritableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: ReadableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: WritableStream<any\>, output: ReadableStream<any\>, log: ReadableStream<any\>, pkg?: WritableStream<Buffer\> \| undefined]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends boolean = true |

#### Defined in

[packages/types/src/message-streams.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L114)

___

### DuplexStream

Ƭ **DuplexStream**: WritableStream<Consumes\> & ReadableStream<Produces\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L65)

___

### EmptyMessageData

Ƭ **EmptyMessageData**: Object

#### Defined in

[packages/types/src/messages/message.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/message.ts#L16)

___

### EncodedCPMSTHMessage

Ƭ **EncodedCPMSTHMessage**: EncodedMessage<CPMMessageCode\>

#### Defined in

[packages/types/src/message-streams.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L112)

___

### EncodedControlMessage

Ƭ **EncodedControlMessage**: EncodedMessage<ControlMessageCode\>

#### Defined in

[packages/types/src/message-streams.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L99)

___

### EncodedMessage

Ƭ **EncodedMessage**: [T, MessageDataType<T\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends RunnerMessageCode \| CPMMessageCode |

#### Defined in

[packages/types/src/message-streams.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L89)

___

### EncodedMonitoringMessage

Ƭ **EncodedMonitoringMessage**: EncodedMessage<MonitoringMessageCode\>

#### Defined in

[packages/types/src/message-streams.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L111)

___

### EncodedSerializedControlMessage

Ƭ **EncodedSerializedControlMessage**: string

#### Defined in

[packages/types/src/message-streams.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L108)

___

### EncodedSerializedMonitoringMessage

Ƭ **EncodedSerializedMonitoringMessage**: string

#### Defined in

[packages/types/src/message-streams.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L109)

___

### ErrorMessage

Ƭ **ErrorMessage**: Object & ErrorMessageData

A general purpose error message.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/error.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/error.ts#L22)

___

### ErrorMessageData

Ƭ **ErrorMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `errorCode` | number | Error's status code |
| `exitCode` | number | The operation's exit code. |
| `message` | string | Error message. |
| `stack` | string | Error stack trace. |

#### Defined in

[packages/types/src/messages/error.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/error.ts#L3)

___

### EventMessage

Ƭ **EventMessage**: Object & EventMessageData

TODO update
Event message emitted by sequence and handeled in the context.

#### Defined in

[packages/types/src/messages/event.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/event.ts#L16)

___

### EventMessageData

Ƭ **EventMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | string | Name of the event. |
| `message` | any | TODO update Informs if keepAlive can be called to prolong the running of the Sequence. |

#### Defined in

[packages/types/src/messages/event.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/event.ts#L3)

___

### ExitCode

Ƭ **ExitCode**: number

#### Defined in

[packages/types/src/lifecycle-adapters.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L6)

___

### FunctionDefinition

Ƭ **FunctionDefinition**: `Object`

Definition that informs the platform of the details of a single function.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `description?` | string | Additional description of the function |
| `mode` | "buffer" \| "object" \| "reference" | Stream mode:  * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets * object - carries any type of object, that is serializable via JSON or analogue * reference - carries non-serializable object references that should not be passed outside of a single process |
| `name?` | string | Optional name for the function (which will be shown in UI/CLI) |
| `scalability?` | Object | Describes how head (readable side) and tail (writable side) of this Function can be scaled to other machines. |
| `scalability.head?` | ScalabilityOptions | Writable side scalability |
| `scalability.tail?` | ScalabilityOptions | Readable side scalability |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L16)

___

### FunctionStatus

Ƭ **FunctionStatus**: `Object`

Provides basic function status information

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `buffer` | number | The amount of stream entries that this function will accept in queue for processing before `pause` is called (i.e. highWaterMark - processing) |
| `pressure` | number | Calculated backpressure: processing * throughput / buffer |
| `processing` | number | The number of stream entries currently being processed. |
| `throughput` | number | Average number of stream entries passing that specific function over the duration of 1 second during the last 10 seconds. |

#### Defined in

[packages/types/src/runner.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L6)

___

### GetResolver

Ƭ **GetResolver**: Function

#### Type declaration

▸ (`req`): MaybePromise<any\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |

##### Returns

MaybePromise<any\>

#### Defined in

[packages/types/src/api-expose.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L15)

___

### HandshakeAcknowledgeMessage

Ƭ **HandshakeAcknowledgeMessage**: Object & HandshakeAcknowledgeMessageData

Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
the received handshake message (PING).
The message includes the Sequence configuration information.

#### Defined in

[packages/types/src/messages/handshake-acknowledge.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake-acknowledge.ts#L16)

___

### HandshakeAcknowledgeMessageData

Ƭ **HandshakeAcknowledgeMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `appConfig` | AppConfig | Sequence configuration passed to the Sequence when it is started by the Runner. |
| `args?` | any[] | - |

#### Defined in

[packages/types/src/messages/handshake-acknowledge.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake-acknowledge.ts#L4)

___

### HandshakeMessage

Ƭ **HandshakeMessage**: `Object`

Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
Runner is then waiting to receive the handshake acknowledge message back (PONG)
from the CSH to start the Sequence.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | RunnerMessageCode.PING |

#### Defined in

[packages/types/src/messages/handshake.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L8)

___

### HasTopicInformation

Ƭ **HasTopicInformation**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType?` | string |
| `topic?` | string |

#### Defined in

[packages/types/src/utils.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L79)

___

### HostConfig

Ƭ **HostConfig**: `Object`

Host process configuration.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiBase` | string | API URL. |
| `hostname` | string | Hostname. |
| `id?` | string | Custom host identifier. |
| `infoFilePath` | string | Host information filepath. |
| `instancesServerPort` | number | Port number for connecting instances. |
| `port` | number | API port. |

#### Defined in

[packages/types/src/sth-configuration.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L40)

___

### HostErrorCode

Ƭ **HostErrorCode**: "UNINITIALIZED\_STREAM" \| "UNATTACHED\_STREAMS" \| "UNKNOWN\_CHANNEL" \| "LOG\_NOT\_AVAILABLE" \| "SEQUENCE\_IDENTIFICATION\_FAILED" \| "UNKNOWN\_SEQUENCE" \| "UNKNOWN\_INSTANCE" \| "EVENT\_NAME\_MISSING" \| "CONTROLLER\_ERROR" \| "SOCKET\_TAKEN" \| "API\_CONFIGURATION\_ERROR"

#### Defined in

[packages/types/src/error-codes/host-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/host-error.ts#L1)

___

### HttpMethod

Ƭ **HttpMethod**: "get" \| "head" \| "post" \| "put" \| "delete" \| "connect" \| "trace" \| "patch"

#### Defined in

[packages/types/src/api-expose.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L9)

___

### InertApp

Ƭ **InertApp**: TransformApp<VoidType, VoidType, Z, S, AppConfigType, void\>

An Inert App is an app that doesn't accept data from the platform and doesn't output it.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |
| `VoidType` | void |

#### Defined in

[packages/types/src/application.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L64)

___

### InertSequence

Ƭ **InertSequence**: TFunctionChain<Y, Z, X\>

Minimal type of Sequence that doesn't read anything from the outside, doesn't
write anything to outside. It may be doing anything, but it's not able to report
the progress via streaming.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | any |
| `Y` | any |
| `X` | extends any[] = any[] |

#### Defined in

[packages/types/src/sequence.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L9)

___

### Instance

Ƭ **Instance**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `appConfig?` | AppConfig |
| `created?` | Date |
| `id` | string |
| `ports?` | Record<string, number\> |
| `sequence` | string |
| `sequenceArgs?` | any[] |
| `started?` | Date |

#### Defined in

[packages/types/src/instance-store.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance-store.ts#L3)

___

### InstanceAdapterErrorCode

Ƭ **InstanceAdapterErrorCode**: "INVALID\_CONFIGURATION" \| "UNINITIALIZED\_STREAMS" \| "GENERAL\_ERROR" \| "SEQUENCE\_RUN\_BEFORE\_INIT" \| "RUNNER\_ERROR" \| "RUNNER\_NON\_ZERO\_EXITCODE" \| "RUNNER\_NOT\_STARTED" \| "DOCKER\_ERROR" \| "PRERUNNER\_ERROR"

#### Defined in

[packages/types/src/error-codes/instance-adapter-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/instance-adapter-error.ts#L1)

___

### InstanceBulkMessage

Ƭ **InstanceBulkMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `instances` | InstanceMessageData[] |
| `msgCode` | CPMMessageCode.INSTANCES |

#### Defined in

[packages/types/src/messages/instance.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L10)

___

### InstanceConifg

Ƭ **InstanceConifg**: SequenceConfig & Object

#### Defined in

[packages/types/src/runner-config.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L38)

___

### InstanceId

Ƭ **InstanceId**: string

#### Defined in

[packages/types/src/instance.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance.ts#L1)

___

### InstanceMessage

Ƭ **InstanceMessage**: Object & InstanceMessageData

#### Defined in

[packages/types/src/messages/instance.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L9)

___

### InstanceMessageData

Ƭ **InstanceMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | string |
| `sequence` | string |
| `status` | InstanceMessageCode |

#### Defined in

[packages/types/src/messages/instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L3)

___

### K8SAdapterConfiguration

Ƭ **K8SAdapterConfiguration**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `authConfigPath?` | string |
| `namespace` | string |
| `runnerImage` | string |
| `sequencesRoot` | string |
| `sthPodHost` | string |

#### Defined in

[packages/types/src/sth-configuration.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L72)

___

### KeepAliveMessage

Ƭ **KeepAliveMessage**: Object & KeepAliveMessageData

Message instrucing how much longer to keep Sequence alive.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/keep-alive.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/keep-alive.ts#L13)

___

### KeepAliveMessageData

Ƭ **KeepAliveMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `keepAlive` | number | Information on how much longer the Sequence will be active (in miliseconds). |

#### Defined in

[packages/types/src/messages/keep-alive.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/keep-alive.ts#L3)

___

### KillHandler

Ƭ **KillHandler**: Function

#### Type declaration

▸ (): void

##### Returns

void

#### Defined in

[packages/types/src/app-context.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L20)

___

### KillSequenceMessage

Ƭ **KillSequenceMessage**: `Object`

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from CSIController.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | RunnerMessageCode.KILL |

#### Defined in

[packages/types/src/messages/kill-sequence.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/kill-sequence.ts#L8)

___

### KubernetesSequenceConfig

Ƭ **KubernetesSequenceConfig**: CommonSequenceConfig & Object

#### Defined in

[packages/types/src/runner-config.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L31)

___

### LifeCycleError

Ƭ **LifeCycleError**: any \| Error & Object

#### Defined in

[packages/types/src/lifecycle-adapters.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L41)

___

### LoadCheckConfig

Ƭ **LoadCheckConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `instanceRequirements` | Object |
| `instanceRequirements.cpuLoad` | number |
| `instanceRequirements.freeMem` | number |
| `instanceRequirements.freeSpace` | number |
| `safeOperationLimit` | number |

#### Defined in

[packages/types/src/load-check-stat.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L22)

___

### LoadCheckContstants

Ƭ **LoadCheckContstants**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `MIN_INSTANCE_REQUIREMENTS` | Object |
| `MIN_INSTANCE_REQUIREMENTS.cpuLoad` | number |
| `MIN_INSTANCE_REQUIREMENTS.freeMem` | number |
| `MIN_INSTANCE_REQUIREMENTS.freeSpace` | number |
| `SAFE_OPERATION_LIMIT` | number |

#### Defined in

[packages/types/src/load-check-stat.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L31)

___

### LoadCheckStat

Ƭ **LoadCheckStat**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `avgLoad` | number |
| `currentLoad` | number |
| `fsSize` | DiskSpace[] |
| `memFree` | number |
| `memUsed` | number |

#### Defined in

[packages/types/src/load-check-stat.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L9)

___

### LoadCheckStatMessage

Ƭ **LoadCheckStatMessage**: Object & LoadCheckStat

#### Defined in

[packages/types/src/messages/load.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/load.ts#L4)

___

### LogEntry

Ƭ **LogEntry**: Partial<Object\>

Single log entry.

#### Defined in

[packages/types/src/object-logger.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L10)

___

### LogLevel

Ƭ **LogLevel**: "ERROR" \| "WARN" \| "INFO" \| "DEBUG" \| "FATAL" \| "TRACE"

#### Defined in

[packages/types/src/object-logger.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L5)

___

### Logger

Ƭ **Logger**: Console

#### Defined in

[packages/types/src/logger.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L15)

___

### LoggerOptions

Ƭ **LoggerOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `useCallsite?` | boolean | Should we show callsites to show originating line |

#### Defined in

[packages/types/src/logger.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L10)

___

### LoggerOutput

Ƭ **LoggerOutput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `err?` | WritableStream<any\> | Errror stream |
| `out` | WritableStream<any\> | Output stream |

#### Defined in

[packages/types/src/logger.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L3)

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
| `msgCode` | RunnerMessageCode | Message type code from RunnerMessageCode enumeration. |

#### Defined in

[packages/types/src/messages/message.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/message.ts#L10)

___

### MessageCode

Ƭ **MessageCode**: ANY

#### Defined in

[packages/types/src/runner.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L42)

___

### MessageDataType

Ƭ **MessageDataType**: T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessageData : T extends RunnerMessageCode.ALIVE ? KeepAliveMessageData : T extends RunnerMessageCode.DESCRIBE\_SEQUENCE ? DescribeSequenceMessageData : T extends RunnerMessageCode.STATUS ? StatusMessageData : T extends RunnerMessageCode.ERROR ? ErrorMessageData : T extends RunnerMessageCode.KILL ? EmptyMessageData : T extends RunnerMessageCode.MONITORING ? MonitoringMessageData : T extends RunnerMessageCode.MONITORING\_RATE ? MonitoringRateMessageData : T extends RunnerMessageCode.STOP ? StopSequenceMessageData : T extends RunnerMessageCode.PING ? PingMessageData : T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessageData : T extends RunnerMessageCode.PANG ? PangMessageData : T extends RunnerMessageCode.SEQUENCE\_STOPPED ? SequenceStoppedMessageData : T extends RunnerMessageCode.EVENT ? EventMessageData : T extends CPMMessageCode.STH\_ID ? STHIDMessageData : T extends CPMMessageCode.LOAD ? LoadCheckStat : T extends CPMMessageCode.NETWORK\_INFO ? NetworkInfo[] : T extends CPMMessageCode.INSTANCES ? InstanceBulkMessage : T extends CPMMessageCode.INSTANCE ? InstanceMessage : T extends CPMMessageCode.SEQUENCES ? SequenceBulkMessage : T extends CPMMessageCode.SEQUENCE ? SequenceMessage : never

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L64)

___

### MessageType

Ƭ **MessageType**: T extends RunnerMessageCode.ACKNOWLEDGE ? AcknowledgeMessage : T extends RunnerMessageCode.ALIVE ? KeepAliveMessage : T extends RunnerMessageCode.DESCRIBE\_SEQUENCE ? DescribeSequenceMessage : T extends RunnerMessageCode.STATUS ? StatusMessage : T extends RunnerMessageCode.ERROR ? ErrorMessage : T extends RunnerMessageCode.KILL ? KillSequenceMessage : T extends RunnerMessageCode.MONITORING ? MonitoringMessage : T extends RunnerMessageCode.MONITORING\_RATE ? MonitoringRateMessage : T extends RunnerMessageCode.STOP ? StopSequenceMessage : T extends RunnerMessageCode.PING ? HandshakeMessage : T extends RunnerMessageCode.PONG ? HandshakeAcknowledgeMessage : T extends CPMMessageCode.STH\_ID ? CPMMessageSTHID : T extends CPMMessageCode.LOAD ? LoadCheckStatMessage : T extends CPMMessageCode.NETWORK\_INFO ? NetworkInfoMessage : never

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L46)

___

### Middleware

Ƭ **Middleware**: Function

#### Type declaration

▸ (`req`, `res`, `next`): void

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |
| `res` | ServerResponse |
| `next` | NextCallback |

##### Returns

void

#### Defined in

[packages/types/src/api-expose.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L19)

___

### MonitoringHandler

Ƭ **MonitoringHandler**: Function

#### Type declaration

▸ (`resp`): MaybePromise<MonitoringMessageFromRunnerData\>

A handler for the monitoring message.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resp` | MonitoringMessageFromRunnerData | passed if the system was able to determine monitoring message by itself. |

##### Returns

MaybePromise<MonitoringMessageFromRunnerData\>

the monitoring information

#### Defined in

[packages/types/src/app-context.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L28)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: Object & MonitoringMessageData

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/monitoring.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L43)

___

### MonitoringMessageCode

Ƭ **MonitoringMessageCode**: RunnerMessageCode.ACKNOWLEDGE \| RunnerMessageCode.DESCRIBE\_SEQUENCE \| RunnerMessageCode.STATUS \| RunnerMessageCode.ALIVE \| RunnerMessageCode.ERROR \| RunnerMessageCode.MONITORING \| RunnerMessageCode.EVENT \| RunnerMessageCode.PING \| RunnerMessageCode.PANG \| RunnerMessageCode.SEQUENCE\_STOPPED \| RunnerMessageCode.SEQUENCE\_COMPLETED \| CPMMessageCode.LOAD \| CPMMessageCode.NETWORK\_INFO

#### Defined in

[packages/types/src/message-streams.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L101)

___

### MonitoringMessageData

Ƭ **MonitoringMessageData**: MonitoringMessageFromRunnerData & Object

#### Defined in

[packages/types/src/messages/monitoring.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L13)

___

### MonitoringMessageFromRunnerData

Ƭ **MonitoringMessageFromRunnerData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `healthy` | boolean | Calculated backpressure: processing * throughput / buffer. |
| `sequences?` | FunctionStatus[] | How many items are processed by the Sequence per second. |

#### Defined in

[packages/types/src/messages/monitoring.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L4)

___

### MonitoringMessageHandler

Ƭ **MonitoringMessageHandler**: Function

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends MonitoringMessageCode |

#### Type declaration

▸ (`msg`): void

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | EncodedMessage<T\> |

##### Returns

void

#### Defined in

[packages/types/src/communication-handler.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L11)

___

### MonitoringRateMessage

Ƭ **MonitoringRateMessage**: Object & MonitoringRateMessageData

Message instructing Runner how often to emit monitoring messages.
This message type is sent from CSIController.

#### Defined in

[packages/types/src/messages/monitor-rate.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitor-rate.ts#L13)

___

### MonitoringRateMessageData

Ƭ **MonitoringRateMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `monitoringRate` | number | Indicates how frequently should monitoring messages be emitted (in miliseconds). |

#### Defined in

[packages/types/src/messages/monitor-rate.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitor-rate.ts#L3)

___

### MutatingMonitoringMessageHandler

Ƭ **MutatingMonitoringMessageHandler**: Function

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends MonitoringMessageCode |

#### Type declaration

▸ (`msg`): MaybePromise<EncodedMessage<T\> \| null\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | EncodedMessage<T\> |

##### Returns

MaybePromise<EncodedMessage<T\> \| null\>

#### Defined in

[packages/types/src/communication-handler.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L13)

___

### NetworkInfo

Ƭ **NetworkInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `dhcp` | boolean |
| `iface` | string |
| `ifaceName` | string |
| `ip4` | string |
| `ip4subnet` | string |
| `ip6` | string |
| `ip6subnet` | string |
| `mac` | string |

#### Defined in

[packages/types/src/network-info.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/network-info.ts#L1)

___

### NetworkInfoMessage

Ƭ **NetworkInfoMessage**: Object & NetworkInfo[]

#### Defined in

[packages/types/src/messages/network-info.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/network-info.ts#L4)

___

### NextCallback

Ƭ **NextCallback**: Function

#### Type declaration

▸ (`err?`): void

##### Parameters

| Name | Type |
| :------ | :------ |
| `err?` | Error |

##### Returns

void

#### Defined in

[packages/types/src/api-expose.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L18)

___

### OpResolver

Ƭ **OpResolver**: Function

#### Type declaration

▸ (`req`, `res?`): MaybePromise<any\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |
| `res?` | ServerResponse |

##### Returns

MaybePromise<any\>

#### Defined in

[packages/types/src/api-expose.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L16)

___

### PangMessageData

Ƭ **PangMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType?` | string |
| `provides?` | string |
| `requires?` | string |

#### Defined in

[packages/types/src/messages/handshake.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L12)

___

### ParsedMessage

Ƭ **ParsedMessage**: IncomingMessage & Object

#### Defined in

[packages/types/src/api-expose.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L8)

___

### PassThoughStream

Ƭ **PassThoughStream**: DuplexStream<Passes, Passes\>

#### Type parameters

| Name |
| :------ |
| `Passes` |

#### Defined in

[packages/types/src/utils.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L66)

___

### PassThroughStreamsConfig

Ƭ **PassThroughStreamsConfig**: [stdin: PassThoughStream<string\>, stdout: PassThoughStream<string\>, stderr: PassThoughStream<string\>, control: PassThoughStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: PassThoughStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: PassThoughStream<any\>, output: PassThoughStream<any\>, log: PassThoughStream<any\>, pkg?: PassThoughStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends boolean = true |

#### Defined in

[packages/types/src/message-streams.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L143)

___

### PingMessageData

Ƭ **PingMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ports?` | Record<string, string\> |

#### Defined in

[packages/types/src/messages/handshake.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L10)

___

### PortConfig

Ƭ **PortConfig**: \`${number}/${"tcp" \| "udp"}\`

#### Defined in

[packages/types/src/sequence-package-json.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L1)

___

### PreRunnerContainerConfiguration

Ƭ **PreRunnerContainerConfiguration**: ContainerConfiguration

PreRunner container configuraion.

#### Defined in

[packages/types/src/sth-configuration.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L30)

___

### ProcessSequenceConfig

Ƭ **ProcessSequenceConfig**: CommonSequenceConfig & Object

#### Defined in

[packages/types/src/runner-config.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L26)

___

### RFunction

Ƭ **RFunction**: Streamable<Produces\> \| ReadFunction<Produces\>

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L22)

___

### ReadFunction

Ƭ **ReadFunction**: Function

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Type declaration

▸ (`stream`, ...`parameters`): Streamable<Produces\>

A Function that returns a streamable result is a read function

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | ReadableStream<never\> |
| `...parameters` | any[] |

##### Returns

Streamable<Produces\>

#### Defined in

[packages/types/src/functions.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L13)

___

### ReadSequence

Ƭ **ReadSequence**: [RFunction<Produces\>] \| [RFunction<Z\>, ...TFunctionChain<Z, Produces, Y\>]

A sequence of functions reads input from a source and outputs it after
a chain of transforms.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | `Produces` |
| `Y` | extends any[] = any[] |
| `Z` | any |

#### Defined in

[packages/types/src/sequence.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L23)

___

### ReadableApp

Ƭ **ReadableApp**: TransformApp<VoidType, Produces, Z, S, AppConfigType\>

A Readable App is an app that obtains the data by it's own means and preforms
0 to any number of transforms on that data before returning it.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | any |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |
| `VoidType` | void |

#### Defined in

[packages/types/src/application.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L37)

___

### RunnerContainerConfiguration

Ƭ **RunnerContainerConfiguration**: ContainerConfiguration & ContainerConfigurationWithExposedPorts

Runner container configuration.

#### Defined in

[packages/types/src/sth-configuration.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L35)

___

### RunnerErrorCode

Ƭ **RunnerErrorCode**: "SEQUENCE\_ENDED\_PREMATURE" \| "SEQUENCE\_RUNTIME\_ERROR" \| "UNINITIALIZED\_STREAMS" \| "UNKNOWN\_MESSAGE\_CODE" \| "NO\_MONITORING" \| "UNINITIALIZED\_CONTEXT"

#### Defined in

[packages/types/src/error-codes/runner-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/runner-error.ts#L1)

___

### RunnerMessage

Ƭ **RunnerMessage**: [RunnerMessageCode, object]

#### Defined in

[packages/types/src/runner.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L48)

___

### RunnerOptions

Ƭ **RunnerOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `monitoringInterval?` | number |

#### Defined in

[packages/types/src/runner.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L44)

___

### STHConfiguration

Ƭ **STHConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpmUrl` | string | CPM url. |
| `docker` | Object | Docker related configuration. |
| `docker.prerunner` | PreRunnerContainerConfiguration | PreRunner container configuration. |
| `docker.runner` | RunnerContainerConfiguration | Runner container configuration. |
| `docker.runnerImages` | Object | - |
| `docker.runnerImages.node` | string | - |
| `docker.runnerImages.python3` | string | - |
| `host` | HostConfig | Host configuration. |
| `identifyExisting` | boolean | Should we identify existing sequences. |
| `instanceAdapterExitDelay` | number | Time to wait after Runner container exit. In this additional time instance API is still available. |
| `instanceRequirements` | Object | Minimum requirements to start new instance. |
| `instanceRequirements.cpuLoad` | number | Required free CPU. In percentage. |
| `instanceRequirements.freeMem` | number | Free memory required to start instance. In megabytes. |
| `instanceRequirements.freeSpace` | number | Free disk space required to start instance. In megabytes. |
| `kubernetes` | Partial<K8SAdapterConfiguration\> | - |
| `logColors` | boolean | Enable colors in logging. |
| `logLevel` | LogLevel | Logging level. |
| `runtimeAdapter` | string | Which sequence and instance adpaters should sth use. One of 'docker', 'process', 'kubernetes' |
| `safeOperationLimit` | number | The amount of memory that must remain free. |
| `sequencesRoot` | string | Only used when `noDocker` is true Where should ProcessSequenceAdapter save new sequences |

#### Defined in

[packages/types/src/sth-configuration.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L80)

___

### STHIDMessageData

Ƭ **STHIDMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | string |

#### Defined in

[packages/types/src/messages/sth-id.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sth-id.ts#L3)

___

### SequenceAdapterErrorCode

Ƭ **SequenceAdapterErrorCode**: "DOCKER\_ERROR" \| "PRERUNNER\_ERROR"

#### Defined in

[packages/types/src/error-codes/sequence-adapter-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/sequence-adapter-error.ts#L1)

___

### SequenceBulkMessage

Ƭ **SequenceBulkMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | CPMMessageCode.SEQUENCES |
| `sequences` | SequenceMessageData[] |

#### Defined in

[packages/types/src/messages/sequence.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L9)

___

### SequenceCompleteMessage

Ƭ **SequenceCompleteMessage**: Object & EmptyMessageData

Message from the Runner indicating that the sequence has completed sending it's data
and now can be asked to exit with high probability of accepting the exit gracefully.

#### Defined in

[packages/types/src/messages/sequence-complete.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-complete.ts#L8)

___

### SequenceConfig

Ƭ **SequenceConfig**: DockerSequenceConfig \| ProcessSequenceConfig \| KubernetesSequenceConfig

#### Defined in

[packages/types/src/runner-config.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L36)

___

### SequenceEndMessage

Ƭ **SequenceEndMessage**: Object & SequenceEndMessageData

Message from the Runner indicating that the sequence has called the end method
on context and it should be safe to terminate it without additional waiting,
unless it exits correctly itself.

#### Defined in

[packages/types/src/messages/sequence-end.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-end.ts#L12)

___

### SequenceEndMessageData

Ƭ **SequenceEndMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `err` | Error |

#### Defined in

[packages/types/src/messages/sequence-end.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-end.ts#L3)

___

### SequenceInfo

Ƭ **SequenceInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | SequenceConfig |
| `id` | string |
| `instances` | Set<InstanceId\> |

#### Defined in

[packages/types/src/sequence-adapter.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L5)

___

### SequenceMessage

Ƭ **SequenceMessage**: Object & SequenceMessageData

#### Defined in

[packages/types/src/messages/sequence.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L8)

___

### SequenceMessageData

Ƭ **SequenceMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | string |
| `status` | SequenceMessageCode |

#### Defined in

[packages/types/src/messages/sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L3)

___

### SequencePackageJSON

Ƭ **SequencePackageJSON**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `engines?` | Record<string, string\> \| null |
| `main` | string |
| `name?` | string \| null |
| `scramjet?` | SequencePackageJSONScramjetSection \| null |
| `version?` | string \| null |

#### Defined in

[packages/types/src/sequence-package-json.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L11)

___

### SequencePackageJSONScramjetConfig

Ƭ **SequencePackageJSONScramjetConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ports?` | PortConfig[] \| null |

#### Defined in

[packages/types/src/sequence-package-json.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L3)

___

### SequencePackageJSONScramjetSection

Ƭ **SequencePackageJSONScramjetSection**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config?` | SequencePackageJSONScramjetConfig \| null |

#### Defined in

[packages/types/src/sequence-package-json.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L7)

___

### SequenceStoppedMessageData

Ƭ **SequenceStoppedMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `sequenceError?` | unknown |

#### Defined in

[packages/types/src/messages/sequence-stopped.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-stopped.ts#L1)

___

### StatusMessage

Ƭ **StatusMessage**: Object & StatusMessageData

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/status.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/status.ts#L15)

___

### StatusMessageData

Ƭ **StatusMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `definition?` | FunctionDefinition[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/status.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/status.ts#L4)

___

### StopHandler

Ƭ **StopHandler**: Function

#### Type declaration

▸ (`timeout`, `canCallKeepalive`): MaybePromise<void\>

A callback that will be called when the sequence is being stopped gracefully.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | number | the number of seconds before the operation will be killed |
| `canCallKeepalive` | boolean | informs if @{link AutoAppContext.keepAlive \| keepalive} can be called to prolong the operation |

##### Returns

MaybePromise<void\>

the returned value can be a promise, once it's resolved the system will
         assume that it's safe to terminate the process.

#### Defined in

[packages/types/src/app-context.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L18)

___

### StopSequenceMessage

Ƭ **StopSequenceMessage**: Object & StopSequenceMessageData

Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
It gives Sequence and Runner time to perform a cleanup.
This message type is sent from CSIController.

#### Defined in

[packages/types/src/messages/stop-sequence.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/stop-sequence.ts#L17)

___

### StopSequenceMessageData

Ƭ **StopSequenceMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `canCallKeepalive` | boolean | Informs if keepAlive can be called to prolong the running of the Sequence. |
| `timeout` | number | The number of milliseconds before the Sequence will be killed. |

#### Defined in

[packages/types/src/messages/stop-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/stop-sequence.ts#L3)

___

### StreamConfig

Ƭ **StreamConfig**: `Object`

Configuration options for streaming endpoionts

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `checkContentType?` | boolean | Perform stream content-type type checks |
| `encoding?` | BufferEncoding | Encoding used in the stream |
| `end?` | boolean | Should request end also end the stream or can the endpoint accept subsequent connections |
| `json?` | boolean | Is the stream a JSON stream? |
| `text?` | boolean | Is the stream a text stream? |

#### Defined in

[packages/types/src/api-expose.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L25)

___

### StreamInput

Ƭ **StreamInput**: Function \| MaybePromise<Readable\>

#### Defined in

[packages/types/src/api-expose.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L11)

___

### StreamOutput

Ƭ **StreamOutput**: Function \| MaybePromise<Writable\>

#### Defined in

[packages/types/src/api-expose.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L13)

___

### Streamable

Ƭ **Streamable**: MaybePromise<SynchronousStreamable<Produces\>\>

Represents all readable stream types that will be accepted as return values
from {@see TFunction}

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L89)

___

### SynchronousStreamable

Ƭ **SynchronousStreamable**: SynchronousStreamablePayload<Produces\> & HasTopicInformation

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L84)

___

### SynchronousStreamablePayload

Ƭ **SynchronousStreamablePayload**: PipeableStream<Produces\> \| AsyncGen<Produces, Produces\> \| Gen<Produces, void\> \| Iterable<Produces\> \| AsyncIterable<Produces\>

Delayed stream - stream with lazy initialization
in first phase PassThrough stream is created by calling getStream() method
is second phase the stream is piped from external stream by running run() method.

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L74)

___

### TFunction

Ƭ **TFunction**: AsyncGen<Produces, Consumes\> \| Gen<Produces, Consumes\> \| TranformFunction<Consumes, Produces\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L23)

___

### TFunctionChain

Ƭ **TFunctionChain**: [TFunction<Consumes, Produces\>] \| [...MulMulTFunction<Consumes, Produces, Z\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | extends any[] |

#### Defined in

[packages/types/src/functions.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L43)

___

### TranformFunction

Ƭ **TranformFunction**: Function

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Type declaration

▸ (`stream`, ...`parameters`): StreambleMaybeFunction<Produces\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | ReadableStream<Consumes\> |
| `...parameters` | any[] |

##### Returns

StreambleMaybeFunction<Produces\>

#### Defined in

[packages/types/src/functions.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L17)

___

### TransformApp

Ƭ **TransformApp**: Function

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | any |
| `Produces` | any |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |
| `ReturnType` | Streamable<Produces\> |

#### Type declaration

▸ (`this`, `source`, ...`args`): MaybePromise<ReturnType\>

A Transformation App that accepts data from the platform, performs operations on the data,
and returns the data to the platforms for further use.

Has both active readable and writable sides.

**`interface`**

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | AppContext<AppConfigType, S\> |
| `source` | ReadableStream<Consumes\> |
| `...args` | Z |

##### Returns

MaybePromise<ReturnType\>

#### Defined in

[packages/types/src/application.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L18)

___

### TransformAppAcceptableSequence

Ƭ **TransformAppAcceptableSequence**: TFunction<Consumes, Produces\> \| InertSequence \| TransformSeqence<Consumes, Produces\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/sequence.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L35)

___

### TransformSeqence

Ƭ **TransformSeqence**: [TFunction<Consumes, Produces\>] \| [...TFunctionChain<Consumes, Z, X\>, TFunction<Z, Produces\>]

A Transform Sequence is a sequence that accept input, perform operations on it, and
outputs the result.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | any |
| `X` | extends any[] = any[] |

#### Defined in

[packages/types/src/sequence.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L31)

___

### UpstreamStreamsConfig

Ƭ **UpstreamStreamsConfig**: [stdin: ReadableStream<string\>, stdout: WritableStream<string\>, stderr: WritableStream<string\>, control: ReadableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: WritableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: ReadableStream<any\>, output: WritableStream<any\>, log: WritableStream<any\>, pkg?: ReadableStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends boolean = true |

#### Defined in

[packages/types/src/message-streams.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L131)

___

### WFunction

Ƭ **WFunction**: TFunction<Consumes, never\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Defined in

[packages/types/src/functions.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L27)

___

### WritableApp

Ƭ **WritableApp**: TransformApp<Consumes, VoidType, Z, S, AppConfigType, void\>

A Writable App is an app that accepts the data from the platform, performs any number
of transforms and then saves it to the data destination by it's own means.

**`interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | any |
| `Z` | extends any[] = any[] |
| `S` | extends any = any |
| `AppConfigType` | extends AppConfig = AppConfig |
| `VoidType` | void |

#### Defined in

[packages/types/src/application.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L51)

___

### WriteFunction

Ƭ **WriteFunction**: Function

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Type declaration

▸ (`stream`, ...`parameters`): MaybePromise<void\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | ReadableStream<Consumes\> |
| `...parameters` | any[] |

##### Returns

MaybePromise<void\>

#### Defined in

[packages/types/src/functions.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L15)

___

### WriteSequence

Ƭ **WriteSequence**: [WFunction<Consumes\>] \| [...TFunctionChain<Consumes, Z, Y\>, WFunction<Z\>]

A Sequence of functions that accept some input, transforms it through
a number of functions and writes to some destination.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Y` | extends any[] = any[] |
| `Z` | any |

#### Defined in

[packages/types/src/sequence.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L15)

## Namespaces

### MessageCodes

• **MessageCodes**: Namespace MessageCodes

#### Defined in

[packages/types/src/runner.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L27)

___

### STHRestAPI

• **STHRestAPI**: Namespace STHRestAPI

#### Defined in

[packages/types/src/sth-rest-api/index.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/index.ts#L1)

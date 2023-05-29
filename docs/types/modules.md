[@scramjet/types](README.md) / Exports

# @scramjet/types

## Table of contents

### Interfaces

- [APIBase](interfaces/APIBase.md)
- [APIError](interfaces/APIError.md)
- [APIExpose](interfaces/APIExpose.md)
- [APIRoute](interfaces/APIRoute.md)
- [AppContext](interfaces/AppContext.md)
- [ICommunicationHandler](interfaces/ICommunicationHandler.md)
- [IComponent](interfaces/IComponent.md)
- [IHostClient](interfaces/IHostClient.md)
- [ILifeCycleAdapter](interfaces/ILifeCycleAdapter.md)
- [ILifeCycleAdapterMain](interfaces/ILifeCycleAdapterMain.md)
- [ILifeCycleAdapterRun](interfaces/ILifeCycleAdapterRun.md)
- [IObjectLogger](interfaces/IObjectLogger.md)
- [ISequenceAdapter](interfaces/ISequenceAdapter.md)
- [ReadableStream](interfaces/ReadableStream.md)
- [WritableStream](interfaces/WritableStream.md)

### Type Aliases

- [APIErrorMessage](modules.md#apierrormessage)
- [AcknowledgeMessage](modules.md#acknowledgemessage)
- [AcknowledgeMessageData](modules.md#acknowledgemessagedata)
- [ApiVersion](modules.md#apiversion)
- [AppConfig](modules.md#appconfig)
- [AppError](modules.md#apperror)
- [AppErrorCode](modules.md#apperrorcode)
- [AppErrorConstructor](modules.md#apperrorconstructor)
- [Application](modules.md#application)
- [ApplicationExpose](modules.md#applicationexpose)
- [ApplicationFunction](modules.md#applicationfunction)
- [ApplicationInterface](modules.md#applicationinterface)
- [CPMConnectorOptions](modules.md#cpmconnectoroptions)
- [CPMMessage](modules.md#cpmmessage)
- [CPMMessageSTHID](modules.md#cpmmessagesthid)
- [CSIControllerErrorCode](modules.md#csicontrollererrorcode)
- [ContainerConfiguration](modules.md#containerconfiguration)
- [ContainerConfigurationWithExposedPorts](modules.md#containerconfigurationwithexposedports)
- [ControlMessageCode](modules.md#controlmessagecode)
- [ControlMessageHandler](modules.md#controlmessagehandler)
- [Decorator](modules.md#decorator)
- [DeepPartial](modules.md#deeppartial)
- [DescribeSequenceMessage](modules.md#describesequencemessage)
- [DescribeSequenceMessageData](modules.md#describesequencemessagedata)
- [DiskSpace](modules.md#diskspace)
- [DockerSequenceConfig](modules.md#dockersequenceconfig)
- [DownstreamStdioConfig](modules.md#downstreamstdioconfig)
- [DownstreamStreamsConfig](modules.md#downstreamstreamsconfig)
- [DuplexStream](modules.md#duplexstream)
- [EmptyMessageData](modules.md#emptymessagedata)
- [EncodedCPMSTHMessage](modules.md#encodedcpmsthmessage)
- [EncodedControlMessage](modules.md#encodedcontrolmessage)
- [EncodedMessage](modules.md#encodedmessage)
- [EncodedMonitoringMessage](modules.md#encodedmonitoringmessage)
- [EncodedSerializedControlMessage](modules.md#encodedserializedcontrolmessage)
- [EncodedSerializedMonitoringMessage](modules.md#encodedserializedmonitoringmessage)
- [ErrorMessage](modules.md#errormessage)
- [ErrorMessageData](modules.md#errormessagedata)
- [EventMessage](modules.md#eventmessage)
- [EventMessageData](modules.md#eventmessagedata)
- [ExitCode](modules.md#exitcode)
- [FunctionDefinition](modules.md#functiondefinition)
- [FunctionStatus](modules.md#functionstatus)
- [GetResolver](modules.md#getresolver)
- [HandshakeAcknowledgeMessage](modules.md#handshakeacknowledgemessage)
- [HandshakeAcknowledgeMessageData](modules.md#handshakeacknowledgemessagedata)
- [HandshakeMessage](modules.md#handshakemessage)
- [HasTopicInformation](modules.md#hastopicinformation)
- [HostConfig](modules.md#hostconfig)
- [HostErrorCode](modules.md#hosterrorcode)
- [HostProxy](modules.md#hostproxy)
- [HttpMethod](modules.md#httpmethod)
- [IdString](modules.md#idstring)
- [InertApp](modules.md#inertapp)
- [InertSequence](modules.md#inertsequence)
- [Instance](modules.md#instance)
- [InstanceAdapterErrorCode](modules.md#instanceadaptererrorcode)
- [InstanceArgs](modules.md#instanceargs)
- [InstanceBulkMessage](modules.md#instancebulkmessage)
- [InstanceConfig](modules.md#instanceconfig)
- [InstanceId](modules.md#instanceid)
- [InstanceInputStream](modules.md#instanceinputstream)
- [InstanceLimits](modules.md#instancelimits)
- [InstanceMessage](modules.md#instancemessage)
- [InstanceMessageData](modules.md#instancemessagedata)
- [InstanceOutputStream](modules.md#instanceoutputstream)
- [InstanceRequirements](modules.md#instancerequirements)
- [InstanceStats](modules.md#instancestats)
- [K8SAdapterConfiguration](modules.md#k8sadapterconfiguration)
- [KeepAliveMessage](modules.md#keepalivemessage)
- [KeepAliveMessageData](modules.md#keepalivemessagedata)
- [KillHandler](modules.md#killhandler)
- [KillMessageData](modules.md#killmessagedata)
- [KillSequenceMessage](modules.md#killsequencemessage)
- [KubernetesSequenceConfig](modules.md#kubernetessequenceconfig)
- [LifeCycleError](modules.md#lifecycleerror)
- [LoadCheckContstants](modules.md#loadcheckcontstants)
- [LoadCheckRequirements](modules.md#loadcheckrequirements)
- [LoadCheckStat](modules.md#loadcheckstat)
- [LoadCheckStatMessage](modules.md#loadcheckstatmessage)
- [LogEntry](modules.md#logentry)
- [LogLevel](modules.md#loglevel)
- [Logger](modules.md#logger)
- [LoggerOptions](modules.md#loggeroptions)
- [LoggerOutput](modules.md#loggeroutput)
- [ManagerConfiguration](modules.md#managerconfiguration)
- [Message](modules.md#message)
- [MessageCode](modules.md#messagecode)
- [MessageDataType](modules.md#messagedatatype)
- [MessageType](modules.md#messagetype)
- [Middleware](modules.md#middleware)
- [MonitoringHandler](modules.md#monitoringhandler)
- [MonitoringMessage](modules.md#monitoringmessage)
- [MonitoringMessageCode](modules.md#monitoringmessagecode)
- [MonitoringMessageData](modules.md#monitoringmessagedata)
- [MonitoringMessageFromRunnerData](modules.md#monitoringmessagefromrunnerdata)
- [MonitoringMessageHandler](modules.md#monitoringmessagehandler)
- [MonitoringRateMessage](modules.md#monitoringratemessage)
- [MonitoringRateMessageData](modules.md#monitoringratemessagedata)
- [MutatingMonitoringMessageHandler](modules.md#mutatingmonitoringmessagehandler)
- [NetworkInfo](modules.md#networkinfo)
- [NetworkInfoMessage](modules.md#networkinfomessage)
- [NextCallback](modules.md#nextcallback)
- [OpOptions](modules.md#opoptions)
- [OpRecord](modules.md#oprecord)
- [OpResolver](modules.md#opresolver)
- [OpResponse](modules.md#opresponse)
- [PangMessageData](modules.md#pangmessagedata)
- [ParsedMessage](modules.md#parsedmessage)
- [PassThoughStream](modules.md#passthoughstream)
- [PassThroughStreamsConfig](modules.md#passthroughstreamsconfig)
- [PingMessageData](modules.md#pingmessagedata)
- [Port](modules.md#port)
- [PortConfig](modules.md#portconfig)
- [PreRunnerContainerConfiguration](modules.md#prerunnercontainerconfiguration)
- [ProcessSequenceConfig](modules.md#processsequenceconfig)
- [PublicSTHConfiguration](modules.md#publicsthconfiguration)
- [RFunction](modules.md#rfunction)
- [ReadFunction](modules.md#readfunction)
- [ReadSequence](modules.md#readsequence)
- [ReadableApp](modules.md#readableapp)
- [RunnerContainerConfiguration](modules.md#runnercontainerconfiguration)
- [RunnerErrorCode](modules.md#runnererrorcode)
- [RunnerMessage](modules.md#runnermessage)
- [RunnerOptions](modules.md#runneroptions)
- [STHCommandOptions](modules.md#sthcommandoptions)
- [STHConfiguration](modules.md#sthconfiguration)
- [STHIDMessageData](modules.md#sthidmessagedata)
- [SequenceAdapterErrorCode](modules.md#sequenceadaptererrorcode)
- [SequenceBulkMessage](modules.md#sequencebulkmessage)
- [SequenceCompleteMessage](modules.md#sequencecompletemessage)
- [SequenceConfig](modules.md#sequenceconfig)
- [SequenceEndMessage](modules.md#sequenceendmessage)
- [SequenceEndMessageData](modules.md#sequenceendmessagedata)
- [SequenceInfo](modules.md#sequenceinfo)
- [SequenceMessage](modules.md#sequencemessage)
- [SequenceMessageData](modules.md#sequencemessagedata)
- [SequencePackageJSON](modules.md#sequencepackagejson)
- [SequencePackageJSONScramjetConfig](modules.md#sequencepackagejsonscramjetconfig)
- [SequencePackageJSONScramjetSection](modules.md#sequencepackagejsonscramjetsection)
- [SequenceStoppedMessageData](modules.md#sequencestoppedmessagedata)
- [StartSequenceDTO](modules.md#startsequencedto)
- [StatusMessage](modules.md#statusmessage)
- [StatusMessageData](modules.md#statusmessagedata)
- [StopHandler](modules.md#stophandler)
- [StopSequenceMessage](modules.md#stopsequencemessage)
- [StopSequenceMessageData](modules.md#stopsequencemessagedata)
- [StreamConfig](modules.md#streamconfig)
- [StreamInput](modules.md#streaminput)
- [StreamOutput](modules.md#streamoutput)
- [Streamable](modules.md#streamable)
- [SynchronousStreamable](modules.md#synchronousstreamable)
- [SynchronousStreamablePayload](modules.md#synchronousstreamablepayload)
- [TFunction](modules.md#tfunction)
- [TFunctionChain](modules.md#tfunctionchain)
- [TelemetryAdaptersConfig](modules.md#telemetryadaptersconfig)
- [TelemetryConfig](modules.md#telemetryconfig)
- [TranformFunction](modules.md#tranformfunction)
- [TransformApp](modules.md#transformapp)
- [TransformAppAcceptableSequence](modules.md#transformappacceptablesequence)
- [TransformSeqence](modules.md#transformseqence)
- [UpstreamStreamsConfig](modules.md#upstreamstreamsconfig)
- [UrlPath](modules.md#urlpath)
- [ValidationResult](modules.md#validationresult)
- [ValidationSchema](modules.md#validationschema)
- [Validator](modules.md#validator)
- [WFunction](modules.md#wfunction)
- [WritableApp](modules.md#writableapp)
- [WriteFunction](modules.md#writefunction)
- [WriteSequence](modules.md#writesequence)

### Classes

- [ClientProvider](classes/ClientProvider.md)
- [HostClient](classes/HostClient.md)
- [InstanceClient](classes/InstanceClient.md)
- [SequenceClient](classes/SequenceClient.md)

### Enumerations

- [InstanceStatus](enums/InstanceStatus.md)

### Namespaces

- [MHRestAPI](modules/MHRestAPI.md)
- [MMRestAPI](modules/MMRestAPI.md)
- [MRestAPI](modules/MRestAPI.md)
- [MWRestAPI](modules/MWRestAPI.md)
- [MessageCodes](modules/MessageCodes.md)
- [STHRestAPI](modules/STHRestAPI.md)

## Type Aliases

### APIErrorMessage

Ƭ **APIErrorMessage**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `code` | `APIErrorCode` | A unique reference number for a given error type. |
| `message` | `string` | An error message describing the potential cause of the error and possibly a way how to fix it. |
| `url?` | `string` | A link to the detail information about the error. |

#### Defined in

[packages/types/src/rest-api-error/rest-api-error.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-error/rest-api-error.ts#L3)

___

### AcknowledgeMessage

Ƭ **AcknowledgeMessage**: { `msgCode`: `RunnerMessageCode.ACKNOWLEDGE`  } & [`AcknowledgeMessageData`](modules.md#acknowledgemessagedata)

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
| `acknowledged` | `boolean` | Indicates whether a message was received. |
| `errorMsg?` | [`ErrorMessage`](modules.md#errormessage) | Describes an error message if error was thrown after performing a requested operation. |
| `status?` | `number` | Indicates status of the performed operation. |

#### Defined in

[packages/types/src/messages/acknowledge.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/acknowledge.ts#L4)

___

### ApiVersion

Ƭ **ApiVersion**: `string`

#### Defined in

[packages/types/src/utils.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L117)

___

### AppConfig

Ƭ **AppConfig**: `Object`

App configuration primitive.

#### Index signature

▪ [key: `string`]: `MaybeArray`<`SimpleType`\> \| `MaybeArray`<[`AppConfig`](modules.md#appconfig)\>

#### Defined in

[packages/types/src/app-config.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-config.ts#L10)

___

### AppError

Ƭ **AppError**: `Error` & { `code`: [`AppErrorCode`](modules.md#apperrorcode) ; `exitcode?`: `number`  }

Application error class

#### Defined in

[packages/types/src/error-codes/app-error.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L25)

___

### AppErrorCode

Ƭ **AppErrorCode**: ``"GENERAL_ERROR"`` \| ``"COMPILE_ERROR"`` \| ``"CONTEXT_NOT_INITIALIZED"`` \| ``"SEQUENCE_RUN_BEFORE_INIT"`` \| ``"SEQUENCE_MISCONFIGURED"`` \| [`CSIControllerErrorCode`](modules.md#csicontrollererrorcode) \| [`HostErrorCode`](modules.md#hosterrorcode) \| [`InstanceAdapterErrorCode`](modules.md#instanceadaptererrorcode) \| [`SequenceAdapterErrorCode`](modules.md#sequenceadaptererrorcode) \| [`RunnerErrorCode`](modules.md#runnererrorcode)

Acceptable error codes

#### Defined in

[packages/types/src/error-codes/app-error.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L10)

___

### AppErrorConstructor

Ƭ **AppErrorConstructor**: (`code`: [`AppErrorCode`](modules.md#apperrorcode), `message?`: `string`) => [`AppError`](modules.md#apperror)

#### Type declaration

• (`code`, `message?`)

Constructs an AppError

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `code` | [`AppErrorCode`](modules.md#apperrorcode) | One of the predefined error codes |
| `message?` | `string` | Optional additional explanatory message |

#### Defined in

[packages/types/src/error-codes/app-error.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/app-error.ts#L36)

___

### Application

Ƭ **Application**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\>: [`TransformApp`](modules.md#transformapp)<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\> \| [`ReadableApp`](modules.md#readableapp)<`Produces`, `Z`, `S`, `AppConfigType`\> \| [`WritableApp`](modules.md#writableapp)<`Consumes`, `Z`, `S`, `AppConfigType`\> \| [`InertApp`](modules.md#inertapp)<`Z`, `S`\>

Application is an acceptable input for the runner.

**`Interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |

#### Defined in

[packages/types/src/application.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L79)

___

### ApplicationExpose

Ƭ **ApplicationExpose**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `[exposeSequenceSymbol]` | [`Application`](modules.md#application)<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`\> |

#### Defined in

[packages/types/src/application.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L91)

___

### ApplicationFunction

Ƭ **ApplicationFunction**: [`ReadableApp`](modules.md#readableapp) \| [`WritableApp`](modules.md#writableapp) \| [`TransformApp`](modules.md#transformapp) \| [`InertApp`](modules.md#inertapp)

#### Defined in

[packages/types/src/application.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L71)

___

### ApplicationInterface

Ƭ **ApplicationInterface**: (`this`: [`AppContext`](interfaces/AppContext.md)<[`AppConfig`](modules.md#appconfig), `any`\>, `source`: [`ReadableStream`](interfaces/ReadableStream.md)<`any`\>, ...`argv`: `any`[]) => `MaybePromise`<[`Streamable`](modules.md#streamable)<`any`\> \| `void`\>

#### Type declaration

▸ (`this`, `source`, `...argv`): `MaybePromise`<[`Streamable`](modules.md#streamable)<`any`\> \| `void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`AppContext`](interfaces/AppContext.md)<[`AppConfig`](modules.md#appconfig), `any`\> |
| `source` | [`ReadableStream`](interfaces/ReadableStream.md)<`any`\> |
| `...argv` | `any`[] |

##### Returns

`MaybePromise`<[`Streamable`](modules.md#streamable)<`any`\> \| `void`\>

#### Defined in

[packages/types/src/application.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L6)

___

### CPMConnectorOptions

Ƭ **CPMConnectorOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `apiKey?` | `string` |
| `apiVersion` | `string` |
| `cpmSslCaPath?` | [`STHConfiguration`](modules.md#sthconfiguration)[``"cpmSslCaPath"``] |
| `description` | [`STHConfiguration`](modules.md#sthconfiguration)[``"description"``] |
| `hostType?` | `NonNullable`<[`STHConfiguration`](modules.md#sthconfiguration)[``"platform"``]\>[``"hostType"``] |
| `id` | [`STHConfiguration`](modules.md#sthconfiguration)[``"host"``][``"id"``] |
| `infoFilePath` | [`STHConfiguration`](modules.md#sthconfiguration)[``"host"``][``"infoFilePath"``] |
| `maxReconnections` | [`STHConfiguration`](modules.md#sthconfiguration)[``"cpm"``][``"maxReconnections"``] |
| `reconnectionDelay` | [`STHConfiguration`](modules.md#sthconfiguration)[``"cpm"``][``"reconnectionDelay"``] |
| `selfHosted` | [`STHConfiguration`](modules.md#sthconfiguration)[``"selfHosted"``] |
| `tags` | [`STHConfiguration`](modules.md#sthconfiguration)[``"tags"``] |

#### Defined in

[packages/types/src/cpm-connector.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/cpm-connector.ts#L3)

___

### CPMMessage

Ƭ **CPMMessage**: [`CPMMessageCode`, `object`]

#### Defined in

[packages/types/src/runner.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L53)

___

### CPMMessageSTHID

Ƭ **CPMMessageSTHID**: { `msgCode`: `CPMMessageCode.STH_ID`  } & [`STHIDMessageData`](modules.md#sthidmessagedata)

#### Defined in

[packages/types/src/messages/sth-id.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sth-id.ts#L7)

___

### CSIControllerErrorCode

Ƭ **CSIControllerErrorCode**: ``"UNINITIALIZED_STREAM"`` \| ``"UNATTACHED_STREAMS"`` \| ``"NO_CHILD_PROCESS"``

#### Defined in

[packages/types/src/error-codes/csi-controller-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/csi-controller-error.ts#L1)

___

### ContainerConfiguration

Ƭ **ContainerConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `image` | `string` | Docker image to use. |
| `maxMem` | `number` | Maximum memory container can allocate (megabytes). |

#### Defined in

[packages/types/src/sth-configuration.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L4)

___

### ContainerConfigurationWithExposedPorts

Ƭ **ContainerConfigurationWithExposedPorts**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `exposePortsRange` | [`number`, `number`] | Host port number that the container's port is mapped to. |
| `hostIp` | `string` | Host IP address that the container's port is mapped to. |

#### Defined in

[packages/types/src/sth-configuration.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L16)

___

### ControlMessageCode

Ƭ **ControlMessageCode**: `RunnerMessageCode.KILL` \| `RunnerMessageCode.MONITORING_RATE` \| `RunnerMessageCode.STOP` \| `RunnerMessageCode.EVENT` \| `RunnerMessageCode.PONG` \| `CPMMessageCode.STH_ID` \| `CPMMessageCode.KEY_REVOKED` \| `CPMMessageCode.LIMIT_EXCEEDED` \| `CPMMessageCode.ID_DROP` \| `RunnerMessageCode.INPUT_CONTENT_TYPE`

#### Defined in

[packages/types/src/message-streams.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L95)

___

### ControlMessageHandler

Ƭ **ControlMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](modules.md#encodedmessage)<`T`\>) => `MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](modules.md#controlmessagecode) |

#### Type declaration

▸ (`msg`): `MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](modules.md#encodedmessage)<`T`\> |

##### Returns

`MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

#### Defined in

[packages/types/src/communication-handler.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L15)

___

### Decorator

Ƭ **Decorator**: (`req`: `IncomingMessage`) => `MaybePromise`<`void`\>

#### Type declaration

▸ (`req`): `MaybePromise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `IncomingMessage` |

##### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/api-expose.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L22)

___

### DeepPartial

Ƭ **DeepPartial**<`T`\>: { [K in keyof T]?: DeepPartial<T[K]\> }

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/utils.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L107)

___

### DescribeSequenceMessage

Ƭ **DescribeSequenceMessage**: { `msgCode`: `RunnerMessageCode.DESCRIBE_SEQUENCE`  } & [`DescribeSequenceMessageData`](modules.md#describesequencemessagedata)

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
| `definition?` | [`FunctionDefinition`](modules.md#functiondefinition)[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L49)

___

### DiskSpace

Ƭ **DiskSpace**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `available` | `number` |
| `fs` | `string` |
| `mount?` | `string` |
| `size` | `number` |
| `type?` | `string` |
| `use` | `number` |
| `used` | `number` |

#### Defined in

[packages/types/src/load-check-stat.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L1)

___

### DockerSequenceConfig

Ƭ **DockerSequenceConfig**: `CommonSequenceConfig` & { `config?`: { `ports?`: [`PortConfig`](modules.md#portconfig)[] \| ``null``  } ; `container`: [`RunnerContainerConfiguration`](modules.md#runnercontainerconfiguration) ; `type`: ``"docker"``  }

#### Defined in

[packages/types/src/runner-config.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L32)

___

### DownstreamStdioConfig

Ƭ **DownstreamStdioConfig**: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>]

#### Defined in

[packages/types/src/message-streams.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L129)

___

### DownstreamStreamsConfig

Ƭ **DownstreamStreamsConfig**<`serialized`\>: [stdin: WritableStream<string\>, stdout: ReadableStream<string\>, stderr: ReadableStream<string\>, control: WritableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: ReadableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: WritableStream<any\>, output: ReadableStream<any\>, log: ReadableStream<any\>, pkg?: WritableStream<Buffer\> \| undefined]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean` = ``true`` |

#### Defined in

[packages/types/src/message-streams.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L116)

___

### DuplexStream

Ƭ **DuplexStream**<`Consumes`, `Produces`\>: [`WritableStream`](interfaces/WritableStream.md)<`Consumes`\> & [`ReadableStream`](interfaces/ReadableStream.md)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L65)

___

### EmptyMessageData

Ƭ **EmptyMessageData**: `Object`

#### Defined in

[packages/types/src/messages/message.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/message.ts#L16)

___

### EncodedCPMSTHMessage

Ƭ **EncodedCPMSTHMessage**: [`EncodedMessage`](modules.md#encodedmessage)<`CPMMessageCode`\>

#### Defined in

[packages/types/src/message-streams.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L114)

___

### EncodedControlMessage

Ƭ **EncodedControlMessage**: [`EncodedMessage`](modules.md#encodedmessage)<[`ControlMessageCode`](modules.md#controlmessagecode)\>

#### Defined in

[packages/types/src/message-streams.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L101)

___

### EncodedMessage

Ƭ **EncodedMessage**<`T`\>: [`T`, [`MessageDataType`](modules.md#messagedatatype)<`T`\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Defined in

[packages/types/src/message-streams.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L91)

___

### EncodedMonitoringMessage

Ƭ **EncodedMonitoringMessage**: [`EncodedMessage`](modules.md#encodedmessage)<[`MonitoringMessageCode`](modules.md#monitoringmessagecode)\>

#### Defined in

[packages/types/src/message-streams.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L113)

___

### EncodedSerializedControlMessage

Ƭ **EncodedSerializedControlMessage**: `string`

#### Defined in

[packages/types/src/message-streams.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L110)

___

### EncodedSerializedMonitoringMessage

Ƭ **EncodedSerializedMonitoringMessage**: `string`

#### Defined in

[packages/types/src/message-streams.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L111)

___

### ErrorMessage

Ƭ **ErrorMessage**: { `msgCode`: `RunnerMessageCode.ERROR`  } & [`ErrorMessageData`](modules.md#errormessagedata)

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
| `errorCode` | `number` | Error's status code |
| `exitCode` | `number` | The operation's exit code. |
| `message` | `string` | Error message. |
| `stack` | `string` | Error stack trace. |

#### Defined in

[packages/types/src/messages/error.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/error.ts#L3)

___

### EventMessage

Ƭ **EventMessage**: { `msgCode`: `RunnerMessageCode.EVENT`  } & [`EventMessageData`](modules.md#eventmessagedata)

TODO update
Event message emitted by Sequence and handled in the context.

#### Defined in

[packages/types/src/messages/event.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/event.ts#L16)

___

### EventMessageData

Ƭ **EventMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Name of the event. |
| `message` | `any` | TODO update Informs if keepAlive can be called to prolong the running of the Sequence. |

#### Defined in

[packages/types/src/messages/event.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/event.ts#L3)

___

### ExitCode

Ƭ **ExitCode**: `number`

#### Defined in

[packages/types/src/lifecycle-adapters.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L7)

___

### FunctionDefinition

Ƭ **FunctionDefinition**: `Object`

Definition that informs the platform of the details of a single function.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `description?` | `string` | Additional description of the function |
| `mode` | ``"buffer"`` \| ``"object"`` \| ``"reference"`` | Stream mode: * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets * object - carries any type of object, that is serializable via JSON or analogue * reference - carries non-serializable object references that should not be passed outside of a single process |
| `name?` | `string` | Optional name for the function (which will be shown in UI/CLI) |
| `scalability?` | { `head?`: `ScalabilityOptions` ; `tail?`: `ScalabilityOptions`  } | Describes how head (readable side) and tail (writable side) of this Function can be scaled to other machines. |
| `scalability.head?` | `ScalabilityOptions` | Writable side scalability |
| `scalability.tail?` | `ScalabilityOptions` | Readable side scalability |

#### Defined in

[packages/types/src/messages/describe-sequence.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/describe-sequence.ts#L16)

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

[packages/types/src/runner.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L6)

___

### GetResolver

Ƭ **GetResolver**: (`req`: [`ParsedMessage`](modules.md#parsedmessage)) => `MaybePromise`<`any`\>

#### Type declaration

▸ (`req`): `MaybePromise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`ParsedMessage`](modules.md#parsedmessage) |

##### Returns

`MaybePromise`<`any`\>

#### Defined in

[packages/types/src/api-expose.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L16)

___

### HandshakeAcknowledgeMessage

Ƭ **HandshakeAcknowledgeMessage**: { `msgCode`: `RunnerMessageCode.PONG`  } & [`HandshakeAcknowledgeMessageData`](modules.md#handshakeacknowledgemessagedata)

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
| `appConfig` | [`AppConfig`](modules.md#appconfig) | Sequence configuration passed to the Sequence when it is started by the Runner. |
| `args?` | `any`[] | - |

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
| `msgCode` | `RunnerMessageCode.PING` |

#### Defined in

[packages/types/src/messages/handshake.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L8)

___

### HasTopicInformation

Ƭ **HasTopicInformation**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType?` | `string` |
| `topic?` | `string` |

#### Defined in

[packages/types/src/utils.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L81)

___

### HostConfig

Ƭ **HostConfig**: `Object`

Host process configuration.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiBase` | `string` | API URL. |
| `hostname` | `string` | Hostname. |
| `id?` | `string` | Custom host identifier. |
| `infoFilePath` | `string` | Host information filepath. |
| `instancesServerPort` | `number` | Port number for connecting Instances. |
| `port` | `number` | API port. |

#### Defined in

[packages/types/src/sth-configuration.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L41)

___

### HostErrorCode

Ƭ **HostErrorCode**: ``"UNINITIALIZED_STREAM"`` \| ``"UNATTACHED_STREAMS"`` \| ``"UNKNOWN_CHANNEL"`` \| ``"LOG_NOT_AVAILABLE"`` \| ``"SEQUENCE_IDENTIFICATION_FAILED"`` \| ``"UNKNOWN_SEQUENCE"`` \| ``"UNKNOWN_INSTANCE"`` \| ``"EVENT_NAME_MISSING"`` \| ``"CONTROLLER_ERROR"`` \| ``"SOCKET_TAKEN"`` \| ``"API_CONFIGURATION_ERROR"`` \| ``"SEQUENCE_STARTUP_CONFIG_READ_ERROR"`` \| ``"CPM_CONFIGURATION_ERROR"``

#### Defined in

[packages/types/src/error-codes/host-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/host-error.ts#L1)

___

### HostProxy

Ƭ **HostProxy**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `onInstanceRequest` | (`socket`: `Duplex`) => `void` |

#### Defined in

[packages/types/src/host-proxy.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/host-proxy.ts#L3)

___

### HttpMethod

Ƭ **HttpMethod**: ``"get"`` \| ``"head"`` \| ``"post"`` \| ``"put"`` \| ``"delete"`` \| ``"connect"`` \| ``"trace"`` \| ``"patch"``

#### Defined in

[packages/types/src/api-expose.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L10)

___

### IdString

Ƭ **IdString**: `string`

#### Defined in

[packages/types/src/utils.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L111)

___

### InertApp

Ƭ **InertApp**<`Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](modules.md#transformapp)<`VoidType`, `VoidType`, `Z`, `S`, `AppConfigType`, `void`\>

An Inert App is an app that doesn't accept data from the platform and doesn't output it.

**`Interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L64)

___

### InertSequence

Ƭ **InertSequence**<`Z`, `Y`, `X`\>: [`TFunctionChain`](modules.md#tfunctionchain)<`Y`, `Z`, `X`\>

Minimal type of Sequence that doesn't read anything from the outside, doesn't
write anything to outside. It may be doing anything, but it's not able to report
the progress via streaming.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | `any` |
| `Y` | `any` |
| `X` | extends `any`[] = `any`[] |

#### Defined in

[packages/types/src/sequence.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L9)

___

### Instance

Ƭ **Instance**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `appConfig?` | [`AppConfig`](modules.md#appconfig) |
| `args?` | [`InstanceArgs`](modules.md#instanceargs) |
| `created?` | `Date` |
| `ended?` | `Date` |
| `id` | [`InstanceId`](modules.md#instanceid) |
| `ports?` | `Record`<`string`, `number`\> |
| `sequence` | `string` |
| `started?` | `Date` |
| `status?` | [`InstanceStatus`](enums/InstanceStatus.md) |
| `terminated?` | { `exitcode`: `number` ; `reason`: `string`  } |
| `terminated.exitcode` | `number` |
| `terminated.reason` | `string` |

#### Defined in

[packages/types/src/instance-store.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance-store.ts#L6)

___

### InstanceAdapterErrorCode

Ƭ **InstanceAdapterErrorCode**: ``"INVALID_CONFIGURATION"`` \| ``"UNINITIALIZED_STREAMS"`` \| ``"GENERAL_ERROR"`` \| ``"SEQUENCE_RUN_BEFORE_INIT"`` \| ``"RUNNER_ERROR"`` \| ``"RUNNER_NON_ZERO_EXITCODE"`` \| ``"RUNNER_NOT_STARTED"`` \| ``"DOCKER_ERROR"`` \| ``"PRERUNNER_ERROR"``

#### Defined in

[packages/types/src/error-codes/instance-adapter-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/instance-adapter-error.ts#L1)

___

### InstanceArgs

Ƭ **InstanceArgs**: `any`[]

#### Defined in

[packages/types/src/instance-store.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance-store.ts#L4)

___

### InstanceBulkMessage

Ƭ **InstanceBulkMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `instances` | [`InstanceMessageData`](modules.md#instancemessagedata)[] |
| `msgCode` | `CPMMessageCode.INSTANCES` |

#### Defined in

[packages/types/src/messages/instance.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L10)

___

### InstanceConfig

Ƭ **InstanceConfig**: [`SequenceConfig`](modules.md#sequenceconfig) & { `instanceAdapterExitDelay`: `number` ; `limits`: [`InstanceLimits`](modules.md#instancelimits)  }

#### Defined in

[packages/types/src/runner-config.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L50)

___

### InstanceId

Ƭ **InstanceId**: `string`

#### Defined in

[packages/types/src/instance.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance.ts#L1)

___

### InstanceInputStream

Ƭ **InstanceInputStream**: ``"stdin"`` \| ``"input"``

#### Defined in

[packages/types/src/api-client/host-client.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L10)

___

### InstanceLimits

Ƭ **InstanceLimits**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `memory?` | `number` |

#### Defined in

[packages/types/src/instance-limits.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance-limits.ts#L1)

___

### InstanceMessage

Ƭ **InstanceMessage**: { `msgCode`: `CPMMessageCode.INSTANCE`  } & [`InstanceMessageData`](modules.md#instancemessagedata)

#### Defined in

[packages/types/src/messages/instance.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L9)

___

### InstanceMessageData

Ƭ **InstanceMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `sequence` | `string` |
| `status` | `InstanceMessageCode` |

#### Defined in

[packages/types/src/messages/instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/instance.ts#L3)

___

### InstanceOutputStream

Ƭ **InstanceOutputStream**: ``"stdout"`` \| ``"stderr"`` \| ``"output"`` \| ``"log"``

#### Defined in

[packages/types/src/api-client/host-client.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-client/host-client.ts#L11)

___

### InstanceRequirements

Ƭ **InstanceRequirements**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpuLoad` | `number` | Required free CPU. In percentage. |
| `freeMem` | `number` | Free memory required to start Manager instance. In megabytes. |
| `freeSpace` | `number` | Free disk space required to start instance. In megabytes. |

#### Defined in

[packages/types/src/load-check-stat.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L24)

___

### InstanceStats

Ƭ **InstanceStats**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `current` | { `cpu?`: `number` ; `memory?`: `number`  } |
| `current.cpu?` | `number` |
| `current.memory?` | `number` |
| `limits` | [`InstanceLimits`](modules.md#instancelimits) |

#### Defined in

[packages/types/src/instance-stats.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/instance-stats.ts#L3)

___

### K8SAdapterConfiguration

Ƭ **K8SAdapterConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `authConfigPath?` | `string` | Authentication configuration path |
| `namespace` | `string` | The Kubernetes namespace to use for running sequences |
| `quotaName?` | `string` | Quota object name to determine namespace limits. |
| `runnerImages` | { `node`: `string` ; `python3`: `string`  } | Runner images to use |
| `runnerImages.node` | `string` | - |
| `runnerImages.python3` | `string` | - |
| `runnerResourcesLimitsCpu?` | `string` | - |
| `runnerResourcesLimitsMemory?` | `string` | - |
| `runnerResourcesRequestsCpu?` | `string` | - |
| `runnerResourcesRequestsMemory?` | `string` | - |
| `sequencesRoot` | `string` | Path to store sequences |
| `sthPodHost` | `string` | The host where to start STH Pods |
| `timeout?` | `string` | - |

#### Defined in

[packages/types/src/sth-configuration.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L73)

___

### KeepAliveMessage

Ƭ **KeepAliveMessage**: { `msgCode`: `RunnerMessageCode.ALIVE`  } & [`KeepAliveMessageData`](modules.md#keepalivemessagedata)

Message instructing how much longer to keep Sequence alive.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/keep-alive.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/keep-alive.ts#L13)

___

### KeepAliveMessageData

Ƭ **KeepAliveMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `keepAlive` | `number` | Information on how much longer the Sequence will be active (in milliseconds). |

#### Defined in

[packages/types/src/messages/keep-alive.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/keep-alive.ts#L3)

___

### KillHandler

Ƭ **KillHandler**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/types/src/app-context.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L21)

___

### KillMessageData

Ƭ **KillMessageData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `removeImmediately?` | `boolean` | Bypass waiting. |

#### Defined in

[packages/types/src/messages/kill-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/kill-sequence.ts#L3)

___

### KillSequenceMessage

Ƭ **KillSequenceMessage**: { `msgCode`: `RunnerMessageCode.KILL`  } & [`KillMessageData`](modules.md#killmessagedata)

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from CSIController.

#### Defined in

[packages/types/src/messages/kill-sequence.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/kill-sequence.ts#L15)

___

### KubernetesSequenceConfig

Ƭ **KubernetesSequenceConfig**: `CommonSequenceConfig` & { `type`: ``"kubernetes"``  }

#### Defined in

[packages/types/src/runner-config.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L44)

___

### LifeCycleError

Ƭ **LifeCycleError**: `any` \| `Error` & { `errorMessage?`: `string` ; `exitCode?`: `number`  }

#### Defined in

[packages/types/src/lifecycle-adapters.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L46)

___

### LoadCheckContstants

Ƭ **LoadCheckContstants**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `MIN_INSTANCE_REQUIREMENTS` | { `cpuLoad`: `number` ; `freeMem`: `number` ; `freeSpace`: `number`  } |
| `MIN_INSTANCE_REQUIREMENTS.cpuLoad` | `number` |
| `MIN_INSTANCE_REQUIREMENTS.freeMem` | `number` |
| `MIN_INSTANCE_REQUIREMENTS.freeSpace` | `number` |
| `SAFE_OPERATION_LIMIT` | `number` |

#### Defined in

[packages/types/src/load-check-stat.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L50)

___

### LoadCheckRequirements

Ƭ **LoadCheckRequirements**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceRequirements` | [`InstanceRequirements`](modules.md#instancerequirements) | Minimum requirements to start new Manager instance. |
| `safeOperationLimit` | `number` | The amount of memory that must remain free. |

#### Defined in

[packages/types/src/load-check-stat.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L39)

___

### LoadCheckStat

Ƭ **LoadCheckStat**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `avgLoad` | `number` |
| `currentLoad` | `number` |
| `fsSize` | [`DiskSpace`](modules.md#diskspace)[] |
| `memFree` | `number` |
| `memUsed` | `number` |

#### Defined in

[packages/types/src/load-check-stat.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/load-check-stat.ts#L11)

___

### LoadCheckStatMessage

Ƭ **LoadCheckStatMessage**: { `msgCode`: `CPMMessageCode.LOAD`  } & [`LoadCheckStat`](modules.md#loadcheckstat)

#### Defined in

[packages/types/src/messages/load.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/load.ts#L4)

___

### LogEntry

Ƭ **LogEntry**: `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\>

Single log entry.

#### Defined in

[packages/types/src/object-logger.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L10)

___

### LogLevel

Ƭ **LogLevel**: ``"ERROR"`` \| ``"WARN"`` \| ``"INFO"`` \| ``"DEBUG"`` \| ``"FATAL"`` \| ``"TRACE"``

#### Defined in

[packages/types/src/object-logger.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L5)

___

### Logger

Ƭ **Logger**: `Console`

#### Defined in

[packages/types/src/logger.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L15)

___

### LoggerOptions

Ƭ **LoggerOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `useCallsite?` | `boolean` | Should we show callsites to show originating line |

#### Defined in

[packages/types/src/logger.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L10)

___

### LoggerOutput

Ƭ **LoggerOutput**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `err?` | [`WritableStream`](interfaces/WritableStream.md)<`any`\> | Error stream |
| `out` | [`WritableStream`](interfaces/WritableStream.md)<`any`\> | Output stream |

#### Defined in

[packages/types/src/logger.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/logger.ts#L3)

___

### ManagerConfiguration

Ƭ **ManagerConfiguration**: `Object`

Manager configuration type definition.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiBase` | `string` | MultiManager api base. |
| `id` | [`IdString`](modules.md#idstring) | Manager id. |
| `logColors` | `boolean` | Enables/disables colorized logs. |
| `s3?` | { `accessKey`: `string` ; `bucket`: `string` ; `bucketLimit`: `number` ; `endPoint`: `string` ; `port`: `number` ; `region`: `string` ; `secretKey`: `string` ; `useSSL`: `boolean`  } | - |
| `s3.accessKey` | `string` | - |
| `s3.bucket` | `string` | - |
| `s3.bucketLimit` | `number` | - |
| `s3.endPoint` | `string` | - |
| `s3.port` | `number` | - |
| `s3.region` | `string` | - |
| `s3.secretKey` | `string` | - |
| `s3.useSSL` | `boolean` | - |
| `sthController` | { `unhealthyTimeoutMs`: `number`  } | Host controller configuration. |
| `sthController.unhealthyTimeoutMs` | `number` | Number of milliseconds to wait for next LOAD message from `host` before marking it as unhealthy |

#### Defined in

[packages/types/src/manager-configuration.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/manager-configuration.ts#L6)

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

[packages/types/src/messages/message.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/message.ts#L10)

___

### MessageCode

Ƭ **MessageCode**: [`ANY`](modules/MessageCodes.md#any)

#### Defined in

[packages/types/src/runner.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L42)

___

### MessageDataType

Ƭ **MessageDataType**<`T`\>: `T` extends `RunnerMessageCode.ACKNOWLEDGE` ? [`AcknowledgeMessageData`](modules.md#acknowledgemessagedata) : `T` extends `RunnerMessageCode.ALIVE` ? [`KeepAliveMessageData`](modules.md#keepalivemessagedata) : `T` extends `RunnerMessageCode.DESCRIBE_SEQUENCE` ? [`DescribeSequenceMessageData`](modules.md#describesequencemessagedata) : `T` extends `RunnerMessageCode.STATUS` ? [`StatusMessageData`](modules.md#statusmessagedata) : `T` extends `RunnerMessageCode.ERROR` ? [`ErrorMessageData`](modules.md#errormessagedata) : `T` extends `RunnerMessageCode.KILL` ? [`KillMessageData`](modules.md#killmessagedata) : `T` extends `RunnerMessageCode.MONITORING` ? [`MonitoringMessageData`](modules.md#monitoringmessagedata) : `T` extends `RunnerMessageCode.MONITORING_RATE` ? [`MonitoringRateMessageData`](modules.md#monitoringratemessagedata) : `T` extends `RunnerMessageCode.STOP` ? [`StopSequenceMessageData`](modules.md#stopsequencemessagedata) : `T` extends `RunnerMessageCode.PING` ? [`PingMessageData`](modules.md#pingmessagedata) : `T` extends `RunnerMessageCode.PONG` ? [`HandshakeAcknowledgeMessageData`](modules.md#handshakeacknowledgemessagedata) : `T` extends `RunnerMessageCode.PANG` ? [`PangMessageData`](modules.md#pangmessagedata) : `T` extends `RunnerMessageCode.SEQUENCE_COMPLETED` ? `SequenceCompleteMessageData` : `T` extends `RunnerMessageCode.SEQUENCE_STOPPED` ? [`SequenceStoppedMessageData`](modules.md#sequencestoppedmessagedata) : `T` extends `RunnerMessageCode.EVENT` ? [`EventMessageData`](modules.md#eventmessagedata) : `T` extends `CPMMessageCode.STH_ID` ? [`STHIDMessageData`](modules.md#sthidmessagedata) : `T` extends `CPMMessageCode.LOAD` ? [`LoadCheckStat`](modules.md#loadcheckstat) : `T` extends `CPMMessageCode.NETWORK_INFO` ? [`NetworkInfo`](modules.md#networkinfo)[] : `T` extends `CPMMessageCode.INSTANCES` ? [`InstanceBulkMessage`](modules.md#instancebulkmessage) : `T` extends `CPMMessageCode.INSTANCE` ? [`InstanceMessage`](modules.md#instancemessage) : `T` extends `CPMMessageCode.SEQUENCES` ? [`SequenceBulkMessage`](modules.md#sequencebulkmessage) : `T` extends `CPMMessageCode.SEQUENCE` ? [`SequenceMessage`](modules.md#sequencemessage) : `never`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L65)

___

### MessageType

Ƭ **MessageType**<`T`\>: `T` extends `RunnerMessageCode.ACKNOWLEDGE` ? [`AcknowledgeMessage`](modules.md#acknowledgemessage) : `T` extends `RunnerMessageCode.ALIVE` ? [`KeepAliveMessage`](modules.md#keepalivemessage) : `T` extends `RunnerMessageCode.DESCRIBE_SEQUENCE` ? [`DescribeSequenceMessage`](modules.md#describesequencemessage) : `T` extends `RunnerMessageCode.STATUS` ? [`StatusMessage`](modules.md#statusmessage) : `T` extends `RunnerMessageCode.ERROR` ? [`ErrorMessage`](modules.md#errormessage) : `T` extends `RunnerMessageCode.KILL` ? [`KillSequenceMessage`](modules.md#killsequencemessage) : `T` extends `RunnerMessageCode.MONITORING` ? [`MonitoringMessage`](modules.md#monitoringmessage) : `T` extends `RunnerMessageCode.MONITORING_RATE` ? [`MonitoringRateMessage`](modules.md#monitoringratemessage) : `T` extends `RunnerMessageCode.STOP` ? [`StopSequenceMessage`](modules.md#stopsequencemessage) : `T` extends `RunnerMessageCode.PING` ? [`HandshakeMessage`](modules.md#handshakemessage) : `T` extends `RunnerMessageCode.PONG` ? [`HandshakeAcknowledgeMessage`](modules.md#handshakeacknowledgemessage) : `T` extends `CPMMessageCode.STH_ID` ? [`CPMMessageSTHID`](modules.md#cpmmessagesthid) : `T` extends `CPMMessageCode.LOAD` ? [`LoadCheckStatMessage`](modules.md#loadcheckstatmessage) : `T` extends `CPMMessageCode.NETWORK_INFO` ? [`NetworkInfoMessage`](modules.md#networkinfomessage) : `never`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/message-streams.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L47)

___

### Middleware

Ƭ **Middleware**: (`req`: [`ParsedMessage`](modules.md#parsedmessage), `res`: `ServerResponse`, `next`: [`NextCallback`](modules.md#nextcallback)) => `void`

#### Type declaration

▸ (`req`, `res`, `next`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`ParsedMessage`](modules.md#parsedmessage) |
| `res` | `ServerResponse` |
| `next` | [`NextCallback`](modules.md#nextcallback) |

##### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L21)

___

### MonitoringHandler

Ƭ **MonitoringHandler**: (`resp`: [`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata)) => `MaybePromise`<[`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata)\>

#### Type declaration

▸ (`resp`): `MaybePromise`<[`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata)\>

A handler for the monitoring message.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resp` | [`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata) | passed if the system was able to determine monitoring message by itself. |

##### Returns

`MaybePromise`<[`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata)\>

the monitoring information

#### Defined in

[packages/types/src/app-context.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L29)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `msgCode`: `RunnerMessageCode.MONITORING`  } & [`MonitoringMessageData`](modules.md#monitoringmessagedata)

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

#### Defined in

[packages/types/src/messages/monitoring.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L43)

___

### MonitoringMessageCode

Ƭ **MonitoringMessageCode**: `RunnerMessageCode.ACKNOWLEDGE` \| `RunnerMessageCode.DESCRIBE_SEQUENCE` \| `RunnerMessageCode.STATUS` \| `RunnerMessageCode.ALIVE` \| `RunnerMessageCode.ERROR` \| `RunnerMessageCode.MONITORING` \| `RunnerMessageCode.EVENT` \| `RunnerMessageCode.PING` \| `RunnerMessageCode.PANG` \| `RunnerMessageCode.SEQUENCE_STOPPED` \| `RunnerMessageCode.SEQUENCE_COMPLETED` \| `CPMMessageCode.LOAD` \| `CPMMessageCode.NETWORK_INFO`

#### Defined in

[packages/types/src/message-streams.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L103)

___

### MonitoringMessageData

Ƭ **MonitoringMessageData**: [`MonitoringMessageFromRunnerData`](modules.md#monitoringmessagefromrunnerdata) & { `containerId?`: `string` ; `cpuTotalUsage?`: `number` ; `limit?`: `number` ; `memoryMaxUsage?`: `number` ; `memoryUsage?`: `number` ; `networkRx?`: `number` ; `networkTx?`: `number` ; `processId?`: `number`  }

#### Defined in

[packages/types/src/messages/monitoring.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L13)

___

### MonitoringMessageFromRunnerData

Ƭ **MonitoringMessageFromRunnerData**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `healthy` | `boolean` | Calculated backpressure: processing * throughput / buffer. |
| `sequences?` | [`FunctionStatus`](modules.md#functionstatus)[] | How many items are processed by the Sequence per second. |

#### Defined in

[packages/types/src/messages/monitoring.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitoring.ts#L4)

___

### MonitoringMessageHandler

Ƭ **MonitoringMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](modules.md#encodedmessage)<`T`\>) => `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](modules.md#monitoringmessagecode) |

#### Type declaration

▸ (`msg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](modules.md#encodedmessage)<`T`\> |

##### Returns

`void`

#### Defined in

[packages/types/src/communication-handler.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L11)

___

### MonitoringRateMessage

Ƭ **MonitoringRateMessage**: { `msgCode`: `RunnerMessageCode.MONITORING_RATE`  } & [`MonitoringRateMessageData`](modules.md#monitoringratemessagedata)

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
| `monitoringRate` | `number` | Indicates how frequently should monitoring messages be emitted (in milliseconds). |

#### Defined in

[packages/types/src/messages/monitor-rate.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/monitor-rate.ts#L3)

___

### MutatingMonitoringMessageHandler

Ƭ **MutatingMonitoringMessageHandler**<`T`\>: (`msg`: [`EncodedMessage`](modules.md#encodedmessage)<`T`\>) => `MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](modules.md#monitoringmessagecode) |

#### Type declaration

▸ (`msg`): `MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`EncodedMessage`](modules.md#encodedmessage)<`T`\> |

##### Returns

`MaybePromise`<[`EncodedMessage`](modules.md#encodedmessage)<`T`\> \| ``null``\>

#### Defined in

[packages/types/src/communication-handler.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L13)

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

[packages/types/src/network-info.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/network-info.ts#L1)

___

### NetworkInfoMessage

Ƭ **NetworkInfoMessage**: { `msgCode`: `CPMMessageCode.NETWORK_INFO`  } & [`NetworkInfo`](modules.md#networkinfo)[]

#### Defined in

[packages/types/src/messages/network-info.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/network-info.ts#L4)

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

[packages/types/src/api-expose.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L20)

___

### OpOptions

Ƭ **OpOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `rawBody?` | `boolean` |

#### Defined in

[packages/types/src/api-expose.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L18)

___

### OpRecord

Ƭ **OpRecord**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `limits?` | [`DeepPartial`](modules.md#deeppartial)<[`InstanceLimits`](modules.md#instancelimits)\> | Instance stats |
| `objectId` | `string` | An instance of the object which the operation concerns, e.g. Instance ID. |
| `opCode` | `OpRecordCode` \| `SequenceMessageCode` \| `InstanceMessageCode` | The type of recorded operation is identified by the code value from the OpRecord enumeration. |
| `opState` | `string` | The operation state from the OpState enumeration. |
| `receivedAt` | `number` | The timestamp of when the operation was registered. |
| `requestId?` | `string` | The generated unique request ID for operations coming from the API. |
| `requestorId` | `string` | The requestor can be either a user who performed the operation or the system. |
| `rx?` | `number` | The data received in the request stream |
| `tx?` | `number` | The data written to the request stream. |

#### Defined in

[packages/types/src/messages/op-record.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/op-record.ts#L5)

___

### OpResolver

Ƭ **OpResolver**: (`req`: [`ParsedMessage`](modules.md#parsedmessage), `res?`: `ServerResponse`) => `MaybePromise`<`any`\>

#### Type declaration

▸ (`req`, `res?`): `MaybePromise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`ParsedMessage`](modules.md#parsedmessage) |
| `res?` | `ServerResponse` |

##### Returns

`MaybePromise`<`any`\>

#### Defined in

[packages/types/src/api-expose.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L17)

___

### OpResponse

Ƭ **OpResponse**<`PayloadType`\>: `PayloadType` & { `message?`: `string` ; `opStatus`: `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`  } \| { `error?`: `string` \| `Error` \| `unknown` ; `opStatus`: `Exclude`<`ReasonPhrases`, `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `Record`<`string`, `unknown`\> |

#### Defined in

[packages/types/src/op-response.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/op-response.ts#L3)

___

### PangMessageData

Ƭ **PangMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType?` | `string` |
| `provides?` | `string` |
| `requires?` | `string` |

#### Defined in

[packages/types/src/messages/handshake.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L12)

___

### ParsedMessage

Ƭ **ParsedMessage**: `IncomingMessage` & { `body?`: `any` ; `params`: { `[key: string]`: `any`;  } \| `undefined`  }

#### Defined in

[packages/types/src/api-expose.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L9)

___

### PassThoughStream

Ƭ **PassThoughStream**<`Passes`\>: [`DuplexStream`](modules.md#duplexstream)<`Passes`, `Passes`\>

#### Type parameters

| Name |
| :------ |
| `Passes` |

#### Defined in

[packages/types/src/utils.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L66)

___

### PassThroughStreamsConfig

Ƭ **PassThroughStreamsConfig**<`serialized`\>: [stdin: PassThoughStream<string\>, stdout: PassThoughStream<string\>, stderr: PassThoughStream<string\>, control: PassThoughStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: PassThoughStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: PassThoughStream<any\>, output: PassThoughStream<any\>, log: PassThoughStream<any\>, pkg?: PassThoughStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean` = ``true`` |

#### Defined in

[packages/types/src/message-streams.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L145)

___

### PingMessageData

Ƭ **PingMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ports?` | `Record`<`string`, `string`\> |

#### Defined in

[packages/types/src/messages/handshake.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/handshake.ts#L10)

___

### Port

Ƭ **Port**: `number`

#### Defined in

[packages/types/src/utils.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L115)

___

### PortConfig

Ƭ **PortConfig**: \`${number}/${"tcp" \| "udp"}\`

#### Defined in

[packages/types/src/sequence-package-json.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L3)

___

### PreRunnerContainerConfiguration

Ƭ **PreRunnerContainerConfiguration**: [`ContainerConfiguration`](modules.md#containerconfiguration)

PreRunner container configuration.

#### Defined in

[packages/types/src/sth-configuration.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L31)

___

### ProcessSequenceConfig

Ƭ **ProcessSequenceConfig**: `CommonSequenceConfig` & { `type`: ``"process"``  }

#### Defined in

[packages/types/src/runner-config.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L40)

___

### PublicSTHConfiguration

Ƭ **PublicSTHConfiguration**: `Omit`<`Omit`<`Omit`<[`STHConfiguration`](modules.md#sthconfiguration), ``"sequencesRoot"``\>, ``"cpmSslCaPath"``\>, ``"kubernetes"``\> & { `kubernetes`: `Omit`<`Omit`<`Partial`<[`K8SAdapterConfiguration`](modules.md#k8sadapterconfiguration)\>, ``"authConfigPath"``\>, ``"sequencesRoot"``\>  }

#### Defined in

[packages/types/src/sth-configuration.ts:276](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L276)

___

### RFunction

Ƭ **RFunction**<`Produces`\>: [`Streamable`](modules.md#streamable)<`Produces`\> \| [`ReadFunction`](modules.md#readfunction)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L22)

___

### ReadFunction

Ƭ **ReadFunction**<`Produces`\>: (`stream`: [`ReadableStream`](interfaces/ReadableStream.md)<`never`\>, ...`parameters`: `any`[]) => [`Streamable`](modules.md#streamable)<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Type declaration

▸ (`stream`, `...parameters`): [`Streamable`](modules.md#streamable)<`Produces`\>

A Function that returns a streamable result is a read function

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/ReadableStream.md)<`never`\> |
| `...parameters` | `any`[] |

##### Returns

[`Streamable`](modules.md#streamable)<`Produces`\>

#### Defined in

[packages/types/src/functions.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L13)

___

### ReadSequence

Ƭ **ReadSequence**<`Produces`, `Y`, `Z`\>: [[`RFunction`](modules.md#rfunction)<`Produces`\>] \| [[`RFunction`](modules.md#rfunction)<`Z`\>, ...TFunctionChain<Z, Produces, Y\>]

A sequence of functions reads input from a source and outputs it after
a chain of transforms.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | `Produces` |
| `Y` | extends `any`[] = `any`[] |
| `Z` | `any` |

#### Defined in

[packages/types/src/sequence.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L23)

___

### ReadableApp

Ƭ **ReadableApp**<`Produces`, `Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](modules.md#transformapp)<`VoidType`, `Produces`, `Z`, `S`, `AppConfigType`\>

A Readable App is an app that obtains the data by it's own means and preforms
0 to any number of transforms on that data before returning it.

**`Interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Produces` | `any` |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L37)

___

### RunnerContainerConfiguration

Ƭ **RunnerContainerConfiguration**: [`ContainerConfiguration`](modules.md#containerconfiguration) & [`ContainerConfigurationWithExposedPorts`](modules.md#containerconfigurationwithexposedports)

Runner container configuration.

#### Defined in

[packages/types/src/sth-configuration.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L36)

___

### RunnerErrorCode

Ƭ **RunnerErrorCode**: ``"SEQUENCE_ENDED_PREMATURE"`` \| ``"SEQUENCE_RUNTIME_ERROR"`` \| ``"UNINITIALIZED_STREAMS"`` \| ``"UNKNOWN_MESSAGE_CODE"`` \| ``"NO_MONITORING"`` \| ``"UNINITIALIZED_CONTEXT"``

#### Defined in

[packages/types/src/error-codes/runner-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/runner-error.ts#L1)

___

### RunnerMessage

Ƭ **RunnerMessage**: [`RunnerMessageCode`, `object`]

#### Defined in

[packages/types/src/runner.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L48)

___

### RunnerOptions

Ƭ **RunnerOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `monitoringInterval?` | `number` |

#### Defined in

[packages/types/src/runner.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner.ts#L44)

___

### STHCommandOptions

Ƭ **STHCommandOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `colors` | `boolean` |
| `config?` | `string` |
| `cpmId?` | `string` |
| `cpmMaxReconnections` | `number` |
| `cpmReconnectionDelay` | `number` |
| `cpmSslCaPath?` | `string` |
| `cpmUrl?` | `string` |
| `customName` | `string` |
| `debug` | `boolean` |
| `description` | `string` |
| `docker` | `boolean` |
| `environmentName?` | `string` |
| `exitWithLastInstance` | `boolean` |
| `exposeHostIp` | `string` |
| `hostname` | `string` |
| `id?` | `string` |
| `identifyExisting` | `boolean` |
| `instanceLifetimeExtensionDelay` | `number` |
| `instancesServerPort` | `string` |
| `k8sAuthConfigPath` | `string` |
| `k8sNamespace` | `string` |
| `k8sQuotaName` | `string` |
| `k8sRunnerCleanupTimeout` | `string` |
| `k8sRunnerImage` | `string` |
| `k8sRunnerPyImage` | `string` |
| `k8sRunnerResourcesLimitsCpu` | `string` |
| `k8sRunnerResourcesLimitsMemory` | `string` |
| `k8sRunnerResourcesRequestsCpu` | `string` |
| `k8sRunnerResourcesRequestsMemory` | `string` |
| `k8sSequencesRoot` | `string` |
| `k8sSthPodHost` | `string` |
| `logLevel` | [`LogLevel`](modules.md#loglevel) |
| `platformApi` | `string` |
| `platformApiKey` | `string` |
| `platformApiVersion` | `string` |
| `platformSpace` | `string` |
| `port` | `number` |
| `prerunnerImage` | `string` |
| `prerunnerMaxMem` | `number` |
| `runnerImage` | `string` |
| `runnerMaxMem` | `number` |
| `runnerPyImage` | `string` |
| `runtimeAdapter` | `string` |
| `safeOperationLimit` | `number` |
| `selfHosted` | `boolean` |
| `sequencesRoot` | `string` |
| `startupConfig` | `string` |
| `tags` | `string` |
| `telemetry` | [`TelemetryConfig`](modules.md#telemetryconfig)[``"status"``] |

#### Defined in

[packages/types/src/sth-command-options.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-command-options.ts#L4)

___

### STHConfiguration

Ƭ **STHConfiguration**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `cpm` | { `maxReconnections`: `number` ; `reconnectionDelay`: `number`  } | - |
| `cpm.maxReconnections` | `number` | - |
| `cpm.reconnectionDelay` | `number` | - |
| `cpmId` | `string` | CPM id. |
| `cpmSslCaPath?` | `string` | Path to the certificate authority file for verifying self-signed CPM certs |
| `cpmUrl` | `string` | CPM url. |
| `customName?` | `string` | Custom name to help identify sth |
| `debug` | `boolean` | Add debugging flags to runner. |
| `description?` | `string` | Description set by user |
| `docker` | { `prerunner`: [`PreRunnerContainerConfiguration`](modules.md#prerunnercontainerconfiguration) ; `runner`: [`RunnerContainerConfiguration`](modules.md#runnercontainerconfiguration) ; `runnerImages`: { `node`: `string` ; `python3`: `string`  }  } | Docker related configuration. |
| `docker.prerunner` | [`PreRunnerContainerConfiguration`](modules.md#prerunnercontainerconfiguration) | PreRunner container configuration. |
| `docker.runner` | [`RunnerContainerConfiguration`](modules.md#runnercontainerconfiguration) | Runner container configuration. |
| `docker.runnerImages` | { `node`: `string` ; `python3`: `string`  } | - |
| `docker.runnerImages.node` | `string` | - |
| `docker.runnerImages.python3` | `string` | - |
| `exitWithLastInstance` | `boolean` | Should the hub exit when the last instance ends |
| `host` | [`HostConfig`](modules.md#hostconfig) | Host configuration. |
| `identifyExisting` | `boolean` | Should we identify existing sequences. |
| `instanceRequirements` | { `cpuLoad`: `number` ; `freeMem`: `number` ; `freeSpace`: `number`  } | Minimum requirements to start new Instance. |
| `instanceRequirements.cpuLoad` | `number` | Required free CPU. In percentage. |
| `instanceRequirements.freeMem` | `number` | Free memory required to start Instance. In megabytes. |
| `instanceRequirements.freeSpace` | `number` | Free disk space required to start Instance. In megabytes. |
| `kubernetes` | `Partial`<[`K8SAdapterConfiguration`](modules.md#k8sadapterconfiguration)\> | Kubernetes adapter configuration |
| `logColors` | `boolean` | Enable colors in logging. |
| `logLevel` | [`LogLevel`](modules.md#loglevel) | Logging level. |
| `platform?` | { `api`: `string` ; `apiKey`: `string` ; `apiVersion`: `string` ; `hostType`: ``"hub"`` \| ``"federation"`` ; `space`: `string`  } | - |
| `platform.api` | `string` | - |
| `platform.apiKey` | `string` | - |
| `platform.apiVersion` | `string` | - |
| `platform.hostType` | ``"hub"`` \| ``"federation"`` | - |
| `platform.space` | `string` | - |
| `runtimeAdapter` | `string` | Which sequence and instance adapters should STH use. One of 'docker', 'process', 'kubernetes', 'detect' |
| `safeOperationLimit` | `number` | The amount of memory that must remain free. In megabytes. |
| `selfHosted?` | `boolean` | Is STH self hosted? |
| `sequencesRoot` | `string` | Only used when `noDocker` is true Where should ProcessSequenceAdapter save new Sequences |
| `startupConfig` | `string` | Provides the location of a config file with the list of sequences to be started along with the host |
| `tags?` | `string`[] | User assigned tags |
| `telemetry` | [`TelemetryConfig`](modules.md#telemetryconfig) | - |
| `timings` | { `heartBeatInterval`: `number` ; `instanceAdapterExitDelay`: `number` ; `instanceLifetimeExtensionDelay`: `number`  } | Various timeout and interval configurations |
| `timings.heartBeatInterval` | `number` | Heartbeat interval in miliseconds |
| `timings.instanceAdapterExitDelay` | `number` | Time to wait after Runner container exit. In this additional time Instance API is still available. |
| `timings.instanceLifetimeExtensionDelay` | `number` | Time to wait before CSIController emits `end` event. |

#### Defined in

[packages/types/src/sth-configuration.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-configuration.ts#L107)

___

### STHIDMessageData

Ƭ **STHIDMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/messages/sth-id.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sth-id.ts#L3)

___

### SequenceAdapterErrorCode

Ƭ **SequenceAdapterErrorCode**: ``"DOCKER_ERROR"`` \| ``"PRERUNNER_ERROR"``

#### Defined in

[packages/types/src/error-codes/sequence-adapter-error.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/error-codes/sequence-adapter-error.ts#L1)

___

### SequenceBulkMessage

Ƭ **SequenceBulkMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `msgCode` | `CPMMessageCode.SEQUENCES` |
| `sequences` | [`SequenceMessageData`](modules.md#sequencemessagedata)[] |

#### Defined in

[packages/types/src/messages/sequence.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L9)

___

### SequenceCompleteMessage

Ƭ **SequenceCompleteMessage**: { `msgCode`: `RunnerMessageCode.SEQUENCE_COMPLETED`  } & `SequenceCompleteMessageData`

Message from the Runner indicating that the Sequence has completed sending it's data
and now can be asked to exit with high probability of accepting the exit gracefully.

#### Defined in

[packages/types/src/messages/sequence-complete.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-complete.ts#L11)

___

### SequenceConfig

Ƭ **SequenceConfig**: [`DockerSequenceConfig`](modules.md#dockersequenceconfig) \| [`ProcessSequenceConfig`](modules.md#processsequenceconfig) \| [`KubernetesSequenceConfig`](modules.md#kubernetessequenceconfig)

#### Defined in

[packages/types/src/runner-config.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/runner-config.ts#L48)

___

### SequenceEndMessage

Ƭ **SequenceEndMessage**: { `msgCode`: `RunnerMessageCode.SEQUENCE_COMPLETED`  } & [`SequenceEndMessageData`](modules.md#sequenceendmessagedata)

Message from the Runner indicating that the Sequence has called the end method
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
| `err` | `Error` |

#### Defined in

[packages/types/src/messages/sequence-end.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-end.ts#L3)

___

### SequenceInfo

Ƭ **SequenceInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | [`SequenceConfig`](modules.md#sequenceconfig) |
| `id` | `string` |
| `instances` | `Set`<[`InstanceId`](modules.md#instanceid)\> |
| `name?` | `string` |

#### Defined in

[packages/types/src/sequence-adapter.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L6)

___

### SequenceMessage

Ƭ **SequenceMessage**: { `msgCode`: `CPMMessageCode.SEQUENCE`  } & [`SequenceMessageData`](modules.md#sequencemessagedata)

#### Defined in

[packages/types/src/messages/sequence.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L8)

___

### SequenceMessageData

Ƭ **SequenceMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `status` | `SequenceMessageCode` |

#### Defined in

[packages/types/src/messages/sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence.ts#L3)

___

### SequencePackageJSON

Ƭ **SequencePackageJSON**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `args?` | [`InstanceArgs`](modules.md#instanceargs) |
| `author?` | `string` |
| `description?` | `string` |
| `engines?` | `Record`<`string`, `string`\> \| ``null`` |
| `keywords?` | `string`[] |
| `main` | `string` |
| `name?` | `string` \| ``null`` |
| `repository?` | { `directory?`: `string` ; `type`: `string` ; `url`: `string`  } \| `string` |
| `scramjet?` | [`SequencePackageJSONScramjetSection`](modules.md#sequencepackagejsonscramjetsection) \| ``null`` |
| `version?` | `string` \| ``null`` |

#### Defined in

[packages/types/src/sequence-package-json.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L13)

___

### SequencePackageJSONScramjetConfig

Ƭ **SequencePackageJSONScramjetConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ports?` | [`PortConfig`](modules.md#portconfig)[] \| ``null`` |

#### Defined in

[packages/types/src/sequence-package-json.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L5)

___

### SequencePackageJSONScramjetSection

Ƭ **SequencePackageJSONScramjetSection**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config?` | [`SequencePackageJSONScramjetConfig`](modules.md#sequencepackagejsonscramjetconfig) \| ``null`` |

#### Defined in

[packages/types/src/sequence-package-json.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-package-json.ts#L9)

___

### SequenceStoppedMessageData

Ƭ **SequenceStoppedMessageData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `sequenceError?` | `unknown` |

#### Defined in

[packages/types/src/messages/sequence-stopped.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/sequence-stopped.ts#L1)

___

### StartSequenceDTO

Ƭ **StartSequenceDTO**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `appConfig?` | [`AppConfig`](modules.md#appconfig) |
| `args?` | `string`[] |
| `id` | `string` |
| `instanceId?` | `string` |

#### Defined in

[packages/types/src/dto/start-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/dto/start-sequence.ts#L3)

___

### StatusMessage

Ƭ **StatusMessage**: { `msgCode`: `RunnerMessageCode.STATUS`  } & [`StatusMessageData`](modules.md#statusmessagedata)

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
| `definition?` | [`FunctionDefinition`](modules.md#functiondefinition)[] | Provides the definition of each subsequence. |

#### Defined in

[packages/types/src/messages/status.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/status.ts#L4)

___

### StopHandler

Ƭ **StopHandler**: (`timeout`: `number`, `canCallKeepalive`: `boolean`) => `MaybePromise`<`void`\>

#### Type declaration

▸ (`timeout`, `canCallKeepalive`): `MaybePromise`<`void`\>

A callback that will be called when the Sequence is being stopped gracefully.

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

[packages/types/src/app-context.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L19)

___

### StopSequenceMessage

Ƭ **StopSequenceMessage**: { `msgCode`: `RunnerMessageCode.STOP`  } & [`StopSequenceMessageData`](modules.md#stopsequencemessagedata)

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
| `canCallKeepalive` | `boolean` | Informs if keepAlive can be called to prolong the running of the Sequence. |
| `timeout` | `number` | The number of milliseconds before the Sequence will be killed. |

#### Defined in

[packages/types/src/messages/stop-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/messages/stop-sequence.ts#L3)

___

### StreamConfig

Ƭ **StreamConfig**: `Object`

Configuration options for streaming endpoints

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `checkContentType?` | `boolean` | Perform stream content-type type checks |
| `checkEndHeader?` | `boolean` | Should consider x-end-stream header or just use the 'end' **`Default`** true |
| `encoding?` | `BufferEncoding` | Encoding used in the stream |
| `end?` | `boolean` | Should request end also end the stream or can the endpoint accept subsequent connections |
| `json?` | `boolean` | Is the stream a JSON stream? |
| `method?` | ``"post"`` \| ``"put"`` | - |
| `text?` | `boolean` | Is the stream a text stream? |

#### Defined in

[packages/types/src/api-expose.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L27)

___

### StreamInput

Ƭ **StreamInput**: (`req`: [`ParsedMessage`](modules.md#parsedmessage), `res`: `ServerResponse`) => `MaybePromise`<`Readable`\> \| `MaybePromise`<`Readable`\>

#### Defined in

[packages/types/src/api-expose.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L12)

___

### StreamOutput

Ƭ **StreamOutput**: (`req`: [`ParsedMessage`](modules.md#parsedmessage), `res`: `ServerResponse`) => `MaybePromise`<`any`\> \| `MaybePromise`<`Writable`\>

#### Defined in

[packages/types/src/api-expose.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/api-expose.ts#L15)

___

### Streamable

Ƭ **Streamable**<`Produces`\>: `MaybePromise`<[`SynchronousStreamable`](modules.md#synchronousstreamable)<`Produces`\>\>

Represents all readable stream types that will be accepted as return values
from {@see TFunction}

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L91)

___

### SynchronousStreamable

Ƭ **SynchronousStreamable**<`Produces`\>: [`SynchronousStreamablePayload`](modules.md#synchronousstreamablepayload)<`Produces`\> & [`HasTopicInformation`](modules.md#hastopicinformation)

#### Type parameters

| Name |
| :------ |
| `Produces` |

#### Defined in

[packages/types/src/utils.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L86)

___

### SynchronousStreamablePayload

Ƭ **SynchronousStreamablePayload**<`Produces`\>: `PipeableStream`<`Produces`\> \| `AsyncGen`<`Produces`, `Produces`\> \| `Gen`<`Produces`, `void`\> \| `Iterable`<`Produces`\> \| `AsyncIterable`<`Produces`\>

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

Ƭ **TFunction**<`Consumes`, `Produces`\>: `AsyncGen`<`Produces`, `Consumes`\> \| `Gen`<`Produces`, `Consumes`\> \| [`TranformFunction`](modules.md#tranformfunction)<`Consumes`, `Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/functions.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L23)

___

### TFunctionChain

Ƭ **TFunctionChain**<`Consumes`, `Produces`, `Z`\>: [[`TFunction`](modules.md#tfunction)<`Consumes`, `Produces`\>] \| [...MulMulTFunction<Consumes, Produces, Z\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | extends `any`[] |

#### Defined in

[packages/types/src/functions.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L43)

___

### TelemetryAdaptersConfig

Ƭ **TelemetryAdaptersConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `loki?` | { `host`: `string` ; `interval?`: `number` ; `labels`: { `[key: string]`: `string`;  } ; `replaceTimestamp`: `boolean`  } |
| `loki.host` | `string` |
| `loki.interval?` | `number` |
| `loki.labels` | { `[key: string]`: `string`;  } |
| `loki.replaceTimestamp` | `boolean` |

#### Defined in

[packages/types/src/telemetry-config.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/telemetry-config.ts#L1)

___

### TelemetryConfig

Ƭ **TelemetryConfig**: { `adapter`: ``"loki"`` ; `environment?`: `string` ; `status`: `boolean`  } & [`TelemetryAdaptersConfig`](modules.md#telemetryadaptersconfig)

#### Defined in

[packages/types/src/telemetry-config.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/telemetry-config.ts#L10)

___

### TranformFunction

Ƭ **TranformFunction**<`Consumes`, `Produces`\>: (`stream`: [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\>, ...`parameters`: `any`[]) => `StreambleMaybeFunction`<`Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Type declaration

▸ (`stream`, `...parameters`): `StreambleMaybeFunction`<`Produces`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\> |
| `...parameters` | `any`[] |

##### Returns

`StreambleMaybeFunction`<`Produces`\>

#### Defined in

[packages/types/src/functions.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L17)

___

### TransformApp

Ƭ **TransformApp**<`Consumes`, `Produces`, `Z`, `S`, `AppConfigType`, `ReturnType`\>: (`this`: [`AppContext`](interfaces/AppContext.md)<`AppConfigType`, `S`\>, `source`: [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\>, ...`args`: `Z`) => `MaybePromise`<`ReturnType`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Produces` | `any` |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |
| `ReturnType` | [`Streamable`](modules.md#streamable)<`Produces`\> |

#### Type declaration

▸ (`this`, `source`, `...args`): `MaybePromise`<`ReturnType`\>

A Transformation App that accepts data from the platform, performs operations on the data,
and returns the data to the platforms for further use.

Has both active readable and writable sides.

**`Interface`**

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`AppContext`](interfaces/AppContext.md)<`AppConfigType`, `S`\> |
| `source` | [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\> |
| `...args` | `Z` |

##### Returns

`MaybePromise`<`ReturnType`\>

#### Defined in

[packages/types/src/application.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L18)

___

### TransformAppAcceptableSequence

Ƭ **TransformAppAcceptableSequence**<`Consumes`, `Produces`\>: [`TFunction`](modules.md#tfunction)<`Consumes`, `Produces`\> \| [`InertSequence`](modules.md#inertsequence) \| [`TransformSeqence`](modules.md#transformseqence)<`Consumes`, `Produces`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |
| `Produces` |

#### Defined in

[packages/types/src/sequence.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L35)

___

### TransformSeqence

Ƭ **TransformSeqence**<`Consumes`, `Produces`, `Z`, `X`\>: [[`TFunction`](modules.md#tfunction)<`Consumes`, `Produces`\>] \| [...TFunctionChain<Consumes, Z, X\>, [`TFunction`](modules.md#tfunction)<`Z`, `Produces`\>]

A Transform Sequence is a Sequence that accept input, perform operations on it, and
outputs the result.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Produces` | `Produces` |
| `Z` | `any` |
| `X` | extends `any`[] = `any`[] |

#### Defined in

[packages/types/src/sequence.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L31)

___

### UpstreamStreamsConfig

Ƭ **UpstreamStreamsConfig**<`serialized`\>: [stdin: ReadableStream<string\>, stdout: WritableStream<string\>, stderr: WritableStream<string\>, control: ReadableStream<serialized extends true ? EncodedSerializedControlMessage : EncodedControlMessage\>, monitor: WritableStream<serialized extends true ? EncodedSerializedMonitoringMessage : EncodedMonitoringMessage\>, input: ReadableStream<any\>, output: WritableStream<any\>, log: WritableStream<any\>, pkg?: ReadableStream<Buffer\>]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `serialized` | extends `boolean` = ``true`` |

#### Defined in

[packages/types/src/message-streams.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/message-streams.ts#L133)

___

### UrlPath

Ƭ **UrlPath**: `string`

#### Defined in

[packages/types/src/utils.ts:113](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L113)

___

### ValidationResult

Ƭ **ValidationResult**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `isValid` | `boolean` |
| `message?` | `string` |
| `name` | `string` |

#### Defined in

[packages/types/src/utils.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L121)

___

### ValidationSchema

Ƭ **ValidationSchema**: `Object`

#### Index signature

▪ [key: `string`]: (`value`: `any`) => `string` \| `boolean`[]

#### Defined in

[packages/types/src/utils.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L120)

___

### Validator

Ƭ **Validator**: (`message`: `string`) => (`value`: `any`) => `string` \| `boolean`

#### Type declaration

▸ (`message`): (`value`: `any`) => `string` \| `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |

##### Returns

`fn`

▸ (`value`): `string` \| `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

##### Returns

`string` \| `boolean`

#### Defined in

[packages/types/src/utils.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L119)

___

### WFunction

Ƭ **WFunction**<`Consumes`\>: [`TFunction`](modules.md#tfunction)<`Consumes`, `never`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Defined in

[packages/types/src/functions.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L27)

___

### WritableApp

Ƭ **WritableApp**<`Consumes`, `Z`, `S`, `AppConfigType`, `VoidType`\>: [`TransformApp`](modules.md#transformapp)<`Consumes`, `VoidType`, `Z`, `S`, `AppConfigType`, `void`\>

A Writable App is an app that accepts the data from the platform, performs any number
of transforms and then saves it to the data destination by it's own means.

**`Interface`**

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `any` |
| `Z` | extends `any`[] = `any`[] |
| `S` | extends `any` = `any` |
| `AppConfigType` | extends [`AppConfig`](modules.md#appconfig) = [`AppConfig`](modules.md#appconfig) |
| `VoidType` | `void` |

#### Defined in

[packages/types/src/application.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/application.ts#L51)

___

### WriteFunction

Ƭ **WriteFunction**<`Consumes`\>: (`stream`: [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\>, ...`parameters`: `any`[]) => `MaybePromise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `Consumes` |

#### Type declaration

▸ (`stream`, `...parameters`): `MaybePromise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`ReadableStream`](interfaces/ReadableStream.md)<`Consumes`\> |
| `...parameters` | `any`[] |

##### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/functions.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/functions.ts#L15)

___

### WriteSequence

Ƭ **WriteSequence**<`Consumes`, `Y`, `Z`\>: [[`WFunction`](modules.md#wfunction)<`Consumes`\>] \| [...TFunctionChain<Consumes, Z, Y\>, [`WFunction`](modules.md#wfunction)<`Z`\>]

A Sequence of functions that accept some input, transforms it through
a number of functions and writes to some destination.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Consumes` | `Consumes` |
| `Y` | extends `any`[] = `any`[] |
| `Z` | `any` |

#### Defined in

[packages/types/src/sequence.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence.ts#L15)

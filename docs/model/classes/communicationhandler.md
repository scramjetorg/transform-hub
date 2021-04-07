[@scramjet/model](../README.md) / [Exports](../modules.md) / CommunicationHandler

# Class: CommunicationHandler

## Implements

* *ICommunicationHandler*

## Table of contents

### Constructors

- [constructor](communicationhandler.md#constructor)

### Properties

- [\_controlOutput](communicationhandler.md#_controloutput)
- [\_monitoringOutput](communicationhandler.md#_monitoringoutput)
- [\_piped](communicationhandler.md#_piped)
- [controlDownstream](communicationhandler.md#controldownstream)
- [controlHandlerHash](communicationhandler.md#controlhandlerhash)
- [controlPassThrough](communicationhandler.md#controlpassthrough)
- [controlUpstream](communicationhandler.md#controlupstream)
- [downstreams](communicationhandler.md#downstreams)
- [monitoringDownstream](communicationhandler.md#monitoringdownstream)
- [monitoringHandlerHash](communicationhandler.md#monitoringhandlerhash)
- [monitoringPassThrough](communicationhandler.md#monitoringpassthrough)
- [monitoringUpstream](communicationhandler.md#monitoringupstream)
- [stdErrDownstream](communicationhandler.md#stderrdownstream)
- [stdErrUpstream](communicationhandler.md#stderrupstream)
- [stdInDownstream](communicationhandler.md#stdindownstream)
- [stdInUpstream](communicationhandler.md#stdinupstream)
- [stdOutDownstream](communicationhandler.md#stdoutdownstream)
- [stdOutUpstream](communicationhandler.md#stdoutupstream)
- [upstreams](communicationhandler.md#upstreams)

### Accessors

- [controlOutput](communicationhandler.md#controloutput)
- [monitoringOutput](communicationhandler.md#monitoringoutput)

### Methods

- [addControlHandler](communicationhandler.md#addcontrolhandler)
- [addMonitoringHandler](communicationhandler.md#addmonitoringhandler)
- [areStreamsHooked](communicationhandler.md#arestreamshooked)
- [hookClientStreams](communicationhandler.md#hookclientstreams)
- [hookLifecycleStreams](communicationhandler.md#hooklifecyclestreams)
- [pipeDataStreams](communicationhandler.md#pipedatastreams)
- [pipeMessageStreams](communicationhandler.md#pipemessagestreams)
- [pipeStdio](communicationhandler.md#pipestdio)
- [sendControlMessage](communicationhandler.md#sendcontrolmessage)
- [sendMonitoringMessage](communicationhandler.md#sendmonitoringmessage)

## Constructors

### constructor

\+ **new CommunicationHandler**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [model/src/stream-handler.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L83)

## Properties

### \_controlOutput

• `Private` `Optional` **\_controlOutput**: *PassThoughStream*<string\>

**`analyze-how-to-pass-in-out-streams`** 
Input stream to a Sequence and output stream from a Sequence need to be added as properties
(for both upstream and downstream arrays):
inputUpstream
inputDownstream
outputUpstream
outputDownstream

Defined in: [model/src/stream-handler.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L71)

___

### \_monitoringOutput

• `Private` `Optional` **\_monitoringOutput**: *PassThoughStream*<EncodedMonitoringMessage\>

Defined in: [model/src/stream-handler.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L72)

___

### \_piped

• `Private` `Optional` **\_piped**: *boolean*

Defined in: [model/src/stream-handler.ts:77](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L77)

___

### controlDownstream

• `Private` `Optional` **controlDownstream**: *WritableStream*<string\>

Defined in: [model/src/stream-handler.ts:56](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L56)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: ControlMessageHandlerList

Defined in: [model/src/stream-handler.ts:83](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L83)

___

### controlPassThrough

• `Private` **controlPassThrough**: *DataStream*

Defined in: [model/src/stream-handler.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L74)

___

### controlUpstream

• `Private` `Optional` **controlUpstream**: *ReadableStream*<EncodedControlMessage\>

Defined in: [model/src/stream-handler.ts:55](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L55)

___

### downstreams

• `Private` `Optional` **downstreams**: DownstreamStreamsConfig

Defined in: [model/src/stream-handler.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L60)

___

### monitoringDownstream

• `Private` `Optional` **monitoringDownstream**: *ReadableStream*<string\>

Defined in: [model/src/stream-handler.ts:58](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L58)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: MonitoringMessageHandlerList

Defined in: [model/src/stream-handler.ts:82](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L82)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: *DataStream*

Defined in: [model/src/stream-handler.ts:75](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L75)

___

### monitoringUpstream

• `Private` `Optional` **monitoringUpstream**: *WritableStream*<EncodedMonitoringMessage\>

Defined in: [model/src/stream-handler.ts:57](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L57)

___

### stdErrDownstream

• `Private` `Optional` **stdErrDownstream**: *Readable*

Defined in: [model/src/stream-handler.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L54)

___

### stdErrUpstream

• `Private` `Optional` **stdErrUpstream**: *Writable*

Defined in: [model/src/stream-handler.ts:53](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L53)

___

### stdInDownstream

• `Private` `Optional` **stdInDownstream**: *Writable*

Defined in: [model/src/stream-handler.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L50)

___

### stdInUpstream

• `Private` `Optional` **stdInUpstream**: *Readable*

Defined in: [model/src/stream-handler.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L49)

___

### stdOutDownstream

• `Private` `Optional` **stdOutDownstream**: *Readable*

Defined in: [model/src/stream-handler.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L52)

___

### stdOutUpstream

• `Private` `Optional` **stdOutUpstream**: *Writable*

Defined in: [model/src/stream-handler.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L51)

___

### upstreams

• `Private` `Optional` **upstreams**: UpstreamStreamsConfig

Defined in: [model/src/stream-handler.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L59)

## Accessors

### controlOutput

• get **controlOutput**(): *PassThoughStream*<string\>

**Returns:** *PassThoughStream*<string\>

Defined in: [model/src/stream-handler.ts:204](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L204)

___

### monitoringOutput

• get **monitoringOutput**(): *ReadableStream*<string\>

**Returns:** *ReadableStream*<string\>

Defined in: [model/src/stream-handler.ts:198](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L198)

## Methods

### addControlHandler

▸ **addControlHandler**<T\>(`_code`: T, `handler`: [*ControlMessageHandler*](../modules.md#controlmessagehandler)<T\>): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | ControlMessageCode |

#### Parameters:

Name | Type |
:------ | :------ |
`_code` | T |
`handler` | [*ControlMessageHandler*](../modules.md#controlmessagehandler)<T\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.addControlHandler

Defined in: [model/src/stream-handler.ts:255](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L255)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<T\>(`_code`: T, `handler`: [*MonitoringMessageHandler*](../modules.md#monitoringmessagehandler)<T\>): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | MonitoringMessageCode |

#### Parameters:

Name | Type |
:------ | :------ |
`_code` | T |
`handler` | [*MonitoringMessageHandler*](../modules.md#monitoringmessagehandler)<T\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.addMonitoringHandler

Defined in: [model/src/stream-handler.ts:250](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L250)

___

### areStreamsHooked

▸ **areStreamsHooked**(): *boolean*

**Returns:** *boolean*

Defined in: [model/src/stream-handler.ts:209](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L209)

___

### hookClientStreams

▸ **hookClientStreams**(`streams`: UpstreamStreamsConfig): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
:------ | :------ |
`streams` | UpstreamStreamsConfig |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.hookClientStreams

Defined in: [model/src/stream-handler.ts:110](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L110)

___

### hookLifecycleStreams

▸ **hookLifecycleStreams**(`streams`: DownstreamStreamsConfig): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
:------ | :------ |
`streams` | DownstreamStreamsConfig |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.hookLifecycleStreams

Defined in: [model/src/stream-handler.ts:126](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L126)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeDataStreams

Defined in: [model/src/stream-handler.ts:241](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L241)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeMessageStreams

Defined in: [model/src/stream-handler.ts:142](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L142)

___

### pipeStdio

▸ **pipeStdio**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeStdio

Defined in: [model/src/stream-handler.ts:227](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L227)

___

### sendControlMessage

▸ **sendControlMessage**<T\>(`code`: T, `msg`: [*MessageDataType*](../modules.md#messagedatatype)<T\>): *Promise*<void\>

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | ControlMessageCode |

#### Parameters:

Name | Type |
:------ | :------ |
`code` | T |
`msg` | [*MessageDataType*](../modules.md#messagedatatype)<T\> |

**Returns:** *Promise*<void\>

Implementation of: ICommunicationHandler.sendControlMessage

Defined in: [model/src/stream-handler.ts:266](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L266)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<T\>(`code`: T, `msg`: [*MessageDataType*](../modules.md#messagedatatype)<T\>): *Promise*<void\>

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | MonitoringMessageCode |

#### Parameters:

Name | Type |
:------ | :------ |
`code` | T |
`msg` | [*MessageDataType*](../modules.md#messagedatatype)<T\> |

**Returns:** *Promise*<void\>

Implementation of: ICommunicationHandler.sendMonitoringMessage

Defined in: [model/src/stream-handler.ts:260](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/000f7de/packages/model/src/stream-handler.ts#L260)

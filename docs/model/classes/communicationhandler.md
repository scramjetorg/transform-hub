[@scramjet/model](../README.md) / CommunicationHandler

# Class: CommunicationHandler

## Hierarchy

* **CommunicationHandler**

## Implements

* *ICommunicationHandler*

## Table of contents

### Constructors

- [constructor](communicationhandler.md#constructor)

### Properties

- [\_piped](communicationhandler.md#_piped)
- [controlHandlerHash](communicationhandler.md#controlhandlerhash)
- [controlPassThrough](communicationhandler.md#controlpassthrough)
- [downstreams](communicationhandler.md#downstreams)
- [loggerPassthough](communicationhandler.md#loggerpassthough)
- [monitoringHandlerHash](communicationhandler.md#monitoringhandlerhash)
- [monitoringPassThrough](communicationhandler.md#monitoringpassthrough)
- [upstreams](communicationhandler.md#upstreams)

### Methods

- [addControlHandler](communicationhandler.md#addcontrolhandler)
- [addMonitoringHandler](communicationhandler.md#addmonitoringhandler)
- [areStreamsHooked](communicationhandler.md#arestreamshooked)
- [getLogOutput](communicationhandler.md#getlogoutput)
- [getMonitorStream](communicationhandler.md#getmonitorstream)
- [getStdio](communicationhandler.md#getstdio)
- [hookDownstreamStreams](communicationhandler.md#hookdownstreamstreams)
- [hookUpstreamStreams](communicationhandler.md#hookupstreamstreams)
- [pipeDataStreams](communicationhandler.md#pipedatastreams)
- [pipeMessageStreams](communicationhandler.md#pipemessagestreams)
- [pipeStdio](communicationhandler.md#pipestdio)
- [safeHandle](communicationhandler.md#safehandle)
- [sendControlMessage](communicationhandler.md#sendcontrolmessage)
- [sendMonitoringMessage](communicationhandler.md#sendmonitoringmessage)

## Constructors

### constructor

\+ **new CommunicationHandler**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L71)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: *undefined* \| *boolean*

Defined in: [packages/model/src/stream-handler.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L65)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: ControlMessageHandlerList

Defined in: [packages/model/src/stream-handler.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L71)

___

### controlPassThrough

• `Private` **controlPassThrough**: *DataStream*

Defined in: [packages/model/src/stream-handler.ts:62](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L62)

___

### downstreams

• `Optional` **downstreams**: *undefined* \| *DownstreamStreamsConfig*<*true*\>

Defined in: [packages/model/src/stream-handler.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L59)

___

### loggerPassthough

• `Private` **loggerPassthough**: *DuplexStream*<*string*, *string*\>

Defined in: [packages/model/src/stream-handler.ts:61](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L61)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: MonitoringMessageHandlerList

Defined in: [packages/model/src/stream-handler.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L70)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: *DataStream*

Defined in: [packages/model/src/stream-handler.ts:63](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L63)

___

### upstreams

• `Optional` **upstreams**: *undefined* \| *UpstreamStreamsConfig*<*true*\>

Defined in: [packages/model/src/stream-handler.ts:58](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L58)

## Methods

### addControlHandler

▸ **addControlHandler**<T\>(`_code`: T, `handler`: [*ControlMessageHandler*](../README.md#controlmessagehandler)<T\>, `blocking?`: *boolean*): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters:

Name | Type |
------ | ------ |
`T` | ControlMessageCode |

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`_code` | T | - |
`handler` | [*ControlMessageHandler*](../README.md#controlmessagehandler)<T\> | - |
`blocking` | *boolean* | false |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:247](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L247)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<T\>(`_code`: T, `handler`: [*MonitoringMessageHandler*](../README.md#monitoringmessagehandler)<T\>, `blocking?`: *boolean*): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters:

Name | Type |
------ | ------ |
`T` | MonitoringMessageCode |

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`_code` | T | - |
`handler` | [*MonitoringMessageHandler*](../README.md#monitoringmessagehandler)<T\> | - |
`blocking` | *boolean* | false |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:235](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L235)

___

### areStreamsHooked

▸ **areStreamsHooked**(): *boolean*

**Returns:** *boolean*

Defined in: [packages/model/src/stream-handler.ts:194](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L194)

___

### getLogOutput

▸ **getLogOutput**(): LoggerOutput

**Returns:** LoggerOutput

Defined in: [packages/model/src/stream-handler.ts:198](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L198)

___

### getMonitorStream

▸ **getMonitorStream**(): *DataStream*

**Returns:** *DataStream*

Defined in: [packages/model/src/stream-handler.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L107)

___

### getStdio

▸ **getStdio**(): *object*

**Returns:** *object*

Name | Type |
------ | ------ |
`stderr` | *Readable* |
`stdin` | *Writable* |
`stdout` | *Readable* |

Defined in: [packages/model/src/stream-handler.ts:111](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L111)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`streams`: *DownstreamStreamsConfig*<*true*\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *DownstreamStreamsConfig*<*true*\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:128](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L128)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`streams`: *UpstreamStreamsConfig*<*true*\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *UpstreamStreamsConfig*<*true*\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:123](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L123)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:214](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L214)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:133](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L133)

___

### pipeStdio

▸ **pipeStdio**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [packages/model/src/stream-handler.ts:202](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L202)

___

### safeHandle

▸ **safeHandle**(`promisePotentiallyRejects`: *any*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`promisePotentiallyRejects` | *any* |

**Returns:** *void*

Defined in: [packages/model/src/stream-handler.ts:101](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L101)

___

### sendControlMessage

▸ **sendControlMessage**<T\>(`code`: T, `msg`: *MessageDataType*<T\>): *Promise*<*void*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | ControlMessageCode |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`msg` | *MessageDataType*<T\> |

**Returns:** *Promise*<*void*\>

Defined in: [packages/model/src/stream-handler.ts:265](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L265)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<T\>(`code`: T, `msg`: *MessageDataType*<T\>): *Promise*<*void*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | MonitoringMessageCode |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`msg` | *MessageDataType*<T\> |

**Returns:** *Promise*<*void*\>

Defined in: [packages/model/src/stream-handler.ts:259](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/model/src/stream-handler.ts#L259)

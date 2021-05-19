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

Defined in: [src/stream-handler.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L70)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: *undefined* \| *boolean*

Defined in: [src/stream-handler.ts:64](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L64)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: ControlMessageHandlerList

Defined in: [src/stream-handler.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L70)

___

### controlPassThrough

• `Private` **controlPassThrough**: *DataStream*

Defined in: [src/stream-handler.ts:61](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L61)

___

### downstreams

• `Optional` **downstreams**: *undefined* \| *DownstreamStreamsConfig*<*true*\>

Defined in: [src/stream-handler.ts:58](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L58)

___

### loggerPassthough

• `Private` **loggerPassthough**: *DuplexStream*<*string*, *string*\>

Defined in: [src/stream-handler.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L60)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: MonitoringMessageHandlerList

Defined in: [src/stream-handler.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L69)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: *DataStream*

Defined in: [src/stream-handler.ts:62](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L62)

___

### upstreams

• `Optional` **upstreams**: *undefined* \| *UpstreamStreamsConfig*<*true*\>

Defined in: [src/stream-handler.ts:57](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L57)

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

Defined in: [src/stream-handler.ts:245](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L245)

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

Defined in: [src/stream-handler.ts:233](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L233)

___

### areStreamsHooked

▸ **areStreamsHooked**(): *boolean*

**Returns:** *boolean*

Defined in: [src/stream-handler.ts:192](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L192)

___

### getLogOutput

▸ **getLogOutput**(): LoggerOutput

**Returns:** LoggerOutput

Defined in: [src/stream-handler.ts:196](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L196)

___

### getMonitorStream

▸ **getMonitorStream**(): *DataStream*

**Returns:** *DataStream*

Defined in: [src/stream-handler.ts:105](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L105)

___

### getStdio

▸ **getStdio**(): *object*

**Returns:** *object*

Name | Type |
------ | ------ |
`stderr` | *Readable* |
`stdin` | *Writable* |
`stdout` | *Readable* |

Defined in: [src/stream-handler.ts:109](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L109)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`streams`: *DownstreamStreamsConfig*<*true*\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *DownstreamStreamsConfig*<*true*\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [src/stream-handler.ts:126](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L126)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`streams`: *UpstreamStreamsConfig*<*true*\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`streams` | *UpstreamStreamsConfig*<*true*\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [src/stream-handler.ts:121](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L121)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [src/stream-handler.ts:212](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L212)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [src/stream-handler.ts:131](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L131)

___

### pipeStdio

▸ **pipeStdio**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Defined in: [src/stream-handler.ts:200](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L200)

___

### safeHandle

▸ **safeHandle**(`promisePotentiallyRejects`: *any*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`promisePotentiallyRejects` | *any* |

**Returns:** *void*

Defined in: [src/stream-handler.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L99)

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

Defined in: [src/stream-handler.ts:263](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L263)

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

Defined in: [src/stream-handler.ts:257](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/stream-handler.ts#L257)

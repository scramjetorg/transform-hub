[@scramjet/types](../README.md) / ICommunicationHandler

# Interface: ICommunicationHandler

## Hierarchy

* **ICommunicationHandler**

## Table of contents

### Methods

- [addControlHandler](icommunicationhandler.md#addcontrolhandler)
- [addMonitoringHandler](icommunicationhandler.md#addmonitoringhandler)
- [getLogOutput](icommunicationhandler.md#getlogoutput)
- [getMonitorStream](icommunicationhandler.md#getmonitorstream)
- [getStdio](icommunicationhandler.md#getstdio)
- [hookDownstreamStreams](icommunicationhandler.md#hookdownstreamstreams)
- [hookUpstreamStreams](icommunicationhandler.md#hookupstreamstreams)
- [pipeDataStreams](icommunicationhandler.md#pipedatastreams)
- [pipeMessageStreams](icommunicationhandler.md#pipemessagestreams)
- [pipeStdio](icommunicationhandler.md#pipestdio)
- [sendControlMessage](icommunicationhandler.md#sendcontrolmessage)
- [sendMonitoringMessage](icommunicationhandler.md#sendmonitoringmessage)

## Methods

### addControlHandler

▸ **addControlHandler**<T\>(`code`: T, `handler`: *ControlMessageHandler*<T\>): [*ICommunicationHandler*](icommunicationhandler.md)

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*ControlMessageCode*](../README.md#controlmessagecode) |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`handler` | *ControlMessageHandler*<T\> |

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L20)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<T\>(`code`: T, `handler`: *MonitoringMessageHandler*<T\>): [*ICommunicationHandler*](icommunicationhandler.md)

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*MonitoringMessageCode*](../README.md#monitoringmessagecode) |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`handler` | *MonitoringMessageHandler*<T\> |

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L18)

___

### getLogOutput

▸ **getLogOutput**(): [*LoggerOutput*](../README.md#loggeroutput)

Returns a copy of log stream for reading - does not interact with the fifo stream itself

**Returns:** [*LoggerOutput*](../README.md#loggeroutput)

Defined in: [packages/types/src/communication-handler.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L36)

___

### getMonitorStream

▸ **getMonitorStream**(): *DataStream*

Returns a copy of monitor stream for reading - does not interact with the fifo stream itself

**Returns:** *DataStream*

Defined in: [packages/types/src/communication-handler.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L32)

___

### getStdio

▸ **getStdio**(): *object*

Gets stdio streams for full interaction

**Returns:** *object*

Name | Type |
------ | ------ |
`stderr` | *Readable* |
`stdin` | *Writable* |
`stdout` | *Readable* |

Defined in: [packages/types/src/communication-handler.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L41)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`str`: [*DownstreamStreamsConfig*](../README.md#downstreamstreamsconfig)<*true*\>): [*ICommunicationHandler*](icommunicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`str` | [*DownstreamStreamsConfig*](../README.md#downstreamstreamsconfig)<*true*\> |

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L16)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`str`: [*UpstreamStreamsConfig*](../README.md#upstreamstreamsconfig)<*true*\>): [*ICommunicationHandler*](icommunicationhandler.md)

#### Parameters:

Name | Type |
------ | ------ |
`str` | [*UpstreamStreamsConfig*](../README.md#upstreamstreamsconfig)<*true*\> |

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L15)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [*ICommunicationHandler*](icommunicationhandler.md)

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L24)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [*ICommunicationHandler*](icommunicationhandler.md)

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L22)

___

### pipeStdio

▸ **pipeStdio**(): [*ICommunicationHandler*](icommunicationhandler.md)

**Returns:** [*ICommunicationHandler*](icommunicationhandler.md)

Defined in: [packages/types/src/communication-handler.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L23)

___

### sendControlMessage

▸ **sendControlMessage**<T\>(`code`: T, `msg`: [*MessageDataType*](../README.md#messagedatatype)<T\>): *Promise*<*void*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*ControlMessageCode*](../README.md#controlmessagecode) |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`msg` | [*MessageDataType*](../README.md#messagedatatype)<T\> |

**Returns:** *Promise*<*void*\>

Defined in: [packages/types/src/communication-handler.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L27)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<T\>(`code`: T, `msg`: [*MessageDataType*](../README.md#messagedatatype)<T\>): *Promise*<*void*\>

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*MonitoringMessageCode*](../README.md#monitoringmessagecode) |

#### Parameters:

Name | Type |
------ | ------ |
`code` | T |
`msg` | [*MessageDataType*](../README.md#messagedatatype)<T\> |

**Returns:** *Promise*<*void*\>

Defined in: [packages/types/src/communication-handler.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/communication-handler.ts#L26)

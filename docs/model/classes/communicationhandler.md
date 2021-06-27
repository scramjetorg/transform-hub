[@scramjet/model](../README.md) / CommunicationHandler

# Class: CommunicationHandler

## Implements

- *ICommunicationHandler*

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

Defined in: [packages/model/src/stream-handler.ts:68](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L68)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: *boolean*

Defined in: [packages/model/src/stream-handler.ts:62](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L62)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: ControlMessageHandlerList

Defined in: [packages/model/src/stream-handler.ts:68](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L68)

___

### controlPassThrough

• `Private` **controlPassThrough**: *DataStream*

Defined in: [packages/model/src/stream-handler.ts:59](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L59)

___

### downstreams

• `Optional` **downstreams**: *DownstreamStreamsConfig*<``true``\>

Defined in: [packages/model/src/stream-handler.ts:56](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L56)

___

### loggerPassthough

• `Private` **loggerPassthough**: *DuplexStream*<string, string\>

Defined in: [packages/model/src/stream-handler.ts:58](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L58)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: MonitoringMessageHandlerList

Defined in: [packages/model/src/stream-handler.ts:67](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L67)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: *DataStream*

Defined in: [packages/model/src/stream-handler.ts:60](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L60)

___

### upstreams

• `Optional` **upstreams**: *UpstreamStreamsConfig*<``true``\>

Defined in: [packages/model/src/stream-handler.ts:55](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L55)

## Methods

### addControlHandler

▸ **addControlHandler**<T\>(`_code`: T, `handler`: *ControlMessageHandler*<T\>, `blocking?`: *boolean*): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | ControlMessageCode |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_code` | T | - |
| `handler` | *ControlMessageHandler*<T\> | - |
| `blocking` | *boolean* | false |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.addControlHandler

Defined in: [packages/model/src/stream-handler.ts:244](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L244)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<T\>(`_code`: T, `handler`: *MonitoringMessageHandler*<T\>, `blocking?`: *boolean*): [*CommunicationHandler*](communicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | MonitoringMessageCode |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_code` | T | - |
| `handler` | *MonitoringMessageHandler*<T\> | - |
| `blocking` | *boolean* | false |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.addMonitoringHandler

Defined in: [packages/model/src/stream-handler.ts:232](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L232)

___

### areStreamsHooked

▸ **areStreamsHooked**(): *boolean*

**Returns:** *boolean*

Defined in: [packages/model/src/stream-handler.ts:191](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L191)

___

### getLogOutput

▸ **getLogOutput**(): LoggerOutput

**Returns:** LoggerOutput

Implementation of: ICommunicationHandler.getLogOutput

Defined in: [packages/model/src/stream-handler.ts:195](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L195)

___

### getMonitorStream

▸ **getMonitorStream**(): *DataStream*

**Returns:** *DataStream*

Implementation of: ICommunicationHandler.getMonitorStream

Defined in: [packages/model/src/stream-handler.ts:104](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L104)

___

### getStdio

▸ **getStdio**(): *object*

**Returns:** *object*

| Name | Type |
| :------ | :------ |
| `stderr` | *Readable* |
| `stdin` | *Writable* |
| `stdout` | *Readable* |

Implementation of: ICommunicationHandler.getStdio

Defined in: [packages/model/src/stream-handler.ts:108](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L108)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`streams`: *DownstreamStreamsConfig*<``true``\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | *DownstreamStreamsConfig*<``true``\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.hookDownstreamStreams

Defined in: [packages/model/src/stream-handler.ts:125](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L125)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`streams`: *UpstreamStreamsConfig*<``true``\>): [*CommunicationHandler*](communicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | *UpstreamStreamsConfig*<``true``\> |

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.hookUpstreamStreams

Defined in: [packages/model/src/stream-handler.ts:120](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L120)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeDataStreams

Defined in: [packages/model/src/stream-handler.ts:211](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L211)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeMessageStreams

Defined in: [packages/model/src/stream-handler.ts:130](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L130)

___

### pipeStdio

▸ **pipeStdio**(): [*CommunicationHandler*](communicationhandler.md)

**Returns:** [*CommunicationHandler*](communicationhandler.md)

Implementation of: ICommunicationHandler.pipeStdio

Defined in: [packages/model/src/stream-handler.ts:199](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L199)

___

### safeHandle

▸ **safeHandle**(`promisePotentiallyRejects`: *any*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `promisePotentiallyRejects` | *any* |

**Returns:** *void*

Defined in: [packages/model/src/stream-handler.ts:98](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L98)

___

### sendControlMessage

▸ **sendControlMessage**<T\>(`code`: T, `msg`: *MessageDataType*<T\>): *Promise*<void\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | ControlMessageCode |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | T |
| `msg` | *MessageDataType*<T\> |

**Returns:** *Promise*<void\>

Implementation of: ICommunicationHandler.sendControlMessage

Defined in: [packages/model/src/stream-handler.ts:262](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L262)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<T\>(`code`: T, `msg`: *MessageDataType*<T\>): *Promise*<void\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | MonitoringMessageCode |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | T |
| `msg` | *MessageDataType*<T\> |

**Returns:** *Promise*<void\>

Implementation of: ICommunicationHandler.sendMonitoringMessage

Defined in: [packages/model/src/stream-handler.ts:256](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/model/src/stream-handler.ts#L256)

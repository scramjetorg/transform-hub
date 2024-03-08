[@scramjet/types](../README.md) / [Exports](../modules.md) / ICommunicationHandler

# Interface: ICommunicationHandler

## Table of contents

### Methods

- [addControlHandler](ICommunicationHandler.md#addcontrolhandler)
- [addMonitoringHandler](ICommunicationHandler.md#addmonitoringhandler)
- [getLogOutput](ICommunicationHandler.md#getlogoutput)
- [getMonitorStream](ICommunicationHandler.md#getmonitorstream)
- [getStdio](ICommunicationHandler.md#getstdio)
- [hookDownstreamStreams](ICommunicationHandler.md#hookdownstreamstreams)
- [hookUpstreamStreams](ICommunicationHandler.md#hookupstreamstreams)
- [pipeDataStreams](ICommunicationHandler.md#pipedatastreams)
- [pipeMessageStreams](ICommunicationHandler.md#pipemessagestreams)
- [pipeStdio](ICommunicationHandler.md#pipestdio)
- [sendControlMessage](ICommunicationHandler.md#sendcontrolmessage)
- [sendMonitoringMessage](ICommunicationHandler.md#sendmonitoringmessage)
- [waitForHandshake](ICommunicationHandler.md#waitforhandshake)

### Properties

- [logger](ICommunicationHandler.md#logger)

## Methods

### addControlHandler

▸ **addControlHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../modules.md#controlmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`ControlMessageHandler`](../modules.md#controlmessagehandler)<`T`\> |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L34)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../modules.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MutatingMonitoringMessageHandler`](../modules.md#mutatingmonitoringmessagehandler)<`T`\> |
| `blocking` | ``true`` |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L27)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../modules.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MonitoringMessageHandler`](../modules.md#monitoringmessagehandler)<`T`\> |
| `blocking` | ``false`` |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L29)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../modules.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MonitoringMessageHandler`](../modules.md#monitoringmessagehandler)<`T`\> |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L31)

___

### getLogOutput

▸ **getLogOutput**(): [`LoggerOutput`](../modules.md#loggeroutput)

Returns log stream for writing

#### Returns

[`LoggerOutput`](../modules.md#loggeroutput)

#### Defined in

[packages/types/src/communication-handler.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L50)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

Returns a copy of monitor stream for reading - does not interact with the fifo stream itself

#### Returns

`DataStream`

#### Defined in

[packages/types/src/communication-handler.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L46)

___

### getStdio

▸ **getStdio**(): `Object`

Gets stdio streams for full interaction

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `stderr` | `Readable` |
| `stdin` | `Writable` |
| `stdout` | `Readable` |

#### Defined in

[packages/types/src/communication-handler.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L55)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`str`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`DownstreamStreamsConfig`](../modules.md#downstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L25)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`str`): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`UpstreamStreamsConfig`](../modules.md#upstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L24)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L38)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L36)

___

### pipeStdio

▸ **pipeStdio**(): [`ICommunicationHandler`](ICommunicationHandler.md)

#### Returns

[`ICommunicationHandler`](ICommunicationHandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L37)

___

### sendControlMessage

▸ **sendControlMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../modules.md#controlmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | [`MessageDataType`](../modules.md#messagedatatype)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/communication-handler.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L41)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../modules.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | [`MessageDataType`](../modules.md#messagedatatype)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/communication-handler.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L40)

___

### waitForHandshake

▸ **waitForHandshake**(): `Promise`<[`InstanceConnectionInfo`](../modules.md#instanceconnectioninfo)\>

#### Returns

`Promise`<[`InstanceConnectionInfo`](../modules.md#instanceconnectioninfo)\>

#### Defined in

[packages/types/src/communication-handler.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L22)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/communication-handler.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L20)

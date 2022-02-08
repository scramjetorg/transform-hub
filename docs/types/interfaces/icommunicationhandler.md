[@scramjet/types](../README.md) / [Exports](../modules.md) / ICommunicationHandler

# Interface: ICommunicationHandler

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

### Properties

- [logger](icommunicationhandler.md#logger)

## Methods

### addControlHandler

▸ **addControlHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](icommunicationhandler.md)

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

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L31)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](icommunicationhandler.md)

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

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L24)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](icommunicationhandler.md)

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

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L26)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](icommunicationhandler.md)

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

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L28)

___

### getLogOutput

▸ **getLogOutput**(): [`LoggerOutput`](../modules.md#loggeroutput)

Returns log stream for writing

#### Returns

[`LoggerOutput`](../modules.md#loggeroutput)

#### Defined in

[packages/types/src/communication-handler.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L47)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

Returns a copy of monitor stream for reading - does not interact with the fifo stream itself

#### Returns

`DataStream`

#### Defined in

[packages/types/src/communication-handler.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L43)

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

[packages/types/src/communication-handler.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L52)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`str`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`DownstreamStreamsConfig`](../modules.md#downstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L22)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`str`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`UpstreamStreamsConfig`](../modules.md#upstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L21)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L35)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L33)

___

### pipeStdio

▸ **pipeStdio**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L34)

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

[packages/types/src/communication-handler.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L38)

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

[packages/types/src/communication-handler.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L37)

## Properties

### logger

• **logger**: [`IObjectLogger`](iobjectlogger.md)

#### Defined in

[packages/types/src/communication-handler.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/communication-handler.ts#L19)

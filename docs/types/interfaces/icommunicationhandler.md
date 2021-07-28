[@scramjet/types](../README.md) / ICommunicationHandler

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

## Methods

### addControlHandler

▸ **addControlHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../README.md#controlmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`ControlMessageHandler`](../README.md#controlmessagehandler)<`T`\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L29)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MutatingMonitoringMessageHandler`](../README.md#mutatingmonitoringmessagehandler)<`T`\> |
| `blocking` | ``true`` |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L22)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`, `blocking`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MonitoringMessageHandler`](../README.md#monitoringmessagehandler)<`T`\> |
| `blocking` | ``false`` |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L24)

▸ **addMonitoringHandler**<`T`\>(`code`, `handler`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `handler` | [`MonitoringMessageHandler`](../README.md#monitoringmessagehandler)<`T`\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L26)

___

### getLogOutput

▸ **getLogOutput**(): [`LoggerOutput`](../README.md#loggeroutput)

Returns a copy of log stream for reading - does not interact with the fifo stream itself

#### Returns

[`LoggerOutput`](../README.md#loggeroutput)

#### Defined in

[packages/types/src/communication-handler.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L45)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

Returns a copy of monitor stream for reading - does not interact with the fifo stream itself

#### Returns

`DataStream`

#### Defined in

[packages/types/src/communication-handler.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L41)

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

[packages/types/src/communication-handler.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L50)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`str`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`DownstreamStreamsConfig`](../README.md#downstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L20)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`str`): [`ICommunicationHandler`](icommunicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | [`UpstreamStreamsConfig`](../README.md#upstreamstreamsconfig)<``true``\> |

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L19)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L33)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L31)

___

### pipeStdio

▸ **pipeStdio**(): [`ICommunicationHandler`](icommunicationhandler.md)

#### Returns

[`ICommunicationHandler`](icommunicationhandler.md)

#### Defined in

[packages/types/src/communication-handler.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L32)

___

### sendControlMessage

▸ **sendControlMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../README.md#controlmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | [`MessageDataType`](../README.md#messagedatatype)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/communication-handler.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L36)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | [`MessageDataType`](../README.md#messagedatatype)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/communication-handler.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/communication-handler.ts#L35)

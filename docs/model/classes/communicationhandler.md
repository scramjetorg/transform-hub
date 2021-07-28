[@scramjet/model](../README.md) / CommunicationHandler

# Class: CommunicationHandler

## Implements

- `ICommunicationHandler`

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

• **new CommunicationHandler**()

#### Defined in

[packages/model/src/stream-handler.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L72)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: `boolean`

#### Defined in

[packages/model/src/stream-handler.ts:66](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L66)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: `ControlMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L72)

___

### controlPassThrough

• `Private` **controlPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:63](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L63)

___

### downstreams

• `Optional` **downstreams**: `DownstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L60)

___

### loggerPassthough

• `Private` **loggerPassthough**: `PassThoughStream`<`string`\>

#### Defined in

[packages/model/src/stream-handler.ts:62](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L62)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: `MonitoringMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L71)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:64](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L64)

___

### upstreams

• `Optional` **upstreams**: `UpstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L59)

## Methods

### addControlHandler

▸ **addControlHandler**<`T`\>(`_code`, `handler`, `blocking?`): [`CommunicationHandler`](communicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ControlMessageCode` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_code` | `T` | `undefined` |
| `handler` | `ControlMessageHandler`<`T`\> | `undefined` |
| `blocking` | `boolean` | `false` |

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.addControlHandler

#### Defined in

[packages/model/src/stream-handler.ts:251](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L251)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<`T`\>(`_code`, `handler`, `blocking?`): [`CommunicationHandler`](communicationhandler.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `MonitoringMessageCode` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_code` | `T` | `undefined` |
| `handler` | `MonitoringMessageHandler`<`T`\> \| `MutatingMonitoringMessageHandler`<`T`\> | `undefined` |
| `blocking` | `boolean` | `false` |

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.addMonitoringHandler

#### Defined in

[packages/model/src/stream-handler.ts:239](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L239)

___

### areStreamsHooked

▸ **areStreamsHooked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/model/src/stream-handler.ts:198](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L198)

___

### getLogOutput

▸ **getLogOutput**(): `LoggerOutput`

#### Returns

`LoggerOutput`

#### Implementation of

ICommunicationHandler.getLogOutput

#### Defined in

[packages/model/src/stream-handler.ts:202](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L202)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

#### Returns

`DataStream`

#### Implementation of

ICommunicationHandler.getMonitorStream

#### Defined in

[packages/model/src/stream-handler.ts:111](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L111)

___

### getStdio

▸ **getStdio**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `stderr` | `Readable` |
| `stdin` | `Writable` |
| `stdout` | `Readable` |

#### Implementation of

ICommunicationHandler.getStdio

#### Defined in

[packages/model/src/stream-handler.ts:115](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L115)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`streams`): [`CommunicationHandler`](communicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `DownstreamStreamsConfig`<``true``\> |

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.hookDownstreamStreams

#### Defined in

[packages/model/src/stream-handler.ts:132](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L132)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`streams`): [`CommunicationHandler`](communicationhandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `UpstreamStreamsConfig`<``true``\> |

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.hookUpstreamStreams

#### Defined in

[packages/model/src/stream-handler.ts:127](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L127)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeDataStreams

#### Defined in

[packages/model/src/stream-handler.ts:218](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L218)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeMessageStreams

#### Defined in

[packages/model/src/stream-handler.ts:137](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L137)

___

### pipeStdio

▸ **pipeStdio**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeStdio

#### Defined in

[packages/model/src/stream-handler.ts:206](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L206)

___

### safeHandle

▸ **safeHandle**(`promisePotentiallyRejects`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `promisePotentiallyRejects` | `any` |

#### Returns

`void`

#### Defined in

[packages/model/src/stream-handler.ts:105](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L105)

___

### sendControlMessage

▸ **sendControlMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ControlMessageCode` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | `MessageDataType`<`T`\> |

#### Returns

`Promise`<`void`\>

#### Implementation of

ICommunicationHandler.sendControlMessage

#### Defined in

[packages/model/src/stream-handler.ts:269](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L269)

___

### sendMonitoringMessage

▸ **sendMonitoringMessage**<`T`\>(`code`, `msg`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `MonitoringMessageCode` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `T` |
| `msg` | `MessageDataType`<`T`\> |

#### Returns

`Promise`<`void`\>

#### Implementation of

ICommunicationHandler.sendMonitoringMessage

#### Defined in

[packages/model/src/stream-handler.ts:263](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/stream-handler.ts#L263)

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
- [loggerPassThrough](communicationhandler.md#loggerpassthrough)
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

[packages/model/src/stream-handler.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L74)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: `boolean`

#### Defined in

[packages/model/src/stream-handler.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L68)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: `ControlMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L74)

___

### controlPassThrough

• `Private` **controlPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L65)

___

### downstreams

• `Optional` **downstreams**: `DownstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L62)

___

### loggerPassThrough

• `Private` **loggerPassThrough**: `PassThoughStream`<`string`\>

#### Defined in

[packages/model/src/stream-handler.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L64)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: `MonitoringMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L73)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L66)

___

### upstreams

• `Optional` **upstreams**: `UpstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L61)

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

[packages/model/src/stream-handler.ts:256](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L256)

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

[packages/model/src/stream-handler.ts:244](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L244)

___

### areStreamsHooked

▸ **areStreamsHooked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/model/src/stream-handler.ts:203](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L203)

___

### getLogOutput

▸ **getLogOutput**(): `LoggerOutput`

#### Returns

`LoggerOutput`

#### Implementation of

ICommunicationHandler.getLogOutput

#### Defined in

[packages/model/src/stream-handler.ts:207](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L207)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

#### Returns

`DataStream`

#### Implementation of

ICommunicationHandler.getMonitorStream

#### Defined in

[packages/model/src/stream-handler.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L116)

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

[packages/model/src/stream-handler.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L120)

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

[packages/model/src/stream-handler.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L137)

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

[packages/model/src/stream-handler.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L132)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeDataStreams

#### Defined in

[packages/model/src/stream-handler.ts:223](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L223)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeMessageStreams

#### Defined in

[packages/model/src/stream-handler.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L142)

___

### pipeStdio

▸ **pipeStdio**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeStdio

#### Defined in

[packages/model/src/stream-handler.ts:211](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L211)

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

[packages/model/src/stream-handler.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L109)

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

[packages/model/src/stream-handler.ts:274](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L274)

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

[packages/model/src/stream-handler.ts:268](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L268)

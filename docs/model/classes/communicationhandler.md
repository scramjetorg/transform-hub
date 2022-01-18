[@scramjet/model](../README.md) / [Exports](../modules.md) / CommunicationHandler

# Class: CommunicationHandler

## Implements

- `ICommunicationHandler`

## Table of contents

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

### Constructors

- [constructor](communicationhandler.md#constructor)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: `boolean`

#### Defined in

[packages/model/src/stream-handler.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L65)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: `ControlMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L71)

___

### controlPassThrough

• `Private` **controlPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L62)

___

### downstreams

• `Optional` **downstreams**: `DownstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L59)

___

### loggerPassThrough

• `Private` **loggerPassThrough**: `PassThoughStream`<`string`\>

#### Defined in

[packages/model/src/stream-handler.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L61)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: `MonitoringMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L70)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L63)

___

### upstreams

• `Optional` **upstreams**: `UpstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L58)

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

[packages/model/src/stream-handler.ts:250](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L250)

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

[packages/model/src/stream-handler.ts:238](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L238)

___

### areStreamsHooked

▸ **areStreamsHooked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/model/src/stream-handler.ts:197](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L197)

___

### getLogOutput

▸ **getLogOutput**(): `LoggerOutput`

#### Returns

`LoggerOutput`

#### Implementation of

ICommunicationHandler.getLogOutput

#### Defined in

[packages/model/src/stream-handler.ts:201](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L201)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

#### Returns

`DataStream`

#### Implementation of

ICommunicationHandler.getMonitorStream

#### Defined in

[packages/model/src/stream-handler.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L110)

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

[packages/model/src/stream-handler.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L114)

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

[packages/model/src/stream-handler.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L131)

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

[packages/model/src/stream-handler.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L126)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeDataStreams

#### Defined in

[packages/model/src/stream-handler.ts:217](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L217)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeMessageStreams

#### Defined in

[packages/model/src/stream-handler.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L136)

___

### pipeStdio

▸ **pipeStdio**(): [`CommunicationHandler`](communicationhandler.md)

#### Returns

[`CommunicationHandler`](communicationhandler.md)

#### Implementation of

ICommunicationHandler.pipeStdio

#### Defined in

[packages/model/src/stream-handler.ts:205](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L205)

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

[packages/model/src/stream-handler.ts:103](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L103)

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

[packages/model/src/stream-handler.ts:268](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L268)

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

[packages/model/src/stream-handler.ts:262](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L262)

## Constructors

### constructor

• **new CommunicationHandler**()

#### Defined in

[packages/model/src/stream-handler.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L71)

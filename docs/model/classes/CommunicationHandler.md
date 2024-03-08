[@scramjet/model](../README.md) / [Exports](../modules.md) / CommunicationHandler

# Class: CommunicationHandler

## Implements

- `ICommunicationHandler`

## Table of contents

### Properties

- [\_piped](CommunicationHandler.md#_piped)
- [controlHandlerHash](CommunicationHandler.md#controlhandlerhash)
- [controlPassThrough](CommunicationHandler.md#controlpassthrough)
- [downstreams](CommunicationHandler.md#downstreams)
- [logger](CommunicationHandler.md#logger)
- [loggerPassThrough](CommunicationHandler.md#loggerpassthrough)
- [monitoringHandlerHash](CommunicationHandler.md#monitoringhandlerhash)
- [monitoringPassThrough](CommunicationHandler.md#monitoringpassthrough)
- [upstreams](CommunicationHandler.md#upstreams)

### Methods

- [addControlHandler](CommunicationHandler.md#addcontrolhandler)
- [addMonitoringHandler](CommunicationHandler.md#addmonitoringhandler)
- [areStreamsHooked](CommunicationHandler.md#arestreamshooked)
- [getLogOutput](CommunicationHandler.md#getlogoutput)
- [getMonitorStream](CommunicationHandler.md#getmonitorstream)
- [getStdio](CommunicationHandler.md#getstdio)
- [hookDownstreamStreams](CommunicationHandler.md#hookdownstreamstreams)
- [hookUpstreamStreams](CommunicationHandler.md#hookupstreamstreams)
- [pipeDataStreams](CommunicationHandler.md#pipedatastreams)
- [pipeMessageStreams](CommunicationHandler.md#pipemessagestreams)
- [pipeStdio](CommunicationHandler.md#pipestdio)
- [safeHandle](CommunicationHandler.md#safehandle)
- [sendControlMessage](CommunicationHandler.md#sendcontrolmessage)
- [sendMonitoringMessage](CommunicationHandler.md#sendmonitoringmessage)
- [waitForHandshake](CommunicationHandler.md#waitforhandshake)

### Constructors

- [constructor](CommunicationHandler.md#constructor)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: `boolean`

#### Defined in

[packages/model/src/stream-handler.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L74)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: `ControlMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L80)

___

### controlPassThrough

• `Private` **controlPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L71)

___

### downstreams

• `Optional` **downstreams**: `DownstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L68)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ICommunicationHandler.logger

#### Defined in

[packages/model/src/stream-handler.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L65)

___

### loggerPassThrough

• `Private` **loggerPassThrough**: `PassThoughStream`<`string`\>

#### Defined in

[packages/model/src/stream-handler.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L70)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: `MonitoringMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L79)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L72)

___

### upstreams

• `Optional` **upstreams**: `UpstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L67)

## Methods

### addControlHandler

▸ **addControlHandler**<`T`\>(`_code`, `handler`, `blocking?`): [`CommunicationHandler`](CommunicationHandler.md)

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

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.addControlHandler

#### Defined in

[packages/model/src/stream-handler.ts:295](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L295)

___

### addMonitoringHandler

▸ **addMonitoringHandler**<`T`\>(`_code`, `handler`, `blocking?`): [`CommunicationHandler`](CommunicationHandler.md)

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

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.addMonitoringHandler

#### Defined in

[packages/model/src/stream-handler.ts:282](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L282)

___

### areStreamsHooked

▸ **areStreamsHooked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/model/src/stream-handler.ts:240](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L240)

___

### getLogOutput

▸ **getLogOutput**(): `LoggerOutput`

#### Returns

`LoggerOutput`

#### Implementation of

ICommunicationHandler.getLogOutput

#### Defined in

[packages/model/src/stream-handler.ts:244](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L244)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

#### Returns

`DataStream`

#### Implementation of

ICommunicationHandler.getMonitorStream

#### Defined in

[packages/model/src/stream-handler.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L126)

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

[packages/model/src/stream-handler.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L130)

___

### hookDownstreamStreams

▸ **hookDownstreamStreams**(`streams`): [`CommunicationHandler`](CommunicationHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `DownstreamStreamsConfig`<``true``\> |

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.hookDownstreamStreams

#### Defined in

[packages/model/src/stream-handler.ts:148](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L148)

___

### hookUpstreamStreams

▸ **hookUpstreamStreams**(`streams`): [`CommunicationHandler`](CommunicationHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | `UpstreamStreamsConfig`<``true``\> |

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.hookUpstreamStreams

#### Defined in

[packages/model/src/stream-handler.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L143)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeDataStreams

#### Defined in

[packages/model/src/stream-handler.ts:261](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L261)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeMessageStreams

#### Defined in

[packages/model/src/stream-handler.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L161)

___

### pipeStdio

▸ **pipeStdio**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeStdio

#### Defined in

[packages/model/src/stream-handler.ts:248](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L248)

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

[packages/model/src/stream-handler.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L120)

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

[packages/model/src/stream-handler.ts:314](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L314)

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

[packages/model/src/stream-handler.ts:308](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L308)

___

### waitForHandshake

▸ **waitForHandshake**(): `Promise`<`InstanceConnectionInfo`\>

#### Returns

`Promise`<`InstanceConnectionInfo`\>

#### Implementation of

ICommunicationHandler.waitForHandshake

#### Defined in

[packages/model/src/stream-handler.ts:153](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L153)

## Constructors

### constructor

• **new CommunicationHandler**()

#### Defined in

[packages/model/src/stream-handler.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L82)

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

### Constructors

- [constructor](CommunicationHandler.md#constructor)

## Properties

### \_piped

• `Private` `Optional` **\_piped**: `boolean`

#### Defined in

[packages/model/src/stream-handler.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L72)

___

### controlHandlerHash

• `Private` **controlHandlerHash**: `ControlMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L78)

___

### controlPassThrough

• `Private` **controlPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L69)

___

### downstreams

• `Optional` **downstreams**: `DownstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L66)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ICommunicationHandler.logger

#### Defined in

[packages/model/src/stream-handler.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L63)

___

### loggerPassThrough

• `Private` **loggerPassThrough**: `PassThoughStream`<`string`\>

#### Defined in

[packages/model/src/stream-handler.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L68)

___

### monitoringHandlerHash

• `Private` **monitoringHandlerHash**: `MonitoringMessageHandlerList`

#### Defined in

[packages/model/src/stream-handler.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L77)

___

### monitoringPassThrough

• `Private` **monitoringPassThrough**: `DataStream`

#### Defined in

[packages/model/src/stream-handler.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L70)

___

### upstreams

• `Optional` **upstreams**: `UpstreamStreamsConfig`<``true``\>

#### Defined in

[packages/model/src/stream-handler.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L65)

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

[packages/model/src/stream-handler.ts:283](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L283)

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

[packages/model/src/stream-handler.ts:270](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L270)

___

### areStreamsHooked

▸ **areStreamsHooked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/model/src/stream-handler.ts:228](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L228)

___

### getLogOutput

▸ **getLogOutput**(): `LoggerOutput`

#### Returns

`LoggerOutput`

#### Implementation of

ICommunicationHandler.getLogOutput

#### Defined in

[packages/model/src/stream-handler.ts:232](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L232)

___

### getMonitorStream

▸ **getMonitorStream**(): `DataStream`

#### Returns

`DataStream`

#### Implementation of

ICommunicationHandler.getMonitorStream

#### Defined in

[packages/model/src/stream-handler.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L123)

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

[packages/model/src/stream-handler.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L127)

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

[packages/model/src/stream-handler.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L145)

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

[packages/model/src/stream-handler.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L140)

___

### pipeDataStreams

▸ **pipeDataStreams**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeDataStreams

#### Defined in

[packages/model/src/stream-handler.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L249)

___

### pipeMessageStreams

▸ **pipeMessageStreams**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeMessageStreams

#### Defined in

[packages/model/src/stream-handler.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L150)

___

### pipeStdio

▸ **pipeStdio**(): [`CommunicationHandler`](CommunicationHandler.md)

#### Returns

[`CommunicationHandler`](CommunicationHandler.md)

#### Implementation of

ICommunicationHandler.pipeStdio

#### Defined in

[packages/model/src/stream-handler.ts:236](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L236)

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

[packages/model/src/stream-handler.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L117)

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

[packages/model/src/stream-handler.ts:302](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L302)

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

[packages/model/src/stream-handler.ts:296](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L296)

## Constructors

### constructor

• **new CommunicationHandler**()

#### Defined in

[packages/model/src/stream-handler.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L80)

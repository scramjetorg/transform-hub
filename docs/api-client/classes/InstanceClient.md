[@scramjet/api-client](../README.md) / [Exports](../modules.md) / InstanceClient

# Class: InstanceClient

Instance client.
Provides methods to interact with Instance.

## Table of contents

### Properties

- [\_id](InstanceClient.md#_id)
- [host](InstanceClient.md#host)
- [instanceURL](InstanceClient.md#instanceurl)

### Accessors

- [clientUtils](InstanceClient.md#clientutils)
- [id](InstanceClient.md#id)

### Constructors

- [constructor](InstanceClient.md#constructor)

### Methods

- [from](InstanceClient.md#from)
- [getEvent](InstanceClient.md#getevent)
- [getEventStream](InstanceClient.md#geteventstream)
- [getHealth](InstanceClient.md#gethealth)
- [getInfo](InstanceClient.md#getinfo)
- [getNextEvent](InstanceClient.md#getnextevent)
- [getStream](InstanceClient.md#getstream)
- [inout](InstanceClient.md#inout)
- [kill](InstanceClient.md#kill)
- [sendEvent](InstanceClient.md#sendevent)
- [sendInput](InstanceClient.md#sendinput)
- [sendStdin](InstanceClient.md#sendstdin)
- [sendStream](InstanceClient.md#sendstream)
- [stop](InstanceClient.md#stop)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[api-client/src/instance-client.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L13)

___

### host

• `Private` **host**: `ClientProvider`

#### Defined in

[api-client/src/instance-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L15)

___

### instanceURL

• `Private` **instanceURL**: `string`

#### Defined in

[api-client/src/instance-client.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L14)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): `HttpClientNode`

#### Returns

`HttpClientNode`

#### Defined in

[api-client/src/instance-client.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L21)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[api-client/src/instance-client.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L17)

## Constructors

### constructor

• `Private` **new InstanceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | `ClientProvider` |

#### Defined in

[api-client/src/instance-client.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L36)

## Methods

### from

▸ `Static` **from**(`id`, `host`): [`InstanceClient`](InstanceClient.md)

Creates and returns InstanceClient for given id and host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance id |
| `host` | `ClientProvider` | Host client. |

#### Returns

[`InstanceClient`](InstanceClient.md)

Instance client.

#### Defined in

[api-client/src/instance-client.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L32)

___

### getEvent

▸ **getEvent**(`eventName`): `Promise`<`any`\>

Return last data from event given in eventName.
Waits for event if it was never fired.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<`any`\>

Promise resolving to event data.

#### Defined in

[api-client/src/instance-client.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L115)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<`Readable`\>

Fetches event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | event name |

#### Returns

`Promise`<`Readable`\>

stream of events from Instance

#### Defined in

[api-client/src/instance-client.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L125)

___

### getHealth

▸ **getHealth**(): `Promise`<`GetHealthResponse`\>

Returns Instance health.

#### Returns

`Promise`<`GetHealthResponse`\>

Promise resolving to Instance health.

#### Defined in

[api-client/src/instance-client.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L134)

___

### getInfo

▸ **getInfo**(): `Promise`<`GetInstanceResponse`\>

Returns Instance info.

#### Returns

`Promise`<`GetInstanceResponse`\>

Promise resolving to Instance info.

#### Defined in

[api-client/src/instance-client.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L143)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<`any`\>

Waits and returns next event sent by Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<`any`\>

Promise resolving to event data.

#### Defined in

[api-client/src/instance-client.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L104)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<`Readable`\>

Returns readable stream from Instance.
Stream can be one of type [InstanceOutputStream](../modules.md#instanceoutputstream).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../modules.md#instanceoutputstream) | Stream id. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to readable stream.

#### Defined in

[api-client/src/instance-client.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L154)

___

### inout

▸ **inout**(`stream`, `requestInit?`, `options?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` \| `Readable` |
| `requestInit?` | `RequestInit` |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> |

#### Returns

`Promise`<`any`\>

#### Defined in

[api-client/src/instance-client.ts:183](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L183)

___

### kill

▸ **kill**(`opts?`): `Promise`<`Instance`\>

Send kill command to Instance

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `KillMessageData` | Options. |

#### Returns

`Promise`<`Instance`\>

Promise resolving to kill Instance result.

#### Defined in

[api-client/src/instance-client.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L70)

___

### sendEvent

▸ **sendEvent**(`eventName`, `message`): `Promise`<`ControlMessageResponse`\>

Sends event to the Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `message` | `string` | Event data to send. |

#### Returns

`Promise`<`ControlMessageResponse`\>

Promise resolving to send event result.

#### Defined in

[api-client/src/instance-client.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L86)

___

### sendInput

▸ **sendInput**(`stream`, `requestInit?`, `options?`): `Promise`<`any`\>

Pipes given stream to Instance "input".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Readable` | Stream to be piped. Or string written to "stdin" stream. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> | Request options |

#### Returns

`Promise`<`any`\>

Promise resolving to send stream result.

#### Defined in

[api-client/src/instance-client.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L179)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<`any`\>

Pipes given stream to Instance "stdin".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Readable` | Stream to be piped. Or string written to "stdin" stream. |

#### Returns

`Promise`<`any`\>

Promise resolving to send stream result.

#### Defined in

[api-client/src/instance-client.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L193)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `requestInit?`, `options?`): `Promise`<`any`\>

Sends stream to one of the Instance inputs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceInputStream`](../modules.md#instanceinputstream) | Target input stream. |
| `stream` | `string` \| `Readable` | Stream to send. |
| `requestInit?` | `RequestInit` | RequestInit object to be passed to fetch. |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"text"`` \| ``"json"`` \| ``"stream"`` ; `put`: `boolean` ; `type`: `string`  }\> | Stream options. |

#### Returns

`Promise`<`any`\>

Promise resolving to send stream result.

#### Defined in

[api-client/src/instance-client.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L167)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<`Instance`\>

Send stop command to Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | Timeout in milliseconds to graceful stop |
| `canCallKeepalive` | `boolean` | If true, Instance can call keepAlive. |

#### Returns

`Promise`<`Instance`\>

Promise resolving to stop Instance result.

#### Defined in

[api-client/src/instance-client.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L54)

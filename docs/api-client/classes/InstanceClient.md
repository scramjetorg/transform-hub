[@scramjet/api-client](../README.md) / InstanceClient

# Class: InstanceClient

Instance client.
Provides methods to interact with instance.

## Table of contents

### Constructors

- [constructor](InstanceClient.md#constructor)

### Properties

- [\_id](InstanceClient.md#_id)
- [host](InstanceClient.md#host)
- [instanceURL](InstanceClient.md#instanceurl)

### Accessors

- [clientUtils](InstanceClient.md#clientutils)
- [id](InstanceClient.md#id)

### Methods

- [getEvent](InstanceClient.md#getevent)
- [getEventStream](InstanceClient.md#geteventstream)
- [getHealth](InstanceClient.md#gethealth)
- [getInfo](InstanceClient.md#getinfo)
- [getNextEvent](InstanceClient.md#getnextevent)
- [getStatus](InstanceClient.md#getstatus)
- [getStream](InstanceClient.md#getstream)
- [kill](InstanceClient.md#kill)
- [sendEvent](InstanceClient.md#sendevent)
- [sendInput](InstanceClient.md#sendinput)
- [sendStdin](InstanceClient.md#sendstdin)
- [sendStream](InstanceClient.md#sendstream)
- [stop](InstanceClient.md#stop)
- [from](InstanceClient.md#from)

## Constructors

### constructor

• `Private` **new InstanceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[packages/api-client/src/instance-client.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L38)

## Properties

### \_id

• `Private` **\_id**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L15)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[packages/api-client/src/instance-client.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L17)

___

### instanceURL

• `Private` **instanceURL**: `string`

#### Defined in

[packages/api-client/src/instance-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L16)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[packages/api-client/src/instance-client.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L23)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/api-client/src/instance-client.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L19)

## Methods

### getEvent

▸ **getEvent**(`eventName`): `Promise`<[`Response`](../README.md#response)\>

Return last data from event givent in eventName.
Waits for event if it was never fired.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Promise resolving with event data.

#### Defined in

[packages/api-client/src/instance-client.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L112)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

Fetches event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | event name |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

stream of events from instance

#### Defined in

[packages/api-client/src/instance-client.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L122)

___

### getHealth

▸ **getHealth**(): `Promise`<[`Response`](../README.md#response)\>

Returns instance health.

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L129)

___

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../README.md#response)\>

Returns instance info.

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L143)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<[`Response`](../README.md#response)\>

Waits and returns next event sent by instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Promise resolving with event data.

#### Defined in

[packages/api-client/src/instance-client.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L101)

___

### getStatus

▸ **getStatus**(): `Promise`<[`Response`](../README.md#response)\>

Returns instance status.

#### Returns

`Promise`<[`Response`](../README.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L136)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<[`ResponseStream`](../README.md#responsestream)\>

Returns readable stream from instance.
Stream can be one of type [InstanceOutputStream](../README.md#instanceoutputstream).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../README.md#instanceoutputstream) | Stream id. |

#### Returns

`Promise`<[`ResponseStream`](../README.md#responsestream)\>

Promise resolving to stream.

#### Defined in

[packages/api-client/src/instance-client.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L154)

___

### kill

▸ **kill**(): `Promise`<[`Response`](../README.md#response)\>

Send kill command to instance

#### Returns

`Promise`<[`Response`](../README.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/instance-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L69)

___

### sendEvent

▸ **sendEvent**(`eventName`, `message`): `Promise`<[`Response`](../README.md#response)\>

Sends event to the Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `message` | `string` | Event data to send. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/instance-client.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L85)

___

### sendInput

▸ **sendInput**(`stream`, `options?`): `Promise`<[`Response`](../README.md#response)\>

Pipes given stream to instance "input".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |
| `options?` | `Partial`<`Object`\> | Request options |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Promise resolving to response.

#### Defined in

[packages/api-client/src/instance-client.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L178)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<[`Response`](../README.md#response)\>

Pipes given stream to instance "stdin".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Promise resolving to response.

#### Defined in

[packages/api-client/src/instance-client.ts:188](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L188)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `options?`): `Promise`<[`Response`](../README.md#response)\>

Sends stream to one of the instance inputs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceInputStream`](../README.md#instanceinputstream) | Target input stream. |
| `stream` | `string` \| `Stream` | Stream to send. |
| `options?` | `Partial`<`Object`\> | - |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

Promise resolving to stream.

#### Defined in

[packages/api-client/src/instance-client.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L167)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<[`Response`](../README.md#response)\>

Send stop command to instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | Timeout in milliseconds to graceful stop |
| `canCallKeepalive` | `boolean` | If true, instance can call keepAlive. |

#### Returns

`Promise`<[`Response`](../README.md#response)\>

TODO: comment

#### Defined in

[packages/api-client/src/instance-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L55)

___

### from

▸ `Static` **from**(`id`, `host`): [`InstanceClient`](InstanceClient.md)

Creates and returns InstanceClient for given id and host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance id |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) | Host client. |

#### Returns

[`InstanceClient`](InstanceClient.md)

Instance client.

#### Defined in

[packages/api-client/src/instance-client.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L34)

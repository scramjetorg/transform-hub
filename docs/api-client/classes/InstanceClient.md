[@scramjet/api-client](../README.md) / [Exports](../modules.md) / InstanceClient

# Class: InstanceClient

Instance client.
Provides methods to interact with instance.

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
- [getStatus](InstanceClient.md#getstatus)
- [getStream](InstanceClient.md#getstream)
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

## Methods

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

___

### getEvent

▸ **getEvent**(`eventName`): `Promise`<[`Response`](../modules.md#response)\>

Return last data from event givent in eventName.
Waits for event if it was never fired.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving with event data.

#### Defined in

[packages/api-client/src/instance-client.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L112)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Fetches event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | event name |

#### Returns

`Promise`<[`ResponseStream`](../modules.md#responsestream)\>

stream of events from instance

#### Defined in

[packages/api-client/src/instance-client.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L122)

___

### getHealth

▸ **getHealth**(): `Promise`<[`Response`](../modules.md#response)\>

Returns instance health.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L129)

___

### getInfo

▸ **getInfo**(): `Promise`<[`Response`](../modules.md#response)\>

Returns instance info.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L143)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<[`Response`](../modules.md#response)\>

Waits and returns next event sent by instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving with event data.

#### Defined in

[packages/api-client/src/instance-client.ts:101](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L101)

___

### getStatus

▸ **getStatus**(): `Promise`<[`Response`](../modules.md#response)\>

Returns instance status.

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

#### Defined in

[packages/api-client/src/instance-client.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L136)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Returns readable stream from instance.
Stream can be one of type [InstanceOutputStream](../modules.md#instanceoutputstream).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../modules.md#instanceoutputstream) | Stream id. |

#### Returns

`Promise`<[`ResponseStream`](../modules.md#responsestream)\>

Promise resolving to stream.

#### Defined in

[packages/api-client/src/instance-client.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L154)

___

### kill

▸ **kill**(): `Promise`<[`Response`](../modules.md#response)\>

Send kill command to instance

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/instance-client.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L69)

___

### sendEvent

▸ **sendEvent**(`eventName`, `message`): `Promise`<[`Response`](../modules.md#response)\>

Sends event to the Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |
| `message` | `string` | Event data to send. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

TODO: comment.

#### Defined in

[packages/api-client/src/instance-client.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L85)

___

### sendInput

▸ **sendInput**(`stream`, `options?`): `Promise`<[`Response`](../modules.md#response)\>

Pipes given stream to instance "input".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |
| `options?` | `Partial`<`Object`\> | Request options |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to response.

#### Defined in

[packages/api-client/src/instance-client.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L178)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<[`Response`](../modules.md#response)\>

Pipes given stream to instance "stdin".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to response.

#### Defined in

[packages/api-client/src/instance-client.ts:188](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L188)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `options?`): `Promise`<[`Response`](../modules.md#response)\>

Sends stream to one of the instance inputs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceInputStream`](../modules.md#instanceinputstream) | Target input stream. |
| `stream` | `string` \| `Stream` | Stream to send. |
| `options?` | `Partial`<`Object`\> | - |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

Promise resolving to stream.

#### Defined in

[packages/api-client/src/instance-client.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L167)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<[`Response`](../modules.md#response)\>

Send stop command to instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | Timeout in milliseconds to graceful stop |
| `canCallKeepalive` | `boolean` | If true, instance can call keepAlive. |

#### Returns

`Promise`<[`Response`](../modules.md#response)\>

TODO: comment

#### Defined in

[packages/api-client/src/instance-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L55)

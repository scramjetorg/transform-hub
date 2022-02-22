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

[instance-client.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L15)

___

### host

• `Private` **host**: [`ClientProvider`](../interfaces/ClientProvider.md)

#### Defined in

[instance-client.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L17)

___

### instanceURL

• `Private` **instanceURL**: `string`

#### Defined in

[instance-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L16)

## Accessors

### clientUtils

• `Private` `get` **clientUtils**(): [`HttpClient`](../interfaces/HttpClient.md)

#### Returns

[`HttpClient`](../interfaces/HttpClient.md)

#### Defined in

[instance-client.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L23)

___

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[instance-client.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L19)

## Constructors

### constructor

• `Private` **new InstanceClient**(`id`, `host`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `host` | [`ClientProvider`](../interfaces/ClientProvider.md) |

#### Defined in

[instance-client.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L38)

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

[instance-client.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L34)

___

### getEvent

▸ **getEvent**(`eventName`): `Promise`<`any`\>

Return last data from event givent in eventName.
Waits for event if it was never fired.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<`any`\>

Promise resolving to event data.

#### Defined in

[instance-client.ts:120](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L120)

___

### getEventStream

▸ **getEventStream**(`eventName`): `Promise`<`Stream`\>

Fetches event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | event name |

#### Returns

`Promise`<`Stream`\>

stream of events from Instance

#### Defined in

[instance-client.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L130)

___

### getHealth

▸ **getHealth**(): `Promise`<`GetHealthResponse`\>

Returns instance health.

#### Returns

`Promise`<`GetHealthResponse`\>

Promise resolving to Instance health.

#### Defined in

[instance-client.ts:139](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L139)

___

### getInfo

▸ **getInfo**(): `Promise`<`Instance`\>

Returns instance info.

#### Returns

`Promise`<`Instance`\>

Promise resolving to Instance info.

#### Defined in

[instance-client.ts:148](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L148)

___

### getNextEvent

▸ **getNextEvent**(`eventName`): `Promise`<`any`\>

Waits and returns next event sent by instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` | Event name. |

#### Returns

`Promise`<`any`\>

Promise resolving to event data.

#### Defined in

[instance-client.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L109)

___

### getStream

▸ **getStream**(`streamId`): `Promise`<`Stream`\>

Returns readable stream from instance.
Stream can be one of type [InstanceOutputStream](../modules.md#instanceoutputstream).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceOutputStream`](../modules.md#instanceoutputstream) | Stream id. |

#### Returns

`Promise`<`Stream`\>

Promise resolving to stream.

#### Defined in

[instance-client.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L159)

___

### kill

▸ **kill**(): `Promise`<`ControlMessageResponse`\>

Send kill command to instance

#### Returns

`Promise`<`ControlMessageResponse`\>

Promise resolving to kill Instance result.

#### Defined in

[instance-client.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L75)

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

[instance-client.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L91)

___

### sendInput

▸ **sendInput**(`stream`, `options?`): `Promise`<`any`\>

Pipes given stream to instance "input".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"json"`` \| ``"text"`` ; `type`: `string`  }\> | Request options |

#### Returns

`Promise`<`any`\>

Promise resolving to response.

#### Defined in

[instance-client.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L182)

___

### sendStdin

▸ **sendStdin**(`stream`): `Promise`<`any`\>

Pipes given stream to instance "stdin".

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `string` \| `Stream` | Stream to be piped. Or string writen to "stdin" stream. |

#### Returns

`Promise`<`any`\>

Promise resolving to response.

#### Defined in

[instance-client.ts:192](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L192)

___

### sendStream

▸ **sendStream**(`streamId`, `stream`, `options?`): `Promise`<`any`\>

Sends stream to one of the instance inputs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `streamId` | [`InstanceInputStream`](../modules.md#instanceinputstream) | Target input stream. |
| `stream` | `string` \| `Stream` | Stream to send. |
| `options?` | `Partial`<{ `end`: `boolean` ; `parseResponse?`: ``"json"`` \| ``"text"`` ; `type`: `string`  }\> | - |

#### Returns

`Promise`<`any`\>

Promise resolving to stream.

#### Defined in

[instance-client.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L171)

___

### stop

▸ **stop**(`timeout`, `canCallKeepalive`): `Promise`<`ControlMessageResponse`\>

Send stop command to instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | Timeout in milliseconds to graceful stop |
| `canCallKeepalive` | `boolean` | If true, instance can call keepAlive. |

#### Returns

`Promise`<`ControlMessageResponse`\>

Promise resolving to stop Instance result.

#### Defined in

[instance-client.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-client/src/instance-client.ts#L55)

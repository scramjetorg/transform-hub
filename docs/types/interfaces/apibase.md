[@scramjet/types](../README.md) / APIBase

# Interface: APIBase

## Hierarchy

- **`APIBase`**

  ↳ [`APIExpose`](apiexpose.md)

  ↳ [`APIRoute`](apiroute.md)

## Table of contents

### Methods

- [downstream](apibase.md#downstream)
- [duplex](apibase.md#duplex)
- [get](apibase.md#get)
- [op](apibase.md#op)
- [upstream](apibase.md#upstream)

## Methods

### downstream

▸ **downstream**(`path`, `stream`, `config?`): `void`

A method that allows to consume incoming stream from the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamOutput`](../README.md#streamoutput) | the output that will be piped to from request or a method to be called then |
| `config?` | [`StreamConfig`](../README.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L107)

___

### duplex

▸ **duplex**(`path`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `callback` | (`stream`: `Duplex`, `headers`: `IncomingHttpHeaders`) => `void` |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:113](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L113)

___

### get

▸ **get**<`T`\>(`path`, `msg`, `conn`): `void`

Simple GET request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MonitoringMessageCode`](../README.md#monitoringmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | `T` | - |
| `conn` | [`ICommunicationHandler`](icommunicationhandler.md) | the communication handler to use |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:79](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L79)

▸ **get**(`path`, `msg`): `void`

Alternative GET request hook with dynamic resolution

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `msg` | [`GetResolver`](../README.md#getresolver) | - |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:87](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L87)

___

### op

▸ **op**<`T`\>(`method`, `path`, `message`, `conn?`): `void`

Simple POST request hook for static data in monitoring stream.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ControlMessageCode`](../README.md#controlmessagecode) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `method` | [`HttpMethod`](../README.md#httpmethod) | - |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `message` | [`OpResolver`](../README.md#opresolver) \| `T` | which operation to expose |
| `conn?` | [`ICommunicationHandler`](icommunicationhandler.md) | the communication handler to use |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L70)

___

### upstream

▸ **upstream**(`path`, `stream`, `config?`): `void`

A method that allows to pass a stream to the specified path on the API server

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` \| `RegExp` | the request path as string or regex |
| `stream` | [`StreamInput`](../README.md#streaminput) | the stream that will be sent in reponse body or a method to be called then |
| `config?` | [`StreamConfig`](../README.md#streamconfig) | configuration of the stream |

#### Returns

`void`

#### Defined in

[packages/types/src/api-expose.ts:95](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/types/src/api-expose.ts#L95)

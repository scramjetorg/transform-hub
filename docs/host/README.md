@scramjet/host

# @scramjet/host

## Table of contents

### Classes

- [CPMConnector](classes/CPMConnector.md)
- [CSIController](classes/CSIController.md)
- [CommonLogsPipe](classes/CommonLogsPipe.md)
- [Host](classes/Host.md)
- [ServiceDiscovery](classes/ServiceDiscovery.md)
- [SocketServer](classes/SocketServer.md)

### Type aliases

- [HostOptions](README.md#hostoptions)
- [dataType](README.md#datatype)
- [streamType](README.md#streamtype)
- [topicDataType](README.md#topicdatatype)

### Variables

- [InstanceStore](README.md#instancestore)

### Functions

- [startHost](README.md#starthost)

## Type aliases

### HostOptions

Ƭ **HostOptions**: `Partial`<`Object`\>

#### Defined in

[packages/host/src/lib/host.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L23)

___

### dataType

Ƭ **dataType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `topic` | `string` |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L7)

___

### streamType

Ƭ **streamType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `stream` | `Stream` |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L12)

___

### topicDataType

Ƭ **topicDataType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `cpmRequest?` | `boolean` |
| `localProvider?` | `string` |
| `stream` | `ReadableStream`<`any`\> \| `WritableStream`<`any`\> |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L16)

## Variables

### InstanceStore

• **InstanceStore**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: [`CSIController`](classes/CSIController.md)

#### Defined in

[packages/host/src/lib/instance-store.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/instance-store.ts#L3)

## Functions

### startHost

▸ **startHost**(`apiServerConfig`, `sthConfig`, `hostOptions`): `Promise`<[`Host`](classes/Host.md)\>

Starts Host module.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServerConfig` | `ServerConfig` | api server configuration |
| `sthConfig` | `STHConfiguration` | sth configuration |
| `hostOptions` | `Partial`<`Object`\> | host options |

#### Returns

`Promise`<[`Host`](classes/Host.md)\>

#### Defined in

[packages/host/src/lib/start-host.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/start-host.ts#L13)

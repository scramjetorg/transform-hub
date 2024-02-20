[@scramjet/host](README.md) / Exports

# @scramjet/host

## Table of contents

### Classes

- [CPMConnector](classes/CPMConnector.md)
- [CSIController](classes/CSIController.md)
- [CommonLogsPipe](classes/CommonLogsPipe.md)
- [Host](classes/Host.md)
- [ServiceDiscovery](classes/ServiceDiscovery.md)
- [SocketServer](classes/SocketServer.md)

### Type Aliases

- [DataType](modules.md#datatype)
- [StreamType](modules.md#streamtype)
- [TopicDataType](modules.md#topicdatatype)

### Variables

- [InstanceStore](modules.md#instancestore)

### Functions

- [startHost](modules.md#starthost)

## Type Aliases

### DataType

Ƭ **DataType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `ContentType` |
| `topic` | `TopicId` |

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L10)

___

### StreamType

Ƭ **StreamType**: `Object`

Topic stream type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `stream` | `Duplex` |

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L18)

___

### TopicDataType

Ƭ **TopicDataType**: `Object`

Topic details type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `cpmRequest?` | `boolean` |
| `localProvider?` | `string` |
| `stream` | `Duplex` |

#### Defined in

[packages/host/src/lib/serviceDiscovery/sd-adapter.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/serviceDiscovery/sd-adapter.ts#L26)

## Variables

### InstanceStore

• `Const` **InstanceStore**: `Object` = `{}`

Object storing Instance controllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](classes/CSIController.md)

#### Defined in

[packages/host/src/lib/instance-store.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/instance-store.ts#L6)

## Functions

### startHost

▸ **startHost**(`apiServerConfig`, `sthConfig`): `Promise`<[`Host`](classes/Host.md)\>

Starts Host module.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServerConfig` | `ServerConfig` | api server configuration |
| `sthConfig` | `STHConfiguration` | sth configuration |

#### Returns

`Promise`<[`Host`](classes/Host.md)\>

#### Defined in

[packages/host/src/lib/start-host.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/start-host.ts#L21)

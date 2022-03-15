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

### Type aliases

- [HostOptions](modules.md#hostoptions)
- [dataType](modules.md#datatype)
- [streamType](modules.md#streamtype)
- [topicDataType](modules.md#topicdatatype)

### Variables

- [InstanceStore](modules.md#instancestore)

### Functions

- [startHost](modules.md#starthost)

## Type aliases

### HostOptions

Ƭ **HostOptions**: `Partial`<{ `identifyExisting`: `boolean`  }\>

#### Defined in

[packages/host/src/lib/host.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L29)

___

### dataType

Ƭ **dataType**: `Object`

TODO: Refactor types below.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `topic` | `string` |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L10)

___

### streamType

Ƭ **streamType**: `Object`

Topic stream type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `stream` | `Stream` |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L18)

___

### topicDataType

Ƭ **topicDataType**: `Object`

Topic details type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | `string` |
| `cpmRequest?` | `boolean` |
| `localProvider?` | `string` |
| `stream` | `ReadableStream`<`any`\> \| `WritableStream`<`any`\> |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L26)

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

▸ **startHost**(`apiServerConfig`, `sthConfig`, `hostOptions`): `Promise`<[`Host`](classes/Host.md)\>

Starts Host module.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServerConfig` | `ServerConfig` | api server configuration |
| `sthConfig` | `STHConfiguration` | sth configuration |
| `hostOptions` | `Partial`<{ `identifyExisting`: `boolean`  }\> | host options |

#### Returns

`Promise`<[`Host`](classes/Host.md)\>

#### Defined in

[packages/host/src/lib/start-host.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/start-host.ts#L13)

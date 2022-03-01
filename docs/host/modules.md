[@scramjet/host](README.md) / Exports

# @scramjet/host

## Table of contents

### Classes

- [CPMConnector](undefined)
- [CSIController](undefined)
- [CommonLogsPipe](undefined)
- [Host](undefined)
- [ServiceDiscovery](undefined)
- [SocketServer](undefined)

### Type aliases

- [HostOptions](undefined)
- [dataType](undefined)
- [streamType](undefined)
- [topicDataType](undefined)

### Variables

- [InstanceStore](undefined)

### Functions

- [startHost](undefined)

## Classes

### CPMConnector

• **CPMConnector**: Class CPMConnector

Provides communication with Manager.

#### Defined in

[packages/host/src/lib/cpm-connector.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L41)

___

### CSIController

• **CSIController**: Class CSIController

Handles all Instance lifecycle, exposes instance's HTTP API.

#### Defined in

[packages/host/src/lib/csi-controller.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/csi-controller.ts#L53)

___

### CommonLogsPipe

• **CommonLogsPipe**: Class CommonLogsPipe

#### Defined in

[packages/host/src/lib/common-logs-pipe.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/common-logs-pipe.ts#L6)

___

### Host

• **Host**: Class Host

Host provides functionality to manage instances and sequences.
Using provided servers to set up API and server for communicating with instance controllers.
Can communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L39)

___

### ServiceDiscovery

• **ServiceDiscovery**: Class ServiceDiscovery

Service Discovery provides methods to manage topics.
Its functionality covers creating, storing, removing topics
and requesting Manager when instance requires data but data is not available locally.

#### Defined in

[packages/host/src/lib/sd-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L38)

___

### SocketServer

• **SocketServer**: Class SocketServer

Server for incoming connections from Runners

#### Defined in

[packages/host/src/lib/socket-server.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/socket-server.ts#L23)

## Type aliases

### HostOptions

Ƭ **HostOptions**: Partial<Object\>

#### Defined in

[packages/host/src/lib/host.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L30)

___

### dataType

Ƭ **dataType**: `Object`

TODO: Refactor types below.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | string |
| `topic` | string |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L10)

___

### streamType

Ƭ **streamType**: `Object`

Topic stream type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | string |
| `stream` | Stream |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L18)

___

### topicDataType

Ƭ **topicDataType**: `Object`

Topic details type definition.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `contentType` | string |
| `cpmRequest?` | boolean |
| `localProvider?` | string |
| `stream` | ReadableStream<any\> \| WritableStream<any\> |

#### Defined in

[packages/host/src/lib/sd-adapter.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/sd-adapter.ts#L26)

## Variables

### InstanceStore

• `Const` **InstanceStore**: Object = `{}`

Object storing Instance controllers.

#### Index signature

▪ [key: string]: CSIController

#### Defined in

[packages/host/src/lib/instance-store.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/instance-store.ts#L6)

## Functions

### startHost

▸ **startHost**(`apiServerConfig`, `sthConfig`, `hostOptions`): Promise<Host\>

Starts Host module.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServerConfig` | ServerConfig | api server configuration |
| `sthConfig` | STHConfiguration | sth configuration |
| `hostOptions` | Partial<Object\> | host options |

#### Returns

Promise<Host\>

#### Defined in

[packages/host/src/lib/start-host.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/start-host.ts#L13)

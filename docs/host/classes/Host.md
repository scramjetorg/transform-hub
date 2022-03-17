[@scramjet/host](../README.md) / [Exports](../modules.md) / Host

# Class: Host

Host provides functionality to manage instances and sequences.
Using provided servers to set up API and server for communicating with instance controllers.
Can communicate with Manager.

## Implements

- `IComponent`

## Table of contents

### Properties

- [api](Host.md#api)
- [apiBase](Host.md#apibase)
- [commonLogsPipe](Host.md#commonlogspipe)
- [config](Host.md#config)
- [cpmConnector](Host.md#cpmconnector)
- [instanceBase](Host.md#instancebase)
- [instancesStore](Host.md#instancesstore)
- [loadCheck](Host.md#loadcheck)
- [logger](Host.md#logger)
- [sequencesStore](Host.md#sequencesstore)
- [serviceDiscovery](Host.md#servicediscovery)
- [socketServer](Host.md#socketserver)

### Methods

- [attachHostAPIs](Host.md#attachhostapis)
- [cleanup](Host.md#cleanup)
- [connectToCPM](Host.md#connecttocpm)
- [getInstances](Host.md#getinstances)
- [getSequence](Host.md#getsequence)
- [getSequenceInstances](Host.md#getsequenceinstances)
- [getSequences](Host.md#getsequences)
- [handleDeleteSequence](Host.md#handledeletesequence)
- [handleNewSequence](Host.md#handlenewsequence)
- [handleStartSequence](Host.md#handlestartsequence)
- [identifyExistingSequences](Host.md#identifyexistingsequences)
- [instanceMiddleware](Host.md#instancemiddleware)
- [main](Host.md#main)
- [startCSIController](Host.md#startcsicontroller)
- [stop](Host.md#stop)

### Constructors

- [constructor](Host.md#constructor)

## Properties

### api

• **api**: `APIExpose`

The Host's API Server.

#### Defined in

[packages/host/src/lib/host.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L47)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L52)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L91)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L42)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L64)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L57)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L69)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L84)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L79)

___

### sequencesStore

• **sequencesStore**: `Map`<`string`, `SequenceInfo`\>

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L74)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L89)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L59)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): `void`

Setting up handlers for general Host API endpoints:
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting sequence details
- listing all instances running on the CSH
- listing all sequences saved on the CSH
- instance

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:234](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L234)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:690](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L690)

___

### connectToCPM

▸ **connectToCPM**(): `void`

Initializes connector and connects to Manager.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:214](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L214)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all sequences.

#### Returns

`GetInstancesResponse`

List of instances.

#### Defined in

[packages/host/src/lib/host.ts:606](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L606)

___

### getSequence

▸ **getSequence**(`id`): `OpResponse`<`GetSequenceResponse`\>

Returns sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance ID. |

#### Returns

`OpResponse`<`GetSequenceResponse`\>

Sequence info object.

#### Defined in

[packages/host/src/lib/host.ts:621](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L621)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`): `GetSequenceInstancesResponse`

Returns list of all instances of given sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence ID. |

#### Returns

`GetSequenceInstancesResponse`

List of instances.

#### Defined in

[packages/host/src/lib/host.ts:658](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L658)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all sequences.

#### Returns

`GetSequencesResponse`

List of sequences.

#### Defined in

[packages/host/src/lib/host.ts:643](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L643)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Handles delete sequence request.
Removes sequence from the store and sends notification to Manager if connected.
Note: If instance is started from a given sequence, sequence can not be removed
and CONFLICT status code is returned.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:336](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L336)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Handles incoming sequence.
Uses sequence adapter to unpack and identify sequence.
Notifies Manager (if connected) about new sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `IncomingMessage` | Stream of packaged sequence. |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Promise resolving to operation result.

#### Defined in

[packages/host/src/lib/host.ts:413](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L413)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Handles sequence start request.
Parses request body for sequence configuration and parameters to be passed to first Sequence method.
Passes obtained parameters to main method staring sequence.

Notifies Manager (if connected) about new instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:459](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L459)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing sequences.
Used to recover sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:386](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L386)

___

### instanceMiddleware

▸ **instanceMiddleware**(`req`, `res`, `next`): `void`

Finds instance with given id passed in request parameters and forwards request to instance router.
Forwarded request's url is reduced by the instance base path and instance parameter.
For example: /api/instance/:id/log -> /log

Ends response with 404 if instance is not found.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |
| `res` | `ServerResponse` | Response object. |
| `next` | `NextCallback` | Function to call when request is not handled by instance middleware. |

#### Returns

`void`

Instance middleware.

#### Defined in

[packages/host/src/lib/host.ts:300](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L300)

___

### main

▸ **main**(`identifyExisting?`): `Promise`<[`Host`](Host.md)\>

Main method to start Host.
Performs Hosts's initialization process: starts servers, identifies existing instances,
sets up API and connects to Manager.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identifyExisting` | `Partial`<{ `identifyExisting`: `boolean`  }\> | Indicates if existing instances should be identified. |

#### Returns

`Promise`<[`Host`](Host.md)\>

Promise resolving to instance of Host.

#### Defined in

[packages/host/src/lib/host.ts:168](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L168)

___

### startCSIController

▸ **startCSIController**(`sequence`, `appConfig`, `sequenceArgs?`): `Promise`<[`CSIController`](CSIController.md)\>

Creates new CSIController [CSIController](CSIController.md) object and handles its events.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequence` | `SequenceInfo` | Sequence info object. |
| `appConfig` | `AppConfig` | App configuration object. |
| `sequenceArgs?` | `any`[] | - |

#### Returns

`Promise`<[`CSIController`](CSIController.md)\>

#### Defined in

[packages/host/src/lib/host.ts:503](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L503)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running instances by sending KILL command to every instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:673](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L673)

## Constructors

### constructor

• **new Host**(`apiServer`, `socketServer`, `sthConfig`)

Initializes Host.
Sets used modules with provided configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServer` | `APIExpose` | Server to attach API to. |
| `socketServer` | [`SocketServer`](SocketServer.md) | Server to listen for connections from instances. |
| `sthConfig` | `STHConfiguration` | Configuration. |

#### Defined in

[packages/host/src/lib/host.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L112)

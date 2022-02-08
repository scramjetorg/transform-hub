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

[packages/host/src/lib/host.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L45)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L50)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L89)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L40)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L62)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L55)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L67)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:82](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L82)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L77)

___

### sequencesStore

• **sequencesStore**: `Map`<`string`, `SequenceInfo`\>

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L72)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L87)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L57)

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

[packages/host/src/lib/host.ts:230](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L230)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:679](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L679)

___

### connectToCPM

▸ **connectToCPM**(): `void`

Initializes connector and connects to Manager.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L209)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all sequences.

#### Returns

`GetInstancesResponse`

List of instances.

#### Defined in

[packages/host/src/lib/host.ts:598](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L598)

___

### getSequence

▸ **getSequence**(`id`): `GetSequenceResponse`

Returns sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance ID. |

#### Returns

`GetSequenceResponse`

Sequence info object.

#### Defined in

[packages/host/src/lib/host.ts:613](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L613)

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

[packages/host/src/lib/host.ts:647](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L647)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all sequences.

#### Returns

`GetSequencesResponse`

List of sequences.

#### Defined in

[packages/host/src/lib/host.ts:632](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L632)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`DeleteSequenceResponse`\>

Handles delete sequence request.
Removes sequence from the store and sends notification to Manager if connected.
Note: If instance is started from a given sequence, sequence can not be removed
and CONFLICT status code is returned.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`DeleteSequenceResponse`\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:329](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L329)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`): `Promise`<`SendSequenceResponse`\>

Handles incoming sequence.
Uses sequence adapter to unpack and identify sequence.
Notifies Manager (if connected) about new sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `IncomingMessage` | Stream of packaged sequence. |

#### Returns

`Promise`<`SendSequenceResponse`\>

Promise resolving to operation result.

#### Defined in

[packages/host/src/lib/host.ts:403](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L403)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`StartSequenceResponse`\>

Handles sequence start request.
Parses request body for sequence configuration and parameters to be passed to first Sequence method.
Passes obtained parameters to main method staring sequence.

Notifies Manager (if connected) about new instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`StartSequenceResponse`\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:448](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L448)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing sequences.
Used to recover sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:376](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L376)

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

[packages/host/src/lib/host.ts:293](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L293)

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

[packages/host/src/lib/host.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L163)

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

[packages/host/src/lib/host.ts:491](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L491)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running instances by sending KILL command to every instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:662](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L662)

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

[packages/host/src/lib/host.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L110)

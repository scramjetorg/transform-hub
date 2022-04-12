[@scramjet/host](../README.md) / [Exports](../modules.md) / Host

# Class: Host

Host provides functionality to manage Instances and Sequences.
Using provided servers to set up API and server for communicating with Instance controllers.
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
- [publicConfig](Host.md#publicconfig)
- [sequencesStore](Host.md#sequencesstore)
- [serviceDiscovery](Host.md#servicediscovery)
- [socketServer](Host.md#socketserver)
- [topicsBase](Host.md#topicsbase)

### Accessors

- [apiVersion](Host.md#apiversion)
- [build](Host.md#build)
- [service](Host.md#service)
- [version](Host.md#version)

### Methods

- [attachHostAPIs](Host.md#attachhostapis)
- [cleanup](Host.md#cleanup)
- [connectToCPM](Host.md#connecttocpm)
- [getInstances](Host.md#getinstances)
- [getSequence](Host.md#getsequence)
- [getSequenceInstances](Host.md#getsequenceinstances)
- [getSequences](Host.md#getsequences)
- [getTopics](Host.md#gettopics)
- [handleDeleteSequence](Host.md#handledeletesequence)
- [handleNewSequence](Host.md#handlenewsequence)
- [handleStartSequence](Host.md#handlestartsequence)
- [identifyExistingSequences](Host.md#identifyexistingsequences)
- [instanceMiddleware](Host.md#instancemiddleware)
- [main](Host.md#main)
- [startCSIController](Host.md#startcsicontroller)
- [stop](Host.md#stop)
- [topicsMiddleware](Host.md#topicsmiddleware)

### Constructors

- [constructor](Host.md#constructor)

## Properties

### api

• **api**: `APIExpose`

The Host's API Server.

#### Defined in

[packages/host/src/lib/host.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L52)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L57)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L98)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L47)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L71)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L62)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L76)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L91)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L86)

___

### publicConfig

• **publicConfig**: `PublicSTHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L99)

___

### sequencesStore

• **sequencesStore**: `Map`<`string`, `SequenceInfo`\>

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L81)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L96)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L66)

___

### topicsBase

• **topicsBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L64)

## Accessors

### apiVersion

• `get` **apiVersion**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L116)

___

### build

• `get` **build**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:126](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L126)

___

### service

• `get` **service**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L112)

___

### version

• `get` **version**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L122)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): `void`

Setting up handlers for general Host API endpoints:
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting Sequence details
- listing all Instances running on the CSH
- listing all Sequences saved on the CSH
- Instance

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:269](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L269)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:752](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L752)

___

### connectToCPM

▸ **connectToCPM**(): `void`

Initializes connector and connects to Manager.

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:248](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L248)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all Sequences.

#### Returns

`GetInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:659](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L659)

___

### getSequence

▸ **getSequence**(`id`): `OpResponse`<`GetSequenceResponse`\>

Returns Sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance ID. |

#### Returns

`OpResponse`<`GetSequenceResponse`\>

Sequence info object.

#### Defined in

[packages/host/src/lib/host.ts:674](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L674)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`): `GetSequenceInstancesResponse`

Returns list of all Instances of given Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence ID. |

#### Returns

`GetSequenceInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:711](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L711)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all Sequences.

#### Returns

`GetSequencesResponse`

List of Sequences.

#### Defined in

[packages/host/src/lib/host.ts:696](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L696)

___

### getTopics

▸ **getTopics**(): { `contentType`: `string` = topic.contentType; `name`: `string` = topic.topic }[]

#### Returns

{ `contentType`: `string` = topic.contentType; `name`: `string` = topic.topic }[]

#### Defined in

[packages/host/src/lib/host.ts:722](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L722)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Handles delete Sequence request.
Removes Sequence from the store and sends notification to Manager if connected.
Note: If Instance is started from a given Sequence, Sequence can not be removed
and CONFLICT status code is returned.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:351](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L351)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Handles incoming Sequence.
Uses Sequence adapter to unpack and identify Sequence.
Notifies Manager (if connected) about new Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `IncomingMessage` | Stream of packaged Sequence. |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Promise resolving to operation result.

#### Defined in

[packages/host/src/lib/host.ts:428](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L428)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Handles Sequence start request.
Parses request body for Sequence configuration and parameters to be passed to first Sequence method.
Passes obtained parameters to main method staring Sequence.

Notifies Manager (if connected) about new Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:474](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L474)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing Sequences.
Used to recover Sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:401](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L401)

___

### instanceMiddleware

▸ **instanceMiddleware**(`req`, `res`, `next`): `void`

Finds Instance with given id passed in request parameters and forwards request to Instance router.
Forwarded request's url is reduced by the Instance base path and Instance parameter.
For example: /api/instance/:id/log -> /log

Ends response with 404 if Instance is not found.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |
| `res` | `ServerResponse` | Response object. |
| `next` | `NextCallback` | Function to call when request is not handled by Instance middleware. |

#### Returns

`void`

Instance middleware.

#### Defined in

[packages/host/src/lib/host.ts:311](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L311)

___

### main

▸ **main**(`identifyExisting?`): `Promise`<[`Host`](Host.md)\>

Main method to start Host.
Performs Hosts's initialization process: starts servers, identifies existing Instances,
sets up API and connects to Manager.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `identifyExisting` | `Partial`<{ `identifyExisting`: `boolean`  }\> | Indicates if existing Instances should be identified. |

#### Returns

`Promise`<[`Host`](Host.md)\>

Promise resolving to Instance of Host.

#### Defined in

[packages/host/src/lib/host.ts:202](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L202)

___

### startCSIController

▸ **startCSIController**(`sequence`, `payload`): `Promise`<[`CSIController`](CSIController.md)\>

Creates new CSIController [CSIController](CSIController.md) object and handles its events.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequence` | `SequenceInfo` | Sequence info object. |
| `payload` | `StartSequencePayload` | - |

#### Returns

`Promise`<[`CSIController`](CSIController.md)\>

#### Defined in

[packages/host/src/lib/host.ts:525](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L525)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running Instances by sending KILL command to every Instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:735](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L735)

___

### topicsMiddleware

▸ **topicsMiddleware**(`req`, `res`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |
| `res` | `ServerResponse` |
| `next` | `NextCallback` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:336](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L336)

## Constructors

### constructor

• **new Host**(`apiServer`, `socketServer`, `sthConfig`)

Initializes Host.
Sets used modules with provided configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServer` | `APIExpose` | Server to attach API to. |
| `socketServer` | [`SocketServer`](SocketServer.md) | Server to listen for connections from Instances. |
| `sthConfig` | `STHConfiguration` | Configuration. |

#### Defined in

[packages/host/src/lib/host.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L138)
